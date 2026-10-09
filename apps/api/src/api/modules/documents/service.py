from uuid import UUID

from sqlmodel import Session
from storage.crud.document import (
    get_document,
    list_documents,
    pending_review_document_ids,
)
from storage.models.document import Document, DocumentStatus

from api.common.errors import NotFoundError

_IN_FLIGHT = {DocumentStatus.UPLOADED, DocumentStatus.PROCESSING}


def get(session: Session, user_id: UUID, document_id: UUID) -> Document:
    document = get_document(session, user_id=user_id, document_id=document_id)
    if document is None:
        raise NotFoundError
    return document


def list_owned(session: Session, user_id: UUID) -> list[Document]:
    return list_documents(session, user_id=user_id)


def needs_review(document: Document, *, has_pending: bool) -> bool:
    """Still extracting, or extracted with drafts the user hasn't confirmed."""
    return document.status in _IN_FLIGHT or has_pending


def list_with_review(session: Session, user_id: UUID) -> list[tuple[Document, bool]]:
    pending = pending_review_document_ids(session, user_id=user_id)
    return [
        (document, needs_review(document, has_pending=document.id in pending))
        for document in list_documents(session, user_id=user_id)
    ]
