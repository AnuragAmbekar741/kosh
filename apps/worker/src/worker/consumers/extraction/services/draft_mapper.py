from decimal import Decimal
from uuid import UUID

from ai.schemas import ReceiptExtraction, StatementExtraction
from storage.models.spend import SpendItem, SpendSource, SpendStatus


def drafts(
    user_id: UUID, extraction: ReceiptExtraction | StatementExtraction
) -> list[SpendItem]:
    if isinstance(extraction, ReceiptExtraction):
        rows = [
            SpendItem(
                user_id=user_id,
                merchant=extraction.merchant,
                description=None,
                amount=Decimal(extraction.total),
                currency=extraction.currency,
                spent_at=extraction.purchased_at,
                category=extraction.category,
                source=SpendSource.DOCUMENT,
                status=SpendStatus.PENDING_REVIEW,
                line_index=None,
            )
        ]
        for index, item in enumerate(extraction.line_items):
            rows.append(
                SpendItem(
                    user_id=user_id,
                    merchant=extraction.merchant,
                    description=item.normalized_name or item.raw_description,
                    amount=Decimal(item.line_total),
                    currency=extraction.currency,
                    spent_at=extraction.purchased_at,
                    category=item.category,
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
                source=SpendSource.DOCUMENT,
                status=SpendStatus.PENDING_REVIEW,
                line_index=index,
            )
        )
    return rows
