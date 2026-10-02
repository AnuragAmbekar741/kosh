from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, Index, Numeric, column
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from storage.models.catalog import CatalogItem


class SpendSource(StrEnum):
    MANUAL = "manual"
    DOCUMENT = "document"
    WHATSAPP = "whatsapp"


class SpendStatus(StrEnum):
    PENDING_REVIEW = "pending_review"
    CONFIRMED = "confirmed"


class CategorySource(StrEnum):
    EXTRACTION = "extraction"
    ITEM = "item"
    USER = "user"


class ItemStatus(StrEnum):
    """Where a receipt line is in catalog matching."""

    NONE = "none"
    PENDING = "pending"
    PROCESSING = "processing"
    RESOLVED = "resolved"
    NEEDS_REVIEW = "needs_review"
    NOT_PRODUCT = "not_product"
    FAILED = "failed"


class ItemMethod(StrEnum):
    ALIAS = "alias"
    MATCH = "match"
    MODEL = "model"
    USER = "user"


class Category(StrEnum):
    GROCERIES = "Groceries"
    DINING_OUT = "Dining out"
    HOUSEHOLD = "Household"
    PERSONAL_CARE = "Personal care"
    HEALTH = "Health"
    BABY_AND_KIDS = "Baby & kids"
    PET = "Pet"
    SHOPPING = "Shopping"
    TRANSPORT = "Transport"
    HOUSING = "Housing"
    UTILITIES = "Utilities"
    ENTERTAINMENT = "Entertainment"
    TRAVEL = "Travel"
    OTHER = "Other"


class SpendItem(SQLModel, table=True):
    __tablename__ = "spend_items"
    __table_args__ = (
        Index(
            "ix_spend_items_user_spent_id",
            "user_id",
            column("spent_at").desc(),
            column("id").desc(),
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    merchant: str
    description: str | None = None
    normalized_name: str | None = None
    item_code: str | None = None
    quantity: Decimal | None = Field(
        default=None, sa_column=Column(Numeric(12, 3), nullable=True)
    )
    unit_price: Decimal | None = Field(
        default=None, sa_column=Column(Numeric(12, 4), nullable=True)
    )
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    currency: str
    spent_at: date = Field(index=True)
    category: str | None = None
    category_source: str | None = None
    catalog_item_id: UUID | None = Field(
        default=None, foreign_key="catalog_items.id", index=True
    )
    item_status: str = Field(default=ItemStatus.NONE, index=True)
    # SQLModel resolves relationships from the string form only.
    catalog_item: Optional["CatalogItem"] = Relationship()  # noqa: UP037, UP045
    item_method: str | None = None
    item_claim_token: UUID | None = None
    item_claimed_at: datetime | None = None
    item_attempts: int = 0
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
