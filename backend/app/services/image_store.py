import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.config import settings

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def max_image_bytes() -> int:
    return settings.max_image_mb * 1024 * 1024


def new_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=settings.image_ttl_hours)


def save_image(content_type: str, data: bytes) -> tuple[str, str]:
    """Saves image bytes to disk. Returns (image_id, storage_path)."""
    image_id = str(uuid.uuid4())
    extension = ALLOWED_CONTENT_TYPES[content_type]
    file_path = UPLOAD_DIR / f"{image_id}.{extension}"
    file_path.write_bytes(data)
    return image_id, str(file_path)


def load_image_bytes(storage_path: str) -> bytes:
    return Path(storage_path).read_bytes()


def delete_image_file(storage_path: str) -> None:
    path = Path(storage_path)
    if path.exists():
        path.unlink()
