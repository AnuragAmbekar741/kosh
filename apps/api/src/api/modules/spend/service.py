from calendar import month_name, monthrange
from collections.abc import Sequence
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlmodel import Session
from storage.crud.catalog import create_user_item, name_key, save_alias
from storage.crud.item_matching import lines_with_text, set_line_item
from storage.crud.spend import (
    create_spend_item,
    delete_spend_item,
    get_spend_item,
    list_spend_items,
    list_spend_items_page,
    update_spend_item,
    user_has_confirmed_spend,
)
from storage.models.catalog import AliasKind, AliasSource, CatalogItem
from storage.models.spend import (
    CategorySource,
    ItemMethod,
    ItemStatus,
    SpendItem,
    SpendSource,
    SpendStatus,
)

from api.common.errors import (
    CatalogItemNotFoundError,
    LineNotMatchableError,
    NotACatalogFamilyError,
    NotFoundError,
)
from api.modules.spend.presenter import to_summary
from api.modules.spend.schemas import (
    ItemCorrection,
    SpendItemCreate,
    SpendItemUpdate,
    SpendPeriod,
    SpendSummary,
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
        category_source=CategorySource.USER,
        source=SpendSource.MANUAL,
        status=SpendStatus.CONFIRMED,
    )


def list_items(
    session: Session,
    user_id: UUID,
    *,
    skip: int,
    limit: int,
    spent_from: date | None,
    spent_to: date | None,
    category: Sequence[str] | None,
    merchant: str | None,
    source: str | None,
    q: str | None,
) -> tuple[list[SpendItem], int]:
    return list_spend_items_page(
        session,
        user_id=user_id,
        skip=skip,
        limit=limit,
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
        category=fields.get("category"),
        amount=fields.get("amount"),
        currency=fields.get("currency"),
        spent_at=fields.get("spent_at"),
        clear_description="description" in fields and fields["description"] is None,
        mark_edited=True,
        requeue_item="description" in fields or "merchant" in fields,
    )


def correct_item(
    session: Session, user_id: UUID, item_id: UUID, body: ItemCorrection
) -> SpendItem:
    """Set a line's catalog item by hand and learn from it.

    The answer is saved for this text (at this merchant and at any merchant)
    and for the line's store code, and the user's other finished lines with
    the same text follow, unless they were corrected by hand themselves.
    """
    line = get(session, user_id, item_id)
    if line.item_status == ItemStatus.NONE:
        raise LineNotMatchableError
    row: CatalogItem | None = None
    if body.new_item is not None:
        family = _visible_row(session, user_id, body.new_item.family_id)
        if family.parent_id is not None:
            raise NotACatalogFamilyError
        row = create_user_item(
            session, user_id=user_id, family=family, name=body.new_item.name
        )
    elif body.catalog_item_id is not None:
        row = _visible_row(session, user_id, body.catalog_item_id)
    status = ItemStatus.RESOLVED if row else ItemStatus.NOT_PRODUCT
    category = (row.parent.category if row.parent else row.category) if row else None
    row_id = row.id if row else None
    set_line_item(
        session,
        line,
        status=status,
        catalog_item_id=row_id,
        method=ItemMethod.USER,
        category=category,
    )
    merchant_key = name_key(line.merchant)
    text_key = name_key(line.description or "")
    answers = [(AliasKind.TEXT, merchant, text_key) for merchant in (merchant_key, "")]
    if line.item_code:
        answers.append((AliasKind.CODE, merchant_key, line.item_code.lower()))
    for kind, merchant, key in answers:
        if key:
            save_alias(
                session,
                user_id=user_id,
                kind=kind,
                merchant_key=merchant,
                key=key,
                catalog_item_id=row_id,
                source=AliasSource.USER,
            )
    if text_key:
        for other in lines_with_text(
            session, user_id=user_id, text_key=text_key, exclude_id=line.id
        ):
            set_line_item(
                session,
                other,
                status=status,
                catalog_item_id=row_id,
                method=ItemMethod.ALIAS,
                category=category,
            )
    session.commit()
    session.refresh(line)
    return line


def _visible_row(session: Session, user_id: UUID, row_id: UUID) -> CatalogItem:
    row = session.get(CatalogItem, row_id)
    if row is None or row.retired or row.user_id not in (None, user_id):
        raise CatalogItemNotFoundError
    return row


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
    total = sum((item.amount for item in filtered), Decimal(0))
    return to_summary(
        total=total,
        bill_count=_bill_count(filtered),
        item_count=len(filtered),
        has_spend=user_has_confirmed_spend(session, user_id=user_id),
        comparison=_comparison(
            session, user_id, spent_from, category, source, q, period, total
        ),
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
