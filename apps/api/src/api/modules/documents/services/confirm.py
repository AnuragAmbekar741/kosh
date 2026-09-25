from uuid import UUID

from sqlmodel import Session
from storage.crud.document import get_document
from storage.crud.spend import confirm_document_items, list_document_spend_items
from storage.models.document import DocumentStatus
from storage.models.spend import SpendItem, SpendStatus

from api.common.errors import (
    DocumentNotReadyError,
    NoDraftsToConfirmError,
    NotFoundError,
)


def confirm(
    session: Session,
    *,
    user_id: UUID,
    document_id: UUID,
) -> list[SpendItem]:
    document = get_document(session, user_id=user_id, document_id=document_id)
    if document is None:
        raise NotFoundError
    if document.status != DocumentStatus.READY:
        raise DocumentNotReadyError
    rows = list_document_spend_items(session, user_id=user_id, document_id=document_id)
    drafts = [item for item in rows if item.status == SpendStatus.PENDING_REVIEW]
    if not any(item.line_index is not None for item in drafts):
        raise NoDraftsToConfirmError
    return confirm_document_items(session, user_id=user_id, document_id=document_id)
