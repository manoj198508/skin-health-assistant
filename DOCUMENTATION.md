# Skin Health Assistant — How It Works

This document explains this project from the ground up: what it does, how its pieces
talk to each other, and how the actual code carries out each step. It assumes you know
basic programming (variables, functions, if/else) but nothing about web frameworks,
databases, or AI models — those are explained as they come up.

If a word feels unfamiliar, check the **[Glossary](#glossary)** at the end — every
term used is defined there.

---

## Table of Contents

1. [What This Project Actually Does](#1-what-this-project-actually-does)
2. [The Big Picture: Client and Server](#2-the-big-picture-client-and-server)
3. [The Technology Stack, Explained](#3-the-technology-stack-explained)
4. [Project Folder Structure](#4-project-folder-structure)
5. [The Database: What Gets Stored and Why](#5-the-database-what-gets-stored-and-why)
6. [Walkthrough: Chat Mode, Step by Step](#6-walkthrough-chat-mode-step-by-step)
7. [Walkthrough: Photo Mode, Step by Step](#7-walkthrough-photo-mode-step-by-step)
8. [How the AI Is "Told What to Do": Prompts](#8-how-the-ai-is-told-what-to-do-prompts)
9. [Multiple Languages: A Two-Step Trick](#9-multiple-languages-a-two-step-trick)
10. [The Sidebar, History, and a Bug We Found](#10-the-sidebar-history-and-a-bug-we-found)
11. [Light/Dark Theme, Without a Flash of the Wrong One](#11-lightdark-theme-without-a-flash-of-the-wrong-one)
12. [Keeping It Safe and Private](#12-keeping-it-safe-and-private)
13. [Running the Project Yourself](#13-running-the-project-yourself)
14. [Known Limitations](#14-known-limitations)
15. [Ideas If You Want to Extend This](#15-ideas-if-you-want-to-extend-this)
16. [Glossary](#glossary)

---

## 1. What This Project Actually Does

This is an **educational** website with two modes:

- **Chat mode** — type a skincare question ("Why do I have dry skin?") and get a
  clear, structured answer: overview, possible causes, recommendations, precautions,
  and when to see a doctor.
- **Photo mode** — upload a photo of a visible skin concern and get an "instant
  report": what's visible in the image, possible conditions (always phrased as
  *possibilities*, never a diagnosis), a risk-level badge, recommendations,
  precautions, and when to see a dermatologist.

It is **not** a real diagnostic tool. Every response is deliberately hedged
("possibly consistent with...") and every photo report ends with a note that it
cannot replace an in-person exam. That safety framing isn't just wording — it's
built into the instructions given to the AI model itself (see
[Section 8](#8-how-the-ai-is-told-what-to-do-prompts)).

The AI runs **entirely on the developer's own computer** via a tool called
[Ollama](#glossary) — no data is sent to any company's cloud AI service. That's a
deliberate design choice: it keeps a health-adjacent app private and free to run.

---

## 2. The Big Picture: Client and Server

Almost every website you use is really **two programs talking to each other**:

- The **frontend** (or "client") is the program that runs *in your browser*. It draws
  the buttons, text boxes, and chat bubbles you see, and reacts when you click
  something.
- The **backend** (or "server") is a *separate* program that runs somewhere else
  (here, on the same computer, but it could be anywhere). It doesn't know or care
  what buttons look like — its job is to store data and do the "thinking."

They talk to each other over the network using **HTTP requests** — the same
technology your browser uses to load any web page, just carrying data (usually as
[JSON](#glossary)) instead of a full page.

```
 Your Browser (Frontend)                    This Computer (Backend)
┌─────────────────────────┐                ┌──────────────────────────┐
│  React app               │   HTTP         │  FastAPI app              │
│  (buttons, chat bubbles,  │ ─────────────► │  (validates requests,     │
│   the actual UI)          │ ◄───────────── │   talks to the database   │
│                            │    JSON        │   and to the AI model)    │
└─────────────────────────┘                └───────────┬──────────────┘
                                                          │
                                             ┌────────────┴────────────┐
                                             │                         │
                                     ┌───────▼──────┐         ┌────────▼───────┐
                                     │   SQLite DB   │         │  Ollama (AI)   │
                                     │ (conversation  │         │  runs the LLM  │
                                     │  history)      │         │  models        │
                                     └───────────────┘         └────────────────┘
```

In this project:
- The frontend lives in [frontend/](frontend/) and is built with **React**.
- The backend lives in [backend/](backend/) and is built with **FastAPI** (Python).
- The AI models run through **Ollama**, a program that hosts open-source language
  models locally and exposes them over a simple local API (`http://localhost:11434`).
- Conversation history is stored in a small file-based database called **SQLite**.

---

## 3. The Technology Stack, Explained

| Piece | What it is | Why it's used here |
|---|---|---|
| **React** | A JavaScript library for building UIs out of reusable "components" (buttons, cards, pages) that automatically re-render when data changes. | Makes the chat UI update live as messages arrive, without manually rewriting HTML. |
| **TypeScript** | JavaScript with optional type-checking bolted on (you can say "this variable must always be a string"). | Catches whole categories of bugs (e.g. passing the wrong shape of data) before the code even runs. |
| **Vite** | A build tool that turns the React/TypeScript source code into the plain HTML/CSS/JS a browser can run, and provides a fast live-reloading dev server. | Standard modern React tooling — fast rebuilds while developing. |
| **Tailwind CSS** | A CSS framework where you style elements with utility class names (`text-sm`, `rounded-lg`) instead of writing separate `.css` files. | Lets the whole UI (including dark mode) be styled consistently without a maze of stylesheet files. |
| **FastAPI** | A Python web framework for building APIs. You write a normal Python function, add a decorator like `@router.post(...)`, and it becomes a working HTTP endpoint. | Fast to write, and it auto-validates incoming data using **Pydantic** (see below). |
| **Pydantic** | A Python library that turns a class definition into a data validator. If a request is missing a field or has the wrong type, Pydantic rejects it automatically. | Every request/response in [schemas.py](backend/app/schemas.py) is a Pydantic model — this is what stops malformed data from ever reaching your logic. |
| **SQLAlchemy** | An "ORM" (Object-Relational Mapper) — lets you work with database rows as if they were normal Python objects, instead of writing raw SQL everywhere. | Used in [models.py](backend/app/models.py) to define the `Conversation`, `Message`, and `UploadedImage` tables as Python classes. |
| **SQLite** | A database that lives in a single file on disk (`skin_health.db`) rather than needing a separate database server. | Simple enough for a student project — zero setup, but still a real relational database. |
| **Ollama** | A program that downloads and runs open-source AI models locally, and exposes them via a simple HTTP API. | Lets this project use real AI models without needing an internet connection or paying for an API. |
| **llama3.2 / qwen2.5vl** | The two specific AI models used. `llama3.2` is text-only (used for chat). `qwen2.5vl` is a *vision-language* model — it can look at an image and describe it in text (used for photo analysis). | Chosen after directly testing several locally available models for how reliably they followed instructions (see [Section 8](#8-how-the-ai-is-told-what-to-do-prompts)). |

---

## 4. Project Folder Structure

```
skin_decese/
├── start.sh                    # Run everything locally (for development)
├── start-public.sh             # Run everything for LAN/public access
├── backend/
│   ├── app/
│   │   ├── main.py              # The FastAPI app itself — wires everything together
│   │   ├── config.py             # Reads settings from environment variables (.env)
│   │   ├── db.py                 # Sets up the database connection
│   │   ├── models.py             # The database tables, as Python classes
│   │   ├── schemas.py            # The shape of API requests/responses
│   │   ├── routers/              # One file per group of related endpoints
│   │   │   ├── conversations.py  #   create/list/get/delete a conversation
│   │   │   ├── messages.py       #   send a chat message, get a reply
│   │   │   └── photo.py          #   upload + analyze a photo
│   │   ├── services/              # The actual "business logic"
│   │   │   ├── ollama_client.py  #   talks to the AI models
│   │   │   ├── prompts.py        #   the instructions given to the AI
│   │   │   ├── history.py        #   rebuilds conversation context for the AI
│   │   │   └── image_store.py    #   saves/validates/deletes uploaded images
│   │   └── tasks/
│   │       └── cleanup.py        # Deletes old images automatically
│   └── requirements.txt          # Python packages this project needs
└── frontend/
    ├── src/
    │   ├── main.tsx               # The very first file that runs in the browser
    │   ├── App.tsx                # Defines the app's routes (pages)
    │   ├── pages/                 # One file per full page
    │   │   ├── Home.tsx
    │   │   ├── Chat.tsx
    │   │   └── PhotoAnalysis.tsx
    │   ├── components/            # Reusable pieces of UI
    │   ├── context/                # Shared state (theme, language, etc.)
    │   ├── api/                    # Functions that call the backend
    │   ├── i18n/                   # Translated text for every language
    │   └── utils/                  # Small helper functions
    └── package.json                # JavaScript packages this project needs
```

A rule of thumb used throughout this codebase: **routers** handle "is this a valid
request?" and **services** handle "what do we actually do about it?". Keeping HTTP
concerns (status codes, request parsing) separate from logic (talking to the AI,
building prompts) makes each file easier to read on its own.

---

## 5. The Database: What Gets Stored and Why

A **database** is just an organized way to save data so it survives after the
program stops running (unlike a normal Python variable, which disappears the moment
the program exits). This project uses three tables, defined in
[models.py](backend/app/models.py):

**`conversations`** — one row per chat or photo session.
| column | meaning |
|---|---|
| `id` | a random unique ID (a "UUID"), used in URLs like `/chat/<id>` |
| `mode` | `"chat"` or `"photo"` |
| `created_at` / `updated_at` | timestamps |

**`messages`** — every message in every conversation, in order.
| column | meaning |
|---|---|
| `conversation_id` | which conversation this belongs to |
| `role` | `"user"` or `"assistant"` |
| `content` | the text (for a photo report, this is a JSON string — see below) |
| `message_type` | `"text"`, `"image"`, or `"assessment"` (explained in [Section 7](#7-walkthrough-photo-mode-step-by-step)) |

**`uploaded_images`** — tracks each uploaded photo separately from the messages
table, specifically so it can be **automatically deleted** later (see
[Section 12](#12-keeping-it-safe-and-private)).
| column | meaning |
|---|---|
| `storage_path` | where the file actually lives on disk |
| `expires_at` | when it's allowed to be deleted |
| `deleted_at` | set once it has been deleted (`null` until then) |

Why three tables instead of one? Because a conversation can have *many* messages,
and a photo conversation has *one* image but the image itself needs its own
lifecycle (an expiry date) that a chat message doesn't need. This is a normal
database design pattern: **one table per "thing," linked together by ID.**

---

## 6. Walkthrough: Chat Mode, Step by Step

Let's trace exactly what happens when you type **"Why do I have dry skin?"** and
hit Send.

### Step 1 — The frontend creates a conversation (only when needed)

[Chat.tsx](frontend/src/pages/Chat.tsx) doesn't create a conversation the moment
you open the page — only when you actually send your first message. This avoids
littering the database with empty conversations from people who just look and leave.

```ts
// Chat.tsx, inside handleSend()
if (!convId) {
  const conv = await createConversation("chat");   // POST /api/conversations
  convId = conv.id;
  navigate(`/chat/${convId}`, { replace: true });   // update the URL
}
```

`createConversation` (in [client.ts](frontend/src/api/client.ts)) sends a `POST`
request to the backend. On the backend side,
[conversations.py](backend/app/routers/conversations.py) handles it:

```python
@router.post("", response_model=ConversationOut, status_code=201)
def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db)):
    conversation = Conversation(mode=payload.mode)
    db.add(conversation)
    db.commit()
    return conversation
```

This inserts one new row into the `conversations` table and sends its `id` back.

### Step 2 — The message is sent

The frontend immediately shows your message on screen ("optimistic UI" — it doesn't
wait for the server to confirm before displaying it), then calls:

```ts
const { assistant_message } = await postMessage(convId, content, language);
```

This is a `POST` to `/api/conversations/<id>/messages`, handled in
[messages.py](backend/app/routers/messages.py):

```python
@router.post("/{conversation_id}/messages", response_model=MessageCreateResponse, status_code=201)
def post_message(conversation_id: str, payload: MessageCreate, db: Session = Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    ...
    user_message = Message(conversation_id=conversation_id, role="user", content=payload.content)
    db.add(user_message)
    db.commit()

    history = build_message_history(conversation)
    model = settings.ollama_vision_model if conversation.mode == "photo" else settings.ollama_text_model
    reply_text = send_chat_message(history, model, payload.language)

    assistant_message = Message(conversation_id=conversation_id, role="assistant", content=reply_text)
    db.add(assistant_message)
    db.commit()
    return MessageCreateResponse(user_message=user_message, assistant_message=assistant_message)
```

Two database writes happen here: your message is saved *first*, then the AI is
asked for a reply, then the reply is saved too. That way, even if the AI request
fails, your original message isn't lost.

### Step 3 — Building "history" for the AI

`build_message_history()` (in [history.py](backend/app/services/history.py)) turns
the saved messages into the format Ollama expects — a list of
`{role, content}` objects. This matters more for photo mode (re-attaching the image
on follow-up questions), covered in [Section 7](#7-walkthrough-photo-mode-step-by-step).

### Step 4 — Talking to the AI model

`send_chat_message()` (in [ollama_client.py](backend/app/services/ollama_client.py))
sends the conversation history to Ollama's `/api/chat` endpoint, along with a
**system prompt** — a set of instructions the model must follow for *every* message,
invisible to the user. That's covered fully in [Section 8](#8-how-the-ai-is-told-what-to-do-prompts).

```python
response = get_client().chat(
    model=model,
    messages=[{"role": "system", "content": system}, *history],
    options={"num_predict": 2048, "num_ctx": 8192},
)
return response["message"]["content"]
```

`num_ctx` and `num_predict` are worth understanding: an AI model doesn't "read" text
the way you do — it breaks it into chunks called [tokens](#glossary), and it can
only "see" a limited number of tokens at once (`num_ctx`) and generate a limited
number in reply (`num_predict`). Ollama defaults these quite low; this project
raises them explicitly, because the default silently *cut off* longer or non-English
replies partway through (a real bug we found and fixed — see
[Section 9](#9-multiple-languages-a-two-step-trick)).

### Step 5 — Rendering the reply

The reply comes back as one long string. The system prompt asks the model to
structure substantial answers using plain-text section headers:

```
Overview
A short summary.

Possible Causes
- bullet
- bullet

Recommendations
- bullet
...
```

[formatText.tsx](frontend/src/utils/formatText.tsx) contains
`parseDoctorSections()`, which looks for those exact header words (case-insensitively,
tolerating things like `**Overview**` if the model adds markdown emphasis) and splits
the text into named sections. [DoctorResponse.tsx](frontend/src/components/DoctorResponse.tsx)
then renders each recognized section as its own colored, icon-labeled box (green for
recommendations, amber for precautions, red for "when to see a doctor", etc.) — if no
sections are recognized (e.g. a casual one-line answer), it just renders the text
normally instead of forcing a structure that doesn't fit.

---

## 7. Walkthrough: Photo Mode, Step by Step

Photo mode follows the same conversation/message pattern, but with two extra pieces:
**file upload** and **structured JSON output** instead of free text.

### Step 1 — Uploading

[ImageUploader.tsx](frontend/src/components/ImageUploader.tsx) checks the file type
and size *in the browser* first (JPEG/PNG/WEBP only, 8MB max) so obviously-invalid
files never even get uploaded. The actual request is a `multipart/form-data` POST —
the standard way browsers send files — handled in
[photo.py](backend/app/routers/photo.py):

```python
@router.post("/{conversation_id}/photo", ...)
async def upload_and_analyze_photo(
    conversation_id: str, file: UploadFile = File(...), language: str = Form("en"), ...
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, ...)
    data = await file.read()
    if len(data) > max_image_bytes():
        raise HTTPException(status_code=413, ...)
```

The backend **re-checks** the type and size itself — never trust validation that
only happened in the browser, since anyone could call the API directly with `curl`
and skip the browser entirely.

### Step 2 — Saving the image (and remembering to delete it later)

```python
image_id, storage_path = save_image(file.content_type, data)
image = UploadedImage(..., expires_at=new_expiry())
db.add(image)
user_message = Message(conversation_id=conversation_id, role="user",
                        content=image_id, message_type="image")
```

Notice the `Message` row's `content` is just the **image's ID**, not the image data
itself — the actual bytes live on disk (in `backend/uploads/`), referenced by ID.
This keeps the database small and makes deletion simple (delete the file, keep a
record that it *was* deleted).

### Step 3 — Sending the image to the vision model

The image is base64-encoded (turned into a long text string, since JSON can't
contain raw binary data) and sent to `qwen2.5vl` with a much more detailed system
prompt that demands an exact JSON shape back — see
[prompts.py](backend/app/services/prompts.py):

```python
PHOTO_ANALYSIS_INSTRUCTIONS = """... Respond with ONLY a JSON object ...
{
  "visible_observations": ["..."],
  "possible_conditions": ["..."],
  ...
  "care_urgency": "routine" | "soon" | "urgent",
  "confidence_and_limitations": "..."
}
..."""
```

### Step 4 — The model doesn't always cooperate perfectly

Local AI models running on a laptop are much smaller and less reliable than
commercial cloud models. In testing, the model sometimes:
- wrapped the JSON in ` ```json ` markdown fences anyway,
- returned a single string instead of a list for a field,
- described `care_urgency` in its own words instead of the exact three allowed values.

Rather than crash the whole request over small formatting slips, two defensive
functions clean up the response before it's trusted:

- `_parse_json_response()` strips markdown fences and finds the `{...}` block even
  if there's extra text around it.
- `_normalize_assessment()` coerces a stray string into a one-item list, and maps
  any wording like *"needs urgent care"* onto the exact allowed value `"urgent"`.

This is a common, important pattern when working with AI models: **never fully
trust the output's exact shape — validate and repair it before using it.**

### Step 5 — Turning it into a "report" on screen

The now-valid JSON is saved as a `Message` with `message_type = "assessment"`
(its `content` is the JSON, stored as text). [AssessmentCard.tsx](frontend/src/components/AssessmentCard.tsx)
reads that JSON and renders it as the "Instant Report" card: a color-coded urgency
badge (from [UrgencyBadge.tsx](frontend/src/components/UrgencyBadge.tsx)), then one
labeled section per field, each with its own icon.

### Step 6 — Follow-up questions keep the image in context

If you ask *"What causes this?"* after getting a report, the app needs to send the
**original image again**, because a fresh request to the AI has no memory of
anything — every request is independent. `build_message_history()` handles this by
re-reading the image file from disk and re-attaching it whenever it rebuilds the
conversation for the AI:

```python
if message.message_type == "image":
    data = load_image_bytes(image.storage_path)
    b64 = base64.b64encode(data).decode("utf-8")
    history.append({"role": "user", "content": "...", "images": [b64]})
```

This is also why follow-up chat messages on a *photo* conversation are routed to the
**vision model**, not the text model — the text model can't accept an image at all,
and would just error out. [messages.py](backend/app/routers/messages.py) picks the
model based on the conversation's mode:

```python
model = settings.ollama_vision_model if conversation.mode == "photo" else settings.ollama_text_model
```

---

## 8. How the AI Is "Told What to Do": Prompts

A **prompt** is just the text you send an AI model. A **system prompt** is a special
prompt marked as instructions-from-the-application rather than a message from the
user — the model treats it as higher priority. All of this project's safety
behavior lives in one file: [prompts.py](backend/app/services/prompts.py).

The core rules, in `SAFETY_SYSTEM_PROMPT`, are things like:

> - You are not a doctor and cannot diagnose conditions. Never state a diagnosis
>   with certainty.
> - Use hedged language: "this may be consistent with...", "possible explanations
>   include..."
> - Recommend professional evaluation for anything concerning, and clearly
>   recommend prompt medical care for potentially urgent signs...

This is worth sitting with: **the safety behavior isn't a filter bolted on
afterward** — it's baked into every single request sent to the model, every time,
before the model generates anything. There's no separate "check if this is safe"
step after the fact; the instructions shape the output from the start.

Two things worth knowing about how these instructions were arrived at, since they
weren't guessed on the first try:

- **Model selection was tested, not assumed.** Before picking `qwen2.5vl` for
  photo analysis, several locally available vision models were tested against the
  exact same prompt. One (`llama3.2-vision`) turned out to be broken on this Ollama
  version entirely. Another (`minicpm-v`) returned schema violations (strings
  instead of lists). `qwen2.5vl` was chosen because it followed the JSON schema
  correctly and consistently.
- **The wording was refined based on real output**, not written once and left
  alone. An early version of the photo prompt produced observations as disconnected
  fragments ("red papules / scattered / on the back") instead of full sentences,
  and listed possible conditions as bare words instead of hedged phrases. The
  current prompt explicitly says:

  ```
  visible_observations: ... written as full descriptive sentences ..., never as
  disconnected keyword fragments.
  possible_conditions: ... Phrase EACH item individually as a hedged possibility,
  not a bare condition name - e.g. "Possibly consistent with acne" rather than
  just "Acne".
  ```

  This is the normal cycle of working with AI models: write a prompt, look
  critically at real output, find where it falls short, and tighten the wording —
  not a one-shot process.

---

## 9. Multiple Languages: A Two-Step Trick

Adding a language toggle sounds simple ("just tell the model to answer in Spanish"),
and for **chat mode** it really was that simple — `language_instruction()` just
appends a line like *"Write your entire response in Spanish"* to the system prompt,
and `llama3.2` (which officially supports Spanish, French, and Hindi) handles it
correctly in one pass.

**Photo mode was a different story**, and the fix is worth understanding because it
demonstrates something important about small, locally-run AI models: they don't
scale down gracefully on *combined* difficulty. Asking the vision model to (a) look
at an image, (b) fill in 8 separate structured fields, **and** (c) write all of it
in Hindi, all at once, turned out to be too much for a 7-billion-parameter model
running locally:

- At its default, near-zero "temperature" (a setting that controls randomness —
  low temperature means the model always picks its single most likely next word),
  it **stopped generating output at the exact same character every single time**,
  mid-sentence, regardless of how much token budget it was given.
- Raising the temperature to make it "less stuck" caused a **different** failure:
  it fell into a repetition loop, generating the same phrase over and over.

Both are genuine capability limits, not a bug in the prompt wording. The actual fix,
in `analyze_photo()` and `_translate_assessment()` in
[ollama_client.py](backend/app/services/ollama_client.py):

1. **Always generate the report in English first** — the model is reliably good at
   this.
2. **Translate afterward, as a separate step**, using the *text* model
   (`llama3.2`), which has solid native support for these languages.
3. Even the translation step needed care: asking the model to translate the whole
   report *as one JSON blob* (to preserve the field structure) caused it to flatten
   every field's text into one array and duplicate content. The fix was to flatten
   every translatable sentence into one simple **numbered list** of plain text
   lines first — no JSON, no nested structure to track — translate that, then map
   the numbered lines back onto their original fields by position:

   ```python
   numbered = "\n".join(f"{i + 1}. {line}" for i, line in enumerate(lines))
   # ask the model to translate each numbered line, same format, same order
   # ...then parse lines back out by their number and reassign to the right field
   ```

   Translating a flat list of independent short lines turned out to be a task the
   small model could do reliably; preserving a nested schema *while* translating
   was not. There's also a retry: if the first attempt comes back malformed, a
   second attempt is made with a slightly higher temperature, since a
   near-deterministic model will otherwise just fail the exact same way twice.

If translation still fails after the retry, the code deliberately **falls back to
the English report** rather than showing an error — a partially-degraded but usable
result beats a broken page.

---

## 10. The Sidebar, History, and a Bug We Found

The left sidebar ([Sidebar.tsx](frontend/src/components/Sidebar.tsx)) lists past
conversations by calling `GET /api/conversations`, and clicking one navigates to
`/chat/:id` or `/photo/:id`. [Chat.tsx](frontend/src/pages/Chat.tsx) and
[PhotoAnalysis.tsx](frontend/src/pages/PhotoAnalysis.tsx) check the URL for that
`:id` — if present, they fetch and "hydrate" (rebuild on-screen state from) that
conversation's saved messages; if absent, they wait to create a new one until you
actually send something.

This created a subtle **race condition** worth understanding, because it's a classic
category of bug in any app with both local UI state and a server: when a new
conversation is created and the URL is updated (`navigate("/chat/" + id)`), the
*same* "load this conversation's messages" code path fires again — because as far
as that code can tell, the URL just changed to point at an existing conversation,
which is exactly what happens when the user clicks a sidebar link too. That
re-fetch would come back nearly instantly with an empty conversation (since the
slow part — the AI generating a reply — hadn't finished yet), and could overwrite
the message that was just optimistically added to the screen.

The fix is a `useRef` flag that remembers "I just created this ID myself, don't
re-fetch it":

```tsx
const justCreatedRef = useRef<string | null>(null);

useEffect(() => {
  if (paramId && paramId === justCreatedRef.current) {
    justCreatedRef.current = null;   // consume the flag, only skip once
    return;
  }
  // ...otherwise, actually fetch and load that conversation
}, [paramId]);
```

This is a good example of why it's worth **actually testing** a feature end-to-end
(not just reading the code and assuming it's correct) — this bug only showed up by
sending a real message, reloading the page, and noticing the reply had vanished.

---

## 11. Light/Dark Theme, Without a Flash of the Wrong One

The theme toggle ([ThemeToggle.tsx](frontend/src/components/ThemeToggle.tsx),
[ThemeContext.tsx](frontend/src/context/ThemeContext.tsx)) supports Light, Dark, and
System, remembered in the browser's `localStorage`. Tailwind's dark mode works by
adding a `dark` CSS class to the page and giving elements alternate `dark:`-prefixed
styles.

A subtle but important detail: if the theme were only applied *after* React starts
up, a user with dark mode saved would see a flash of the light theme for a fraction
of a second on every page load. [index.html](frontend/index.html) has a tiny inline
`<script>` that runs **before anything else**, reading the saved preference and
applying the `dark` class immediately — so there's nothing to "flash" in the first
place.

---

## 12. Keeping It Safe and Private

A few concrete design decisions, and the reasoning behind each:

- **Images aren't kept forever.** Every uploaded image gets an `expires_at`
  timestamp, and a background task ([cleanup.py](backend/app/tasks/cleanup.py))
  runs once an hour, deleting the file (and marking it deleted in the database) once
  that time passes. Deleting a conversation also immediately deletes its image
  file, not just the database row.
- **No numerical "confidence score".** It might seem more impressive to show
  "87% confidence: acne," but a percentage next to a possible condition reads as
  false diagnostic certainty to a non-expert user — exactly the impression this
  project is designed to avoid. Instead there's a plain three-level **urgency**
  signal (routine / soon / urgent) that answers "how quickly should I seek care?"
  without pretending to know *what* the condition is.
- **The AI never sees more than it needs.** The vision model only ever receives
  the image and the current question — not your entire browsing history or any
  other personal data.
- **Backend re-validates everything the frontend already checked** — file type,
  file size, that a conversation exists before letting you post to it. Never trust
  client-side validation alone, since it's trivial to bypass by calling the API
  directly.

---

## 13. Running the Project Yourself

For local development:
```bash
./start.sh
```
This creates the Python virtual environment and installs dependencies on first run,
starts the backend on port 8000 and the frontend dev server on port 5173, and opens
your browser automatically.

For sharing on your local network or (with router port-forwarding) the public
internet:
```bash
./start-public.sh
```
This builds a production version of the frontend and serves both on `0.0.0.0`
(all network interfaces) instead of just `localhost`.

Both scripts also make sure Ollama is running and that the two required models
(`llama3.2`, `qwen2.5vl`) are pulled, pulling them automatically if not.

---

## 14. Known Limitations

Being upfront about what this project *doesn't* do well is part of understanding
it properly:

- **Local models are small and occasionally inconsistent.** The same photo can get
  slightly different wording on different runs, and non-English output quality is
  noticeably behind English.
- **No user accounts or authentication.** Anyone who can reach the server can see
  and create conversations — fine for a personal/demo project, not fine for a real
  product.
- **No automated tests.** Everything so far has been verified through manual and
  scripted (Playwright) testing during development, not a permanent test suite.
- **SQLite isn't built for concurrent heavy use.** It's fine for one person or a
  small demo; a real multi-user product would need PostgreSQL or similar.

---

## 15. Ideas If You Want to Extend This

Good next steps for learning, roughly in order of difficulty:

1. **Add automated tests** — write a few `pytest` tests for the backend endpoints
   using FastAPI's built-in `TestClient`, and mock the Ollama calls so tests don't
   need a real AI model running.
2. **Add simple user accounts** — even just a device-based session ID would let you
   scope conversation history per-user instead of showing everyone's history to
   everyone.
3. **Add rate limiting** — prevent one user from spamming the AI endpoints (which
   are the expensive/slow part) using a library like `slowapi`.
4. **Try a different or larger AI model** and compare its JSON-following
   reliability against `qwen2.5vl` using the same test approach described in
   [Section 8](#8-how-the-ai-is-told-what-to-do-prompts) — pick a few dozen test
   images/questions and check how often each model's output is usable without
   `_normalize_assessment()` having to repair it.
5. **Deploy it "for real"** — put the backend on a small cloud server and the
   frontend on a static host, and swap Ollama for a hosted API for the deployed
   version (the code already separates "which AI backend" behind
   `ollama_client.py`, so this is a contained change).

---

## Glossary

| Term | Meaning |
|---|---|
| **API** | "Application Programming Interface" — a defined way for one program to ask another program to do something, without needing to know how it's implemented internally. |
| **Endpoint** | One specific URL + HTTP method combination that a server responds to, e.g. `POST /api/conversations`. |
| **HTTP request/response** | The message format browsers and servers use to talk: a request asks for something (with a method like GET or POST), a response answers with data and a status code. |
| **JSON** | "JavaScript Object Notation" — a text format for representing structured data (`{"name": "value"}`) that almost every programming language can read and write. It's the standard way APIs send data back and forth. |
| **Frontend / Backend** | Frontend = the program running in the user's browser (what they see/click). Backend = the program running on a server, handling data and logic. |
| **Database** | Organized, persistent storage for data — unlike a variable in a running program, it survives after the program stops. |
| **Component (React)** | A reusable, self-contained piece of UI defined as a function that returns what should appear on screen. |
| **State** | Data that a program remembers and that, when it changes, causes the UI to update (e.g. the list of chat messages). |
| **Context (React)** | A way to share state across many components without manually passing it down through every layer in between (used here for theme and language). |
| **Prompt** | The text sent to an AI model as input. A **system prompt** is a special prompt that sets ground rules for the model's behavior, separate from the user's own message. |
| **Token** | The unit an AI model actually processes — roughly a word or part of a word (not exactly a character or a whole word). Models have a limited number of tokens they can "see" and generate at once. |
| **Temperature** | A setting controlling how random an AI model's word choices are. Near zero = always picks the most likely next word (deterministic). Higher = more variety, but more risk of going off-track. |
| **LLM** | "Large Language Model" — the general category of AI model used here (`llama3.2`, `qwen2.5vl`), trained to generate text (and in the vision model's case, describe images) one token at a time. |
| **Ollama** | Software that downloads and runs open-source LLMs on your own computer, and exposes them through a local API, so applications don't need to call an external company's AI service. |
| **UUID** | "Universally Unique Identifier" — a long random ID (like `a4ed7708-93c7-4958-88b0-...`) used so two different records never accidentally get the same ID. |
| **CORS** | "Cross-Origin Resource Sharing" — a browser security rule that blocks a web page from calling an API on a different domain/port unless that API explicitly allows it. The backend's `CORSMiddleware` is what grants this permission. |
| **Race condition** | A bug that only happens because of the *timing* between two things that run independently (e.g. two network requests), rather than either piece of code being wrong in isolation. |
