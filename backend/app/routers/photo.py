import base64
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.auth import require_access_code
from app.db import get_db
from app.models import Conversation, Message, UploadedImage
from app.schemas import PhotoAnalysisResponse
from app.services.ollama_client import analyze_photo
from app.services.image_store import (
    ALLOWED_CONTENT_TYPES,
    delete_image_file,
    load_image_bytes,
    max_image_bytes,
    new_expiry,
    save_image,
)

router = APIRouter(prefix="/api/conversations", tags=["photo"])


@router.post(
    "/{conversation_id}/photo",
    response_model=PhotoAnalysisResponse,
    status_code=201,
    dependencies=[Depends(require_access_code)],
)
async def upload_and_analyze_photo(
    conversation_id: str,
    file: UploadFile = File(...),
    language: str = Form("en"),
    db: Session = Depends(get_db),
):
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conversation.mode != "photo":
        raise HTTPException(status_code=400, detail="Conversation must be in 'photo' mode to upload an image")

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type '{file.content_type}'. Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )

    data = await file.read()
    if len(data) > max_image_bytes():
        raise HTTPException(status_code=413, detail="Image exceeds the maximum allowed size")
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    image_id, storage_path = save_image(file.content_type, data)
    image = UploadedImage(
        id=image_id,
        conversation_id=conversation_id,
        storage_path=storage_path,
        content_type=file.content_type,
        expires_at=new_expiry(),
    )
    db.add(image)

    user_message = Message(conversation_id=conversation_id, role="user", content=image_id, message_type="image")
    db.add(user_message)
    db.commit()

    b64 = base64.b64encode(data).decode("utf-8")
    try:
        assessment = analyze_photo(b64, language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # malformed JSON from the model, etc.
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}") from exc

    assistant_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=json.dumps(assessment),
        message_type="assessment",
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)

    return PhotoAnalysisResponse(
        conversation_id=conversation_id,
        image_id=image_id,
        assessment=assessment,
        assistant_message=assistant_message,
    )


@router.get("/{conversation_id}/photo/{image_id}")
def get_photo(conversation_id: str, image_id: str, db: Session = Depends(get_db)):
    image = db.get(UploadedImage, image_id)
    if image is None or image.conversation_id != conversation_id or image.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Image not found")

    return Response(content=load_image_bytes(image.storage_path), media_type=image.content_type)


@router.delete("/{conversation_id}/photo/{image_id}", status_code=204, dependencies=[Depends(require_access_code)])
def delete_photo(conversation_id: str, image_id: str, db: Session = Depends(get_db)):
    image = db.get(UploadedImage, image_id)
    if image is None or image.conversation_id != conversation_id:
        raise HTTPException(status_code=404, detail="Image not found")
    if image.deleted_at is None:
        delete_image_file(image.storage_path)
        image.deleted_at = datetime.now(timezone.utc)
        db.commit()
