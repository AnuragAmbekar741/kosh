from uuid import UUID

from pydantic import BaseModel, Field

__all__ = ["CatalogEntry", "CatalogSearchQuery"]


class CatalogSearchQuery(BaseModel):
    q: str = Field(min_length=1, max_length=100)
    limit: int = Field(default=20, ge=1, le=50)


class CatalogEntry(BaseModel):
    """A family (family is null) or an item; category comes from the family."""

    id: UUID
    name: str
    family: str | None
    category: str | None
    is_family: bool
    mine: bool
