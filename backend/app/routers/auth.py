from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AccessCodeCheck(BaseModel):
    code: str


@router.post("/check")
def check_access_code(payload: AccessCodeCheck):
    """Lets the frontend verify a code the visitor typed in before storing it and
    attaching it to every subsequent request. If no ACCESS_CODE is configured, any
    input is accepted (auth is effectively disabled)."""
    if settings.access_code and payload.code != settings.access_code:
        raise HTTPException(status_code=401, detail="Incorrect access code")
    return {"ok": True}
