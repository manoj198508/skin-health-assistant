from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_access_code
from app.config import settings
from app.db import get_db
from app.models import Conversation, Message
from app.schemas import MessageCreate, MessageCreateResponse
from app.services.history import build_message_history
from app.services.ollama_client import send_chat_message

router = APIRouter(prefix="/api/conversations", tags=["messages"], dependencies=[Depends(require_access_code)])


@router.post("/{conversation_id}/messages", response_model=MessageCreateResponse, status_code=201)
def post_message(conversation_id: str, payload: MessageCreate, db: Session = Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="content must not be empty")

    user_message = Message(conversation_id=conversation_id, role="user", content=payload.content)
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    history = build_message_history(conversation)
    model = settings.active_vision_model if conversation.mode == "photo" else settings.active_text_model

    try:
        reply_text = send_chat_message(history, model, payload.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # unexpected Ollama response issues
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}") from exc

    assistant_message = Message(conversation_id=conversation_id, role="assistant", content=reply_text)
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)

    return MessageCreateResponse(user_message=user_message, assistant_message=assistant_message)
