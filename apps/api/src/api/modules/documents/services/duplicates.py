import re
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from sqlmodel import Session
from storage.crud.document import (
    confirmed_bill_lines,
    latest_attempt,
    list_bill_number_matches,
)
from storage.crud.spend import list_document_spend_items
from storage.models.document import Document
from storage.models.spend import SpendItem, SpendStatus

from api.modules.documents.schemas import DuplicateBill

_DATE_SLACK = timedelta(days=1)
_LIMIT = 3


def find_duplicates(
    session: Session, *, user_id: UUID, document: Document, drafts: list[SpendItem]
) -> list[DuplicateBill]:
    """Confirmed bills that look like the receipt under review.

    Same merchant and bill number is a certain match; otherwise the same
    merchant, total to the cent, and date within a day is a likely one.
    """
    if not drafts or _kind(session, document.id) != "receipt":
        return []
    merchant = drafts[0].merchant
    spent_at = drafts[0].spent_at
    total = sum((item.amount for item in drafts), Decimal(0))

    found: list[DuplicateBill] = []
    if document.bill_number:
        for other in list_bill_number_matches(
            session,
            user_id=user_id,
            bill_number=document.bill_number,
            exclude_id=document.id,
        ):
            lines = list_document_spend_items(
                session,
                user_id=user_id,
                document_id=other.id,
                status=SpendStatus.CONFIRMED,
            )
            if lines and _same_merchant(lines[0].merchant, merchant):
                found.append(_bill(other.id, lines, other.bill_number, certain=True))

    seen = {bill.document_id for bill in found}
    by_document: dict[UUID, list[SpendItem]] = defaultdict(list)
    for line in confirmed_bill_lines(
        session,
        user_id=user_id,
        start=spent_at - _DATE_SLACK,
        end=spent_at + _DATE_SLACK,
        exclude_id=document.id,
    ):
        by_document[line.document_id].append(line)  # type: ignore[index]
    for document_id, lines in by_document.items():
        if (
            document_id in seen
            or sum(line.amount for line in lines) != total
            or not _same_merchant(lines[0].merchant, merchant)
            or _kind(session, document_id) == "statement"
        ):
            continue
        found.append(_bill(document_id, lines, None, certain=False))
    return found[:_LIMIT]


def merchant_key(name: str) -> str:
    """Casefold, drop apostrophes, and reduce everything else to single spaces."""
    text = re.sub(r"['’]", "", name.casefold())
    return " ".join(re.sub(r"[^0-9a-z]+", " ", text).split())


def _same_merchant(a: str, b: str) -> bool:
    left, right = merchant_key(a), merchant_key(b)
    if not left or not right:
        return False
    return f" {left} " in f" {right} " or f" {right} " in f" {left} "


def _kind(session: Session, document_id: UUID) -> str | None:
    attempt = latest_attempt(session, document_id)
    if attempt is None or not isinstance(attempt.payload, dict):
        return None
    return attempt.payload.get("document_kind")


def _bill(
    document_id: UUID,
    lines: list[SpendItem],
    bill_number: str | None,
    *,
    certain: bool,
) -> DuplicateBill:
    return DuplicateBill(
        document_id=document_id,
        merchant=lines[0].merchant,
        spent_at=lines[0].spent_at,
        total=sum((line.amount for line in lines), Decimal(0)),
        currency=lines[0].currency,
        bill_number=bill_number,
        certain=certain,
    )
