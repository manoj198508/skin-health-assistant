from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_serializer


def _as_utc_isoformat(value: datetime) -> str:
    # SQLite doesn't preserve timezone-awareness on read, so values that were stored as
    # UTC can come back naive. Without this, the browser's Date parser treats a naive
    # ISO string as local time instead of UTC, producing wildly wrong "time ago" values.
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    content: str
    message_type: str
    created_at: datetime

    @field_serializer("created_at")
    def _serialize_created_at(self, value: datetime) -> str:
        return _as_utc_isoformat(value)


class ConversationCreate(BaseModel):
    mode: str = "chat"


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    mode: str
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def _serialize_timestamps(self, value: datetime) -> str:
        return _as_utc_isoformat(value)


class ConversationDetailOut(ConversationOut):
    messages: list[MessageOut] = []


class MessageCreate(BaseModel):
    content: str
    language: str = "en"


class MessageCreateResponse(BaseModel):
    user_message: MessageOut
    assistant_message: MessageOut


class PhotoAssessment(BaseModel):
    visible_observations: list[str]
    possible_conditions: list[str]
    explanation: str
    general_information: str
    self_care: list[str]
    precautions: list[str]
    when_to_see_doctor: list[str]
    care_urgency: Literal["routine", "soon", "urgent"]
    confidence_and_limitations: str


class PhotoAnalysisResponse(BaseModel):
    conversation_id: str
    image_id: str
    assessment: PhotoAssessment
    assistant_message: MessageOut
