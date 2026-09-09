from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from sqlmodel import Session, col, select

from storage.models.spend import SpendItem, SpendSource, SpendStatus

__all__ = [
    "confirm_document_items",
    "create_spend_item",
    "delete_spend_item",
    "get_spend_item",
    "list_document_spend_items",
    "list_spend_items",
    "update_spend_item",
    "upsert_drafts",
]


def create_spend_item(
    session: Session,
    *,
    user_id: UUID,
    merchant: str,
    amount: Decimal,
    currency: str,
    spent_at: date,
    source: str,
    status: str,
    description: str | None = None,
    category: str | None = None,
    document_id: UUID | None = None,
    extraction_attempt_id: UUID | None = None,
    line_index: int | None = None,
    user_edited: bool = False,
    commit: bool = True,
) -> SpendItem:
    item = SpendItem(
        user_id=user_id,
        merchant=merchant,
        description=description,
        amount=amount,
        currency=currency,
        spent_at=spent_at,
        category=category,
        source=source,
        status=status,
        document_id=document_id,
        extraction_attempt_id=extraction_attempt_id,
        line_index=line_index,
        user_edited=user_edited,
    )
    session.add(item)
    if commit:
        session.commit()
        session.refresh(item)
    return item


def get_spend_item(
    session: Session, *, user_id: UUID, item_id: UUID
) -> SpendItem | None:
    item = session.get(SpendItem, item_id)
    if item is None or item.user_id != user_id:
        return None
    return item


def list_spend_items(
    session: Session,
    *,
    user_id: UUID,
    spent_from: date | None = None,
    spent_to: date | None = None,
    category: str | None = None,
    merchant: str | None = None,
    source: str | None = None,
    status: str | None = SpendStatus.CONFIRMED,
) -> list[SpendItem]:
    statement = select(SpendItem).where(SpendItem.user_id == user_id)
    if spent_from is not None:
        statement = statement.where(SpendItem.spent_at >= spent_from)
    if spent_to is not None:
        statement = statement.where(SpendItem.spent_at <= spent_to)
    if category is not None:
        statement = statement.where(SpendItem.category == category)
    if merchant is not None:
        statement = statement.where(SpendItem.merchant == merchant)
    if source is not None:
        statement = statement.where(SpendItem.source == source)
    if status is not None:
        statement = statement.where(SpendItem.status == status)
    statement = statement.order_by(
        col(SpendItem.spent_at).desc(), col(SpendItem.created_at).desc()
    )
    return list(session.exec(statement).all())


def list_document_spend_items(
    session: Session,
    *,
    user_id: UUID,
    document_id: UUID,
    status: str | None = None,
) -> list[SpendItem]:
    statement = select(SpendItem).where(
        SpendItem.user_id == user_id,
        SpendItem.document_id == document_id,
    )
    if status is not None:
        statement = statement.where(SpendItem.status == status)
    statement = statement.order_by(col(SpendItem.line_index))
    return list(session.exec(statement).all())


def update_spend_item(
    session: Session,
    item: SpendItem,
    *,
    merchant: str | None = None,
    description: str | None = None,
    amount: Decimal | None = None,
    currency: str | None = None,
    spent_at: date | None = None,
    category: str | None = None,
    clear_description: bool = False,
    clear_category: bool = False,
    mark_edited: bool = False,
) -> SpendItem:
    if merchant is not None:
        item.merchant = merchant
    if clear_description:
        item.description = None
    elif description is not None:
        item.description = description
    if amount is not None:
        item.amount = amount
    if currency is not None:
        item.currency = currency
    if spent_at is not None:
        item.spent_at = spent_at
    if clear_category:
        item.category = None
    elif category is not None:
        item.category = category
    if mark_edited:
        item.user_edited = True
    item.updated_at = datetime.now(UTC)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def delete_spend_item(session: Session, item: SpendItem) -> None:
    session.delete(item)
    session.commit()


def upsert_drafts(
    session: Session,
    *,
    user_id: UUID,
    document_id: UUID,
    extraction_attempt_id: UUID,
    drafts: list[SpendItem],
    commit: bool = True,
) -> list[SpendItem]:
    existing = list(
        session.exec(
            select(SpendItem).where(
                SpendItem.document_id == document_id,
                SpendItem.status == SpendStatus.PENDING_REVIEW,
            )
        ).all()
    )
    by_index = {row.line_index: row for row in existing}
    incoming_indexes = {draft.line_index for draft in drafts}
    kept: list[SpendItem] = []
    for draft in drafts:
        current = by_index.get(draft.line_index)
        if current is not None and current.user_edited:
            kept.append(current)
            continue
        if current is None:
            draft.user_id = user_id
            draft.document_id = document_id
            draft.extraction_attempt_id = extraction_attempt_id
            draft.source = SpendSource.DOCUMENT
            draft.status = SpendStatus.PENDING_REVIEW
            session.add(draft)
            kept.append(draft)
            continue
        current.merchant = draft.merchant
        current.description = draft.description
        current.amount = draft.amount
        current.currency = draft.currency
        current.spent_at = draft.spent_at
        current.category = draft.category
        current.extraction_attempt_id = extraction_attempt_id
        current.status = SpendStatus.PENDING_REVIEW
        current.updated_at = datetime.now(UTC)
        session.add(current)
        kept.append(current)
    for row in existing:
        if row.user_edited:
            continue
        if row.line_index not in incoming_indexes:
            session.delete(row)
    if commit:
        session.commit()
        for item in kept:
            session.refresh(item)
    else:
        session.flush()
    return kept


def confirm_document_items(
    session: Session,
    *,
    user_id: UUID,
    document_id: UUID,
    item_ids: list[UUID],
) -> list[SpendItem]:
    rows = list_document_spend_items(session, user_id=user_id, document_id=document_id)
    wanted = set(item_ids)
    confirmed: list[SpendItem] = []
    now = datetime.now(UTC)
    for row in rows:
        if row.id not in wanted:
            continue
        if row.status != SpendStatus.PENDING_REVIEW:
            continue
        row.status = SpendStatus.CONFIRMED
        row.updated_at = now
        session.add(row)
        confirmed.append(row)
    session.commit()
    for row in confirmed:
        session.refresh(row)
    return confirmed
