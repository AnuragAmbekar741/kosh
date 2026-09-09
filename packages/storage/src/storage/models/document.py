from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class DocumentStatus(StrEnum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class DocumentSource(StrEnum):
    DASHBOARD = "dashboard"
    WHATSAPP = "whatsapp"


class Document(SQLModel, table=True):
    __tablename__ = "documents"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "idempotency_key", name="uq_document_user_idempotency"
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    filename: str
    mime_type: str
    size_bytes: int
    storage_key: str
    content_hash: str = Field(index=True)
    idempotency_key: str | None = None
    source: str = DocumentSource.DASHBOARD
    status: str = DocumentStatus.UPLOADED
    error: str | None = None
    attempt_count: int = 0
    claimed_at: datetime | None = None
    claim_token: UUID | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    processed_at: datetime | None = None


class ExtractionAttempt(SQLModel, table=True):
    __tablename__ = "extraction_attempts"
    __table_args__ = (
        UniqueConstraint(
            "document_id", "attempt_no", name="uq_extraction_attempt_document_no"
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="documents.id", index=True)
    attempt_no: int
    model: str
    provider: str | None = None
    schema_version: int = 1
    payload: dict | None = Field(
        default=None,
        sa_column=Column(JSONB().with_variant(JSON(), "sqlite"), nullable=True),
    )
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    cost_usd: str | None = None
    error: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
