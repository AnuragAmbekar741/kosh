from decimal import Decimal
from uuid import UUID

from ai.schemas import ReceiptExtraction, StatementExtraction
from sqlmodel import Session
from storage.crud.spend import upsert_drafts
from storage.models.document import Document
from storage.models.spend import CategorySource, SpendItem, SpendSource, SpendStatus


def _decimal(value: str | None) -> Decimal | None:
    return Decimal(value) if value is not None else None


def to_spend_items(
    user_id: UUID, extraction: ReceiptExtraction | StatementExtraction
) -> list[SpendItem]:
    if isinstance(extraction, ReceiptExtraction):
        rows = []
        for index, item in enumerate(extraction.line_items):
            rows.append(
                SpendItem(
                    user_id=user_id,
                    merchant=extraction.merchant,
                    description=item.raw_description,
                    normalized_name=item.normalized_name,
                    item_code=item.upc,
                    quantity=_decimal(item.quantity),
                    unit_price=_decimal(item.unit_price),
                    amount=Decimal(item.line_total),
                    currency=extraction.currency,
                    spent_at=extraction.purchased_at,
                    category=item.category,
                    category_source=CategorySource.EXTRACTION,
                    source=SpendSource.DOCUMENT,
                    status=SpendStatus.PENDING_REVIEW,
                    line_index=index,
                )
            )
        return rows
    rows = []
    for index, txn in enumerate(extraction.transactions):
        if txn.direction == "credit":
            continue
        rows.append(
            SpendItem(
                user_id=user_id,
                merchant=txn.merchant,
                description=None,
                amount=Decimal(txn.amount),
                currency=extraction.currency,
                spent_at=txn.spent_at,
                category=txn.category,
                category_source=CategorySource.EXTRACTION,
                source=SpendSource.DOCUMENT,
                status=SpendStatus.PENDING_REVIEW,
                line_index=index,
            )
        )
    return rows


def save(
    session: Session,
    document: Document,
    attempt_id: UUID,
    extraction: ReceiptExtraction | StatementExtraction,
) -> None:
    """Upsert the drafts without committing; the job commits with the status."""
    upsert_drafts(
        session,
        user_id=document.user_id,
        document_id=document.id,
        extraction_attempt_id=attempt_id,
        drafts=to_spend_items(document.user_id, extraction),
        commit=False,
    )
