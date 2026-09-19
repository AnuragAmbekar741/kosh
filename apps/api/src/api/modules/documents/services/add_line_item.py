from datetime import UTC, datetime
from uuid import UUID

from sqlmodel import Session
from storage.crud.document import get_document, latest_attempt
from storage.crud.spend import create_spend_item, list_document_spend_items
from storage.models.document import Document, DocumentSource, DocumentStatus
from storage.models.spend import SpendItem, SpendSource, SpendStatus

from api.common.errors import (
    DocumentBillNotItemizedError,
    DocumentNotConfirmedError,
    DocumentNotReceiptError,
    DocumentProcessingError,
    NotFoundError,
)
from api.modules.documents.schemas import AddDocumentLineItemRequest


def add_line_item(
    session: Session,
    *,
    user_id: UUID,
    document_id: UUID,
    body: AddDocumentLineItemRequest,
) -> SpendItem:
    document = get_document(session, user_id=user_id, document_id=document_id)
    if document is None:
        raise NotFoundError
    if document.status == DocumentStatus.PROCESSING:
        raise DocumentProcessingError
    rows = list_document_spend_items(session, user_id=user_id, document_id=document_id)
    if document.source == DocumentSource.MANUAL:
        return _add_manual_line(
            session, user_id=user_id, document=document, rows=rows, body=body
        )
    return _add_receipt_line(
        session, user_id=user_id, document_id=document_id, rows=rows, body=body
    )


def _add_manual_line(
    session: Session,
    *,
    user_id: UUID,
    document: Document,
    rows: list[SpendItem],
    body: AddDocumentLineItemRequest,
) -> SpendItem:
    confirmed = [row for row in rows if row.status == SpendStatus.CONFIRMED]
    if confirmed:
        itemized = [row for row in confirmed if row.line_index is not None]
        anchor = min(itemized or confirmed, key=lambda row: row.line_index or 0)
        merchant = anchor.merchant
        currency = anchor.currency
        spent_at = anchor.spent_at
        next_index = (
            max(
                (row.line_index for row in rows if row.line_index is not None),
                default=-1,
            )
            + 1
        )
    else:
        merchant = document.filename
        currency = "USD"
        spent_at = datetime.now(UTC).date()
        next_index = 0
    return create_spend_item(
        session,
        user_id=user_id,
        merchant=merchant,
        description=body.description,
        amount=body.amount,
        currency=currency,
        spent_at=spent_at,
        category=body.category,
        source=SpendSource.MANUAL,
        status=SpendStatus.CONFIRMED,
        document_id=document.id,
        line_index=next_index,
        user_edited=True,
    )


def _add_receipt_line(
    session: Session,
    *,
    user_id: UUID,
    document_id: UUID,
    rows: list[SpendItem],
    body: AddDocumentLineItemRequest,
) -> SpendItem:
    attempt = latest_attempt(session, document_id)
    kind = None
    if attempt is not None and isinstance(attempt.payload, dict):
        kind = attempt.payload.get("document_kind")
    if kind != "receipt":
        raise DocumentNotReceiptError
    confirmed = [row for row in rows if row.status == SpendStatus.CONFIRMED]
    if not confirmed:
        raise DocumentNotConfirmedError
    itemized = [row for row in confirmed if row.line_index is not None]
    if not itemized:
        raise DocumentBillNotItemizedError
    anchor = min(itemized, key=lambda row: row.line_index or 0)
    next_index = (
        max(
            (row.line_index for row in rows if row.line_index is not None),
            default=-1,
        )
        + 1
    )
    return create_spend_item(
        session,
        user_id=user_id,
        merchant=anchor.merchant,
        description=body.description,
        amount=body.amount,
        currency=anchor.currency,
        spent_at=anchor.spent_at,
        category=body.category,
        source=SpendSource.DOCUMENT,
        status=SpendStatus.CONFIRMED,
        document_id=document_id,
        line_index=next_index,
        user_edited=True,
    )
