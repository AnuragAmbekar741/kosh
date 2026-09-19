from calendar import month_name, monthrange
from collections import defaultdict
from collections.abc import Sequence
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlmodel import Session
from storage.crud.spend import (
    create_spend_item,
    delete_spend_item,
    get_spend_item,
    list_spend_items,
    update_spend_item,
    user_has_confirmed_spend,
)
from storage.models.spend import SpendItem, SpendSource, SpendStatus

from api.common.errors import NotFoundError
from api.modules.spend.presenter import money, to_summary
from api.modules.spend.schemas import (
    SpendItemCreate,
    SpendItemUpdate,
    SpendPeriod,
    SpendSummary,
    SpendSummaryCategory,
    SpendSummaryComparison,
)


def create(session: Session, user_id: UUID, body: SpendItemCreate) -> SpendItem:
    return create_spend_item(
        session,
        user_id=user_id,
        merchant=body.merchant,
        description=body.description,
        amount=body.amount,
        currency=body.currency,
        spent_at=body.spent_at,
        category=body.category,
        source=SpendSource.MANUAL,
        status=SpendStatus.CONFIRMED,
    )


def list_items(
    session: Session,
    user_id: UUID,
    *,
    spent_from: date | None,
    spent_to: date | None,
    category: Sequence[str] | None,
    merchant: str | None,
    source: str | None,
    q: str | None,
) -> list[SpendItem]:
    return list_spend_items(
        session,
        user_id=user_id,
        spent_from=spent_from,
        spent_to=spent_to,
        category=category,
        merchant=merchant,
        source=source,
        q=q,
    )


def get(session: Session, user_id: UUID, item_id: UUID) -> SpendItem:
    item = get_spend_item(session, user_id=user_id, item_id=item_id)
    if item is None:
        raise NotFoundError
    return item


def update(
    session: Session, user_id: UUID, item_id: UUID, body: SpendItemUpdate
) -> SpendItem:
    item = get(session, user_id, item_id)
    fields = body.model_dump(exclude_unset=True)
    return update_spend_item(
        session,
        item,
        merchant=fields.get("merchant"),
        description=fields.get("description"),
        amount=fields.get("amount"),
        currency=fields.get("currency"),
        spent_at=fields.get("spent_at"),
        category=fields.get("category"),
        clear_description="description" in fields and fields["description"] is None,
        clear_category="category" in fields and fields["category"] is None,
        mark_edited=True,
    )


def delete(session: Session, user_id: UUID, item_id: UUID) -> None:
    delete_spend_item(session, get(session, user_id, item_id))


def summarize(
    session: Session,
    user_id: UUID,
    *,
    spent_from: date | None,
    spent_to: date | None,
    category: Sequence[str] | None,
    source: str | None,
    q: str | None,
    period: SpendPeriod | None,
) -> SpendSummary:
    filtered = list_spend_items(
        session,
        user_id=user_id,
        spent_from=spent_from,
        spent_to=spent_to,
        category=category,
        source=source,
        q=q,
    )
    mix_items = (
        filtered
        if not category
        else list_spend_items(
            session,
            user_id=user_id,
            spent_from=spent_from,
            spent_to=spent_to,
            source=source,
            q=q,
        )
    )
    total = sum((item.amount for item in filtered), Decimal(0))
    return to_summary(
        total=total,
        bill_count=_bill_count(filtered),
        item_count=len(filtered),
        has_spend=user_has_confirmed_spend(session, user_id=user_id),
        comparison=_comparison(
            session, user_id, spent_from, category, source, q, period, total
        ),
        categories=_categories(mix_items),
    )


def _bill_count(items: Sequence[SpendItem]) -> int:
    seen: set[UUID] = set()
    nulls = 0
    for item in items:
        if item.document_id is None:
            nulls += 1
        else:
            seen.add(item.document_id)
    return len(seen) + nulls


def _categories(items: Sequence[SpendItem]) -> list[SpendSummaryCategory]:
    period_total = sum((item.amount for item in items), Decimal(0))
    amounts: dict[str, Decimal] = defaultdict(lambda: Decimal(0))
    for item in items:
        if item.category:
            amounts[item.category] += item.amount
    rows = [
        SpendSummaryCategory(
            name=name,
            amount=money(amount),
            percent=float(amount / period_total * 100) if period_total else 0.0,
        )
        for name, amount in amounts.items()
        if amount > 0
    ]
    rows.sort(key=lambda row: row.amount, reverse=True)
    return rows


def _comparison(
    session: Session,
    user_id: UUID,
    spent_from: date | None,
    category: Sequence[str] | None,
    source: str | None,
    q: str | None,
    period: SpendPeriod | None,
    this_total: Decimal,
) -> SpendSummaryComparison | None:
    if period != "month" or spent_from is None:
        return None
    prev_from, prev_to = _previous_month(spent_from)
    previous = list_spend_items(
        session,
        user_id=user_id,
        spent_from=prev_from,
        spent_to=prev_to,
        category=category,
        source=source,
        q=q,
    )
    prev_total = sum((item.amount for item in previous), Decimal(0))
    if prev_total <= 0:
        return None
    return SpendSummaryComparison(
        delta_percent=float((this_total - prev_total) / prev_total * 100),
        previous_label=month_name[prev_from.month],
    )


def _previous_month(spent_from: date) -> tuple[date, date]:
    year, month = (
        (spent_from.year - 1, 12)
        if spent_from.month == 1
        else (spent_from.year, spent_from.month - 1)
    )
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])
