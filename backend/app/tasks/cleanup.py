from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import UploadedImage
from app.services.image_store import delete_image_file


def purge_expired_images(db: Session) -> int:
    now = datetime.now(timezone.utc)
    expired = (
        db.query(UploadedImage)
        .filter(UploadedImage.expires_at < now, UploadedImage.deleted_at.is_(None))
        .all()
    )
    for image in expired:
        delete_image_file(image.storage_path)
        image.deleted_at = now
    if expired:
        db.commit()
    return len(expired)
