from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from api.modules.spend.schemas import SpendItemPublic

__all__ = [
    "AddDocumentLineItemRequest",
    "ConfirmDocumentRequest",
    "DocumentDetail",
    "DocumentSummary",
    "DocumentUploadResponse",
]


class DocumentUploadResponse(BaseModel):
    id: UUID
    status: str


class DocumentSummary(BaseModel):
    id: UUID
    filename: str
    mime_type: str
    size_bytes: int
    status: str
    source: str
    error: str | None
    created_at: datetime
    processed_at: datetime | None


class DocumentDetail(DocumentSummary):
    content_hash: str
    hash_matches_existing: bool = False
    extraction: dict[str, Any] | None = None
    drafts: list[SpendItemPublic] = Field(default_factory=list)


class ConfirmDocumentRequest(BaseModel):
    mode: Literal["total", "line_items"] = "total"
    item_ids: list[UUID] | None = None


class AddDocumentLineItemRequest(BaseModel):
    description: str = Field(min_length=1)
    amount: Decimal = Field(gt=0)
    category: str | None = None
