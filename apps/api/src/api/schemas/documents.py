from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from api.schemas.spend import SpendItemPublic

__all__ = [
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
