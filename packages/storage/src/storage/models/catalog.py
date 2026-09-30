from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class CatalogItem(SQLModel, table=True):
    """A catalog family (parent_id is None) or an item under one.

    Shared starter rows have user_id None and a stable slug from catalog.csv.
    """

    __tablename__ = "catalog_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID | None = Field(default=None, foreign_key="users.id", index=True)
    parent_id: UUID | None = Field(
        default=None, foreign_key="catalog_items.id", index=True
    )
    slug: str | None = Field(default=None, unique=True)
    name: str
    name_key: str = Field(index=True)
    synonyms: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB().with_variant(JSON(), "sqlite"), nullable=False),
    )
    category: str | None = None
    retired: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
