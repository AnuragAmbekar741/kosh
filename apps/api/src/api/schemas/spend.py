from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

__all__ = [
    "SpendItemCreate",
    "SpendItemPublic",
    "SpendItemUpdate",
]


def _require_positive_amount(value: Decimal) -> Decimal:
    if value <= 0:
        raise ValueError("amount must be greater than zero")
    return value


class SpendItemCreate(BaseModel):
    merchant: str = Field(min_length=1)
    description: str | None = None
    amount: Decimal
    currency: str = Field(default="USD", min_length=3, max_length=3)
    spent_at: date
    category: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, value: Decimal) -> Decimal:
        return _require_positive_amount(value)

    @field_validator("currency")
    @classmethod
    def currency_upper(cls, value: str) -> str:
        return value.upper()


class SpendItemUpdate(BaseModel):
    merchant: str | None = Field(default=None, min_length=1)
    description: str | None = None
    amount: Decimal | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    spent_at: date | None = None
    category: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, value: Decimal | None) -> Decimal | None:
        if value is None:
            return value
        return _require_positive_amount(value)

    @field_validator("currency")
    @classmethod
    def currency_upper(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return value.upper()


class SpendItemPublic(BaseModel):
    id: UUID
    merchant: str
    description: str | None
    amount: Decimal
    currency: str
    spent_at: date
    category: str | None
    source: str
    status: str
    document_id: UUID | None = None
    line_index: int | None = None
    user_edited: bool = False
    created_at: datetime
    updated_at: datetime
