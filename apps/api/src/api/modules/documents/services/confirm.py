from uuid import UUID

from sqlmodel import Session
from storage.crud.document import get_document, latest_attempt
from storage.crud.spend import confirm_document_items, list_document_spend_items
from storage.models.document import DocumentStatus
from storage.models.spend import SpendItem, SpendStatus

from api.common.errors import (
    ConfirmModeConflictError,
    ConfirmSelectionError,
    DocumentNotReadyError,
    NoDraftsToConfirmError,
    NotFoundError,
)
from api.modules.documents.schemas import ConfirmDocumentRequest


def confirm(
    session: Session,
    *,
    user_id: UUID,
    document_id: UUID,
    body: ConfirmDocumentRequest,
) -> list[SpendItem]:
    document = get_document(session, user_id=user_id, document_id=document_id)
    if document is None:
        raise NotFoundError
    if document.status != DocumentStatus.READY:
        raise DocumentNotReadyError
    rows = list_document_spend_items(session, user_id=user_id, document_id=document_id)
    drafts = [item for item in rows if item.status == SpendStatus.PENDING_REVIEW]
    already_confirmed = [item for item in rows if item.status == SpendStatus.CONFIRMED]
    attempt = latest_attempt(session, document_id)
    kind = None
    if attempt is not None and isinstance(attempt.payload, dict):
        kind = attempt.payload.get("document_kind")
    mode = body.mode
    if kind == "statement":
        mode = "line_items"
    confirmed_total = any(item.line_index is None for item in already_confirmed)
    confirmed_lines = any(item.line_index is not None for item in already_confirmed)
    if (mode == "total" and confirmed_lines) or (
        mode == "line_items" and confirmed_total
    ):
        raise ConfirmModeConflictError
    eligible = {
        item.id for item in drafts if (item.line_index is None) == (mode == "total")
    }
    if body.item_ids is not None:
        requested = set(body.item_ids)
        if not requested or not requested <= eligible:
            raise ConfirmSelectionError
        selected = list(requested)
    else:
        selected = list(eligible)
    if not selected:
        raise NoDraftsToConfirmError
    return confirm_document_items(
        session, user_id=user_id, document_id=document_id, item_ids=selected
    )
