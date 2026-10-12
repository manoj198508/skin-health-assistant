import base64

from app.models import Conversation
from app.services.image_store import load_image_bytes


def build_message_history(conversation: Conversation) -> list[dict]:
    """Turns stored messages into Ollama chat-format history, re-attaching the uploaded
    image (as a base64 string) on the turn it was uploaded so follow-up questions keep
    visual context."""
    images_by_id = {image.id: image for image in conversation.images}
    history: list[dict] = []

    for message in conversation.messages:
        if message.message_type == "image":
            image = images_by_id.get(message.content)
            if image is None or image.deleted_at is not None:
                history.append(
                    {
                        "role": "user",
                        "content": "[The previously uploaded photo is no longer available.]",
                    }
                )
                continue
            data = load_image_bytes(image.storage_path)
            b64 = base64.b64encode(data).decode("utf-8")
            history.append(
                {
                    "role": "user",
                    "content": "Please analyze this photo of a skin concern.",
                    "images": [b64],
                }
            )
        else:
            history.append({"role": message.role, "content": message.content})

    return history
