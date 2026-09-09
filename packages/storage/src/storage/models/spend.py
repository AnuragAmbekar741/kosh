from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, Numeric
from sqlmodel import Field, SQLModel


class SpendSource(StrEnum):
    MANUAL = "manual"
    DOCUMENT = "document"
    WHATSAPP = "whatsapp"


class SpendStatus(StrEnum):
    PENDING_REVIEW = "pending_review"
    CONFIRMED = "confirmed"


class SpendItem(SQLModel, table=True):
    __tablename__ = "spend_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    merchant: str
    description: str | None = None
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    currency: str
    spent_at: date = Field(index=True)
    category: str | None = None
    source: str
    status: str
    document_id: UUID | None = Field(
        default=None, foreign_key="documents.id", index=True
    )
    extraction_attempt_id: UUID | None = Field(
        default=None, foreign_key="extraction_attempts.id", index=True
    )
    line_index: int | None = None
    user_edited: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
