from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_access_code
from app.db import get_db
from app.models import Conversation
from app.schemas import ConversationCreate, ConversationDetailOut, ConversationOut
from app.services.image_store import delete_image_file

router = APIRouter(prefix="/api/conversations", tags=["conversations"], dependencies=[Depends(require_access_code)])


@router.post("", response_model=ConversationOut, status_code=201)
def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db)):
    if payload.mode not in ("chat", "photo"):
        raise HTTPException(status_code=400, detail="mode must be 'chat' or 'photo'")
    conversation = Conversation(mode=payload.mode)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db)):
    return db.query(Conversation).order_by(Conversation.updated_at.desc()).all()


@router.get("/{conversation_id}", response_model=ConversationDetailOut)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.delete("/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    for image in conversation.images:
        if image.deleted_at is None:
            delete_image_file(image.storage_path)
    db.delete(conversation)
    db.commit()
