from uuid import UUID

from sqlmodel import Session
from storage import blobs
from storage.blobs import BlobError
from storage.crud.document import delete_document_tree, get_document_for_update
from storage.models.document import DocumentStatus

from api.common.errors import (
    DocumentProcessingError,
    NotFoundError,
    StorageCleanupError,
)


def delete_document(session: Session, *, user_id: UUID, document_id: UUID) -> None:
    document = get_document_for_update(
        session, user_id=user_id, document_id=document_id
    )
    if document is None:
        raise NotFoundError
    if document.status == DocumentStatus.PROCESSING:
        raise DocumentProcessingError
    storage_key = delete_document_tree(session, document)
    if storage_key:
        try:
            blobs.delete_bytes(storage_key)
        except BlobError as exc:
            session.rollback()
            raise StorageCleanupError from exc
    session.commit()
