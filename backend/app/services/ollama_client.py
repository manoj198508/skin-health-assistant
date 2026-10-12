import base64
import json
import re
from typing import Any

from app.config import settings
from app.services.prompts import LANGUAGE_NAMES, PHOTO_ANALYSIS_INSTRUCTIONS, SAFETY_SYSTEM_PROMPT, language_instruction

_client: Any = None
_openai_client: Any = None
_gemini_client: Any = None


def _provider() -> str:
    return settings.normalized_ai_provider


# Each SDK below is imported lazily, inside its getter, rather than at module load
# time. `ollama` and `google-genai` pin incompatible versions of `httpx`, and since
# only one provider is ever active in a given deployment (local dev uses ollama only;
# a cloud deployment uses openai or gemini only, never ollama), there's no reason to
# require all three packages to be installed together - see requirements.txt vs.
# requirements-cloud.txt.


def get_client():
    global _client
    if _client is None:
        from ollama import Client

        _client = Client(host=settings.ollama_base_url)
    return _client


def get_openai_client():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI

        if not settings.openai_api_key.strip():
            raise RuntimeError("OPENAI_API_KEY is required when AI_PROVIDER=openai")
        kwargs: dict[str, Any] = {"api_key": settings.openai_api_key}
        if settings.openai_base_url.strip():
            kwargs["base_url"] = settings.openai_base_url
        _openai_client = OpenAI(**kwargs)
    return _openai_client


def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai

        if not settings.gemini_api_key.strip():
            raise RuntimeError("GEMINI_API_KEY is required when AI_PROVIDER=gemini")
        _gemini_client = genai.Client(api_key=settings.gemini_api_key)
    return _gemini_client


def _to_openai_messages(history: list[dict]) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    for message in history:
        role = str(message.get("role", "user"))
        content = str(message.get("content", ""))
        images = message.get("images")
        if isinstance(images, list) and images:
            parts: list[dict[str, Any]] = [{"type": "text", "text": content}]
            for b64 in images:
                parts.append(
                    {
                        "type": "image_url",
                        "image_url": {
                            # Use a broadly supported mime hint. The model only needs valid image bytes.
                            "url": f"data:image/jpeg;base64,{b64}"
                        },
                    }
                )
            messages.append({"role": role, "content": parts})
            continue
        messages.append({"role": role, "content": content})
    return messages


def _to_gemini_contents(history: list[dict]) -> list:
    from google.genai import types

    contents = []
    for message in history:
        # Gemini calls the assistant's role "model", not "assistant".
        role = "model" if message.get("role") == "assistant" else "user"
        parts = [types.Part.from_text(text=str(message.get("content", "")))]
        images = message.get("images")
        if isinstance(images, list):
            for b64 in images:
                parts.append(types.Part.from_bytes(data=base64.b64decode(b64), mime_type="image/jpeg"))
        contents.append(types.Content(role=role, parts=parts))
    return contents


def send_chat_message(history: list[dict], model: str, language: str = "en") -> str:
    """history entries: {"role": "user"|"assistant", "content": str, "images": list[str] (optional,
    base64-encoded, no data: prefix)} in chronological order. `model` must be a text-only model
    for chat-mode conversations, or the vision model for photo-mode conversations (since their
    history includes the originally uploaded image)."""
    system = SAFETY_SYSTEM_PROMPT + language_instruction(language)
    provider = _provider()

    if provider == "openai":
        try:
            response = get_openai_client().chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system}, *_to_openai_messages(history)],
                max_tokens=2048,
                temperature=0.2,
                timeout=settings.ai_timeout_seconds,
            )
            content = response.choices[0].message.content or ""
        except Exception as exc:
            raise RuntimeError(
                f"Cloud AI request failed (OpenAI). Check OPENAI_API_KEY, OPENAI_BASE_URL, model names ({exc})"
            ) from exc
        if not content.strip():
            raise RuntimeError("Cloud AI returned an empty chat response")
        return content

    if provider == "gemini":
        from google.genai import types

        try:
            response = get_gemini_client().models.generate_content(
                model=model,
                contents=_to_gemini_contents(history),
                config=types.GenerateContentConfig(
                    system_instruction=system, max_output_tokens=2048, temperature=0.2
                ),
            )
            content = response.text or ""
        except Exception as exc:
            raise RuntimeError(
                f"Cloud AI request failed (Gemini). Check GEMINI_API_KEY and model name ({exc})"
            ) from exc
        if not content.strip():
            raise RuntimeError("Cloud AI returned an empty chat response")
        return content

    messages = [{"role": "system", "content": system}, *history]
    try:
        # Non-English scripts (e.g. Devanagari) typically need more tokens to express the
        # same content. num_ctx defaults to 2048 regardless of the model's real context
        # length unless set explicitly, which silently truncates longer/non-English replies.
        response = get_client().chat(
            model=model, messages=messages, options={"num_predict": 2048, "num_ctx": 8192}
        )
    except Exception as exc:
        raise RuntimeError(
            f"Could not reach local Ollama model '{model}' at "
            f"{settings.ollama_base_url}. Is `ollama serve` running and is the model pulled? ({exc})"
        ) from exc
    return response["message"]["content"]


def _parse_json_response(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    if not cleaned.startswith("{"):
        start = cleaned.find("{")
        if start != -1:
            cleaned = cleaned[start:]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"AI did not return valid JSON: {text[:500]}") from exc


_LIST_FIELDS = [
    "visible_observations",
    "possible_conditions",
    "self_care",
    "precautions",
    "when_to_see_doctor",
]
_TEXT_FIELDS = ["explanation", "general_information", "confidence_and_limitations"]


def _normalize_assessment(data: dict) -> dict:
    """Local vision models don't always follow the JSON schema exactly (e.g. a string
    instead of a list, or free-text instead of one of the three urgency values). Coerce
    the response into a shape that always passes PhotoAssessment validation, rather than
    failing the whole request over a minor formatting slip."""
    result = dict(data)

    for field in _LIST_FIELDS:
        value = result.get(field)
        if value is None:
            result[field] = []
        elif isinstance(value, str):
            result[field] = [value]
        elif not isinstance(value, list):
            result[field] = [str(value)]
        else:
            result[field] = [str(item) for item in value]

    for field in _TEXT_FIELDS:
        value = result.get(field)
        result[field] = "" if value is None else str(value)

    urgency = str(result.get("care_urgency", "")).strip().lower()
    if "urgent" in urgency or "emergency" in urgency or "immediate" in urgency:
        result["care_urgency"] = "urgent"
    elif "soon" in urgency or "prompt" in urgency:
        result["care_urgency"] = "soon"
    else:
        result["care_urgency"] = "routine"

    return result


def _parse_numbered_lines(text: str, expected_count: int) -> list[str] | None:
    found: dict[int, str] = {}
    for raw_line in text.strip().split("\n"):
        match = re.match(r"\s*(\d+)[.)]\s*(.*)", raw_line)
        if match:
            found[int(match.group(1))] = match.group(2).strip()
    if len(found) != expected_count or set(found) != set(range(1, expected_count + 1)):
        return None
    return [found[i] for i in range(1, expected_count + 1)]


def _translate_assessment(assessment: dict, language: str) -> dict:
    """Translates an already-generated (English) assessment's text values using the text
    model, rather than asking the vision model to generate non-English JSON directly.

    Two more direct approaches were tried and rejected before this one: (1) asking the
    vision model (qwen2.5vl:7b) to generate the full 8-field JSON directly in Hindi - at
    low/deterministic temperature it emitted an end-of-response token partway through
    every time (identical cutoff point, every run); raising temperature to avoid that
    instead caused a repetition loop. (2) asking the text model to translate the whole
    English JSON blob in one shot, preserving structure - it instead flattened every
    field's strings into one array, duplicated them, and truncated. Both are genuine
    small-model capability limits for a complex structured task, not prompt wording.
    Flattening every translatable string into one plain numbered list - no JSON, no
    nested structure to track - turned out to be reliable: translating a single list of
    short, independent lines is a much easier task than preserving a schema while
    translating, and the text model has solid native support for these languages for
    plain text generation.
    """
    field_order: list[tuple[str, int | None]] = []
    lines: list[str] = []
    for field in _LIST_FIELDS:
        for i, item in enumerate(assessment[field]):
            field_order.append((field, i))
            lines.append(item)
    for field in _TEXT_FIELDS:
        field_order.append((field, None))
        lines.append(assessment[field])

    numbered = "\n".join(f"{i + 1}. {line}" for i, line in enumerate(lines))
    system = (
        f"Translate each numbered line below into {LANGUAGE_NAMES[language]}. Respond with ONLY "
        f"the translated lines, each on its own line, in the exact same numbered format (e.g. "
        f'"3. <translated text>"), same count of lines, same order. Do not add, merge, or skip '
        f"any line, and do not add any other text."
    )
    provider = _provider()
    translated_lines = None
    for attempt in range(2):
        try:
            if provider == "openai":
                response = get_openai_client().chat.completions.create(
                    model=settings.active_text_model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": numbered},
                    ],
                    max_tokens=2048,
                    temperature=0.2 * attempt,
                    timeout=settings.ai_timeout_seconds,
                )
                translated_content = response.choices[0].message.content or ""
            elif provider == "gemini":
                from google.genai import types

                response = get_gemini_client().models.generate_content(
                    model=settings.active_text_model,
                    contents=[types.Content(role="user", parts=[types.Part.from_text(text=numbered)])],
                    config=types.GenerateContentConfig(
                        system_instruction=system,
                        max_output_tokens=2048,
                        temperature=0.2 * attempt,
                    ),
                )
                translated_content = response.text or ""
            else:
                response = get_client().chat(
                    model=settings.active_text_model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": numbered},
                    ],
                    # A slightly higher temperature on the retry gives the model a real chance
                    # to produce a different (hopefully well-formed) response instead of
                    # repeating the same malformed one deterministically.
                    options={"num_predict": 2048, "num_ctx": 8192, "temperature": 0.2 * attempt},
                )
                translated_content = response["message"]["content"]

            translated_lines = _parse_numbered_lines(translated_content, len(lines))
        except Exception:
            translated_lines = None
        if translated_lines is not None:
            break

    if translated_lines is None:
        # Translation is a best-effort enhancement - if it still fails after a retry, fall
        # back to the original English assessment rather than failing the whole analysis.
        return assessment

    result = {field: (list(assessment[field]) if isinstance(assessment[field], list) else assessment[field]) for field in assessment}
    for (field, idx), translated in zip(field_order, translated_lines):
        if idx is None:
            result[field] = translated
        else:
            result[field][idx] = translated
    return result


def analyze_photo(image_base64: str, language: str = "en") -> dict:
    system = SAFETY_SYSTEM_PROMPT + "\n\n" + PHOTO_ANALYSIS_INSTRUCTIONS
    provider = _provider()

    if provider == "openai":
        try:
            response = get_openai_client().chat.completions.create(
                model=settings.active_vision_model,
                messages=[
                    {"role": "system", "content": system},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Please analyze this photo of a skin concern."},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                            },
                        ],
                    },
                ],
                response_format={"type": "json_object"},
                max_tokens=3000,
                temperature=0.1,
                timeout=settings.ai_timeout_seconds,
            )
            content = response.choices[0].message.content or "{}"
        except Exception as exc:
            raise RuntimeError(
                f"Cloud vision request failed (OpenAI). Check OPENAI_API_KEY, OPENAI_BASE_URL, model names ({exc})"
            ) from exc
        assessment = _normalize_assessment(_parse_json_response(content))
        if language in LANGUAGE_NAMES and language != "en":
            assessment = _translate_assessment(assessment, language)
        return assessment

    if provider == "gemini":
        from google.genai import types

        try:
            response = get_gemini_client().models.generate_content(
                model=settings.active_vision_model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_text(text="Please analyze this photo of a skin concern."),
                            types.Part.from_bytes(data=base64.b64decode(image_base64), mime_type="image/jpeg"),
                        ],
                    )
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    max_output_tokens=3000,
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )
            content = response.text or "{}"
        except Exception as exc:
            raise RuntimeError(
                f"Cloud vision request failed (Gemini). Check GEMINI_API_KEY and model name ({exc})"
            ) from exc
        assessment = _normalize_assessment(_parse_json_response(content))
        if language in LANGUAGE_NAMES and language != "en":
            assessment = _translate_assessment(assessment, language)
        return assessment

    try:
        # Ollama defaults num_ctx to 2048 regardless of the model's real context length,
        # unless told otherwise - the image itself plus this system prompt already eats
        # into that, silently truncating the response.
        response = get_client().chat(
            model=settings.active_vision_model,
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": "Please analyze this photo of a skin concern.",
                    "images": [image_base64],
                },
            ],
            options={"num_predict": 3000, "num_ctx": 8192},
        )
    except Exception as exc:
        raise RuntimeError(
            f"Could not reach local Ollama model '{settings.active_vision_model}' at "
            f"{settings.ollama_base_url}. Is `ollama serve` running and is the model pulled? ({exc})"
        ) from exc
    assessment = _normalize_assessment(_parse_json_response(response["message"]["content"]))
    if language in LANGUAGE_NAMES and language != "en":
        assessment = _translate_assessment(assessment, language)
    return assessment
