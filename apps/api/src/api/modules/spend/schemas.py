from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator
from storage.models.spend import Category

from api.common.pagination import Page

__all__ = [
    "ItemCorrection",
    "NewCatalogItem",
    "SpendItemCatalog",
    "SpendItemCreate",
    "SpendItemPublic",
    "SpendItemUpdate",
    "SpendListQuery",
    "SpendPeriod",
    "SpendQuery",
    "SpendSummary",
    "SpendSummaryComparison",
    "SpendSummaryQuery",
]

SpendPeriod = Literal["day", "week", "month", "custom"]


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
    category: Category

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
    category: Category | None = None

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


class SpendItemCatalog(BaseModel):
    """The catalog row a line is matched to; family is None when it is a family."""

    id: UUID
    name: str
    family: str | None


class SpendItemPublic(BaseModel):
    id: UUID
    merchant: str
    description: str | None
    amount: Decimal
    currency: str
    spent_at: date
    category: str | None
    item: SpendItemCatalog | None = None
    item_status: str = "none"
    source: str
    status: str
    document_id: UUID | None = None
    line_index: int | None = None
    user_edited: bool = False
    created_at: datetime
    updated_at: datetime


class SpendQuery(BaseModel):
    spent_from: date | None = None
    spent_to: date | None = None
    category: list[Category] | None = None
    merchant: str | None = None
    source: str | None = None
    q: str | None = None


class SpendListQuery(SpendQuery, Page):
    pass


class SpendSummaryQuery(SpendQuery):
    period: SpendPeriod | None = None


class SpendSummaryComparison(BaseModel):
    delta_percent: float
    previous_label: str


class SpendSummary(BaseModel):
    currency: str
    total: Decimal
    bill_count: int
    item_count: int
    avg_per_bill: Decimal
    has_spend: bool
    comparison: SpendSummaryComparison | None


class NewCatalogItem(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    family_id: UUID


class ItemCorrection(BaseModel):
    """Exactly one of: an existing catalog row, a new private item, or not a product."""

    catalog_item_id: UUID | None = None
    new_item: NewCatalogItem | None = None
    not_product: bool = False

    @model_validator(mode="after")
    def exactly_one(self) -> ItemCorrection:
        chosen = [
            self.catalog_item_id is not None,
            self.new_item is not None,
            self.not_product,
        ]
        if sum(chosen) != 1:
            raise ValueError("choose one of catalog_item_id, new_item, not_product")
        return self
