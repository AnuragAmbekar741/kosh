from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

__all__ = [
    "ActionPublic",
    "ConversationDetail",
    "ConversationPublic",
    "MessageCreate",
    "MessagePublic",
]


# Matches MAX_IN_FLIGHT_DOCUMENTS: one send can't attach more than can be processing.
MAX_ATTACHMENTS = 5


class MessageCreate(BaseModel):
    text: str = Field(default="", max_length=4000)
    document_ids: list[UUID] = Field(
        default_factory=list,
        max_length=MAX_ATTACHMENTS,
        description="Bills uploaded with `source=agent` to attach to this message.",
    )

    @field_validator("text")
    @classmethod
    def strip(cls, value: str) -> str:
        return value.strip()

    @field_validator("document_ids")
    @classmethod
    def unique(cls, value: list[UUID]) -> list[UUID]:
        return list(dict.fromkeys(value))

    @model_validator(mode="after")
    def not_empty(self) -> MessageCreate:
        if not self.text and not self.document_ids:
            raise ValueError("send text, a bill, or both")
        return self


class ConversationPublic(BaseModel):
    id: UUID
    title: str | None
    channel: str
    created_at: datetime
    updated_at: datetime


class ActionPublic(BaseModel):
    """A write the agent offered; the user decides it from a card.

    Only `review_document` exists so far: the bill's drafts, saved by the
    user with `POST /documents/{document_id}/confirm`.
    """

    tool: str
    kind: Literal["review_document"]
    document_id: UUID
    merchant: str
    spent_at: date
    line_count: int
    totals: dict[str, str]
    possible_duplicates: int


class MessagePublic(BaseModel):
    id: UUID
    role: Literal["user", "assistant"]
    content: str
    document_ids: list[UUID] = Field(
        default_factory=list, description="Bills attached to a user message."
    )
    actions: list[ActionPublic] = Field(
        default_factory=list,
        description="On replies: cards for writes the agent offered in that turn.",
    )
    created_at: datetime
    status: Literal["running", "completed", "failed"] | None = Field(
        default=None,
        description="On the user's messages: how the reply went. "
        "Failed with no assistant message after it means there is no reply.",
    )


class ConversationDetail(ConversationPublic):
    messages: list[MessagePublic]
