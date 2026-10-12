from uuid import UUID

from sqlmodel import Session
from storage.crud.document import get_document_for_update, set_document_spent_at
from storage.models.document import Document, DocumentStatus

from api.common.errors import DocumentProcessingError, NotFoundError
from api.modules.documents.schemas import DocumentUpdate


def update_document(
    session: Session, *, user_id: UUID, document_id: UUID, body: DocumentUpdate
) -> Document:
    document = get_document_for_update(
        session, user_id=user_id, document_id=document_id
    )
    if document is None:
        raise NotFoundError
    if document.status == DocumentStatus.PROCESSING:
        raise DocumentProcessingError
    return set_document_spent_at(session, document, body.spent_at)
