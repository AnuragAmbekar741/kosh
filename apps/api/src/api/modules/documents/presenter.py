from uuid import UUID

from sqlmodel import Session
from storage.crud.document import hash_matches_other, latest_attempt
from storage.crud.spend import list_document_spend_items
from storage.models.document import Document
from storage.models.spend import SpendStatus

from api.modules.documents.schemas import DocumentDetail, DocumentSummary
from api.modules.spend.presenter import to_public


def to_summary(document: Document) -> DocumentSummary:
    return DocumentSummary(
        id=document.id,
        filename=document.filename,
        mime_type=document.mime_type,
        size_bytes=document.size_bytes,
        status=document.status,
        source=document.source,
        error=document.error,
        created_at=document.created_at,
        processed_at=document.processed_at,
    )


def to_detail(session: Session, user_id: UUID, document: Document) -> DocumentDetail:
    attempt = latest_attempt(session, document.id)
    drafts = list_document_spend_items(
        session,
        user_id=user_id,
        document_id=document.id,
        status=SpendStatus.PENDING_REVIEW,
    )
    return DocumentDetail(
        **to_summary(document).model_dump(),
        content_hash=document.content_hash,
        hash_matches_existing=hash_matches_other(
            session,
            user_id=user_id,
            content_hash=document.content_hash,
            document_id=document.id,
        ),
        extraction=attempt.payload if attempt is not None else None,
        drafts=[to_public(item) for item in drafts],
    )
