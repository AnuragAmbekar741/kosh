from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
from storage.models.spend import Category

from api.modules.spend.schemas import SpendItemPublic

__all__ = [
    "AddDocumentLineItemRequest",
    "DocumentDetail",
    "DocumentSummary",
    "DocumentUploadResponse",
    "DuplicateBill",
    "ManualDocumentCreate",
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
    needs_review: bool = False


class DuplicateBill(BaseModel):
    document_id: UUID
    merchant: str
    spent_at: date
    total: Decimal
    currency: str
    bill_number: str | None
    certain: bool


class DocumentDetail(DocumentSummary):
    content_hash: str
    bill_number: str | None = None
    hash_matches_existing: bool = False
    possible_duplicates: list[DuplicateBill] = Field(default_factory=list)
    extraction: dict[str, Any] | None = None
    drafts: list[SpendItemPublic] = Field(default_factory=list)


class AddDocumentLineItemRequest(BaseModel):
    description: str = Field(min_length=1)
    amount: Decimal = Field(gt=0)
    category: Category


class ManualDocumentCreate(BaseModel):
    title: str = Field(min_length=1)

    @field_validator("title")
    @classmethod
    def title_stripped(cls, value: str) -> str:
        title = value.strip()
        if not title:
            raise ValueError("title must not be blank")
        return title
