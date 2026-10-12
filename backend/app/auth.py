from fastapi import Header, HTTPException

from app.config import settings


def require_access_code(x_access_code: str | None = Header(default=None)) -> None:
    """Gates an endpoint behind a shared passphrase set via the ACCESS_CODE env var.

    This is a deliberately simple shared-secret check, not a full auth system - it's meant
    to stop random strangers who stumble on the public link from using the app, not to
    support individual user accounts. If ACCESS_CODE is unset, every request is allowed
    through (the default for local development)."""
    if not settings.access_code:
        return
    if x_access_code != settings.access_code:
        raise HTTPException(status_code=401, detail="Missing or incorrect access code")
