from uuid import UUID

from sqlmodel import Session
from storage.crud.document import get_document, list_documents
from storage.models.document import Document

from api.common.errors import NotFoundError


def get(session: Session, user_id: UUID, document_id: UUID) -> Document:
    document = get_document(session, user_id=user_id, document_id=document_id)
    if document is None:
        raise NotFoundError
    return document


def list_owned(session: Session, user_id: UUID) -> list[Document]:
    return list_documents(session, user_id=user_id)
