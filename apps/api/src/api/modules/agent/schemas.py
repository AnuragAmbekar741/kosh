from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

__all__ = [
    "ConversationDetail",
    "ConversationPublic",
    "MessageCreate",
    "MessagePublic",
]


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=4000)

    @field_validator("text")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("text must not be blank")
        return value


class ConversationPublic(BaseModel):
    id: UUID
    title: str | None
    channel: str
    created_at: datetime
    updated_at: datetime


class MessagePublic(BaseModel):
    id: UUID
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
    status: Literal["running", "completed", "failed"] | None = Field(
        default=None,
        description="On the user's messages: how the reply went. "
        "Failed with no assistant message after it means there is no reply.",
    )


class ConversationDetail(ConversationPublic):
    messages: list[MessagePublic]
