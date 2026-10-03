from decimal import Decimal

from storage.models.spend import SpendItem

from api.modules.spend.schemas import (
    SpendItemCatalog,
    SpendItemPublic,
    SpendSummary,
    SpendSummaryComparison,
)

_CENTS = Decimal("0.01")


def to_public(item: SpendItem) -> SpendItemPublic:
    return SpendItemPublic(
        id=item.id,
        merchant=item.merchant,
        description=item.description,
        amount=item.amount,
        currency=item.currency,
        spent_at=item.spent_at,
        category=item.category,
        item=_catalog_item(item),
        item_status=item.item_status,
        source=item.source,
        status=item.status,
        document_id=item.document_id,
        line_index=item.line_index,
        user_edited=item.user_edited,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _catalog_item(item: SpendItem) -> SpendItemCatalog | None:
    row = item.catalog_item
    if row is None:
        return None
    return SpendItemCatalog(
        id=row.id, name=row.name, family=row.parent.name if row.parent else None
    )


def to_summary(
    *,
    total: Decimal,
    bill_count: int,
    item_count: int,
    has_spend: bool,
    comparison: SpendSummaryComparison | None,
) -> SpendSummary:
    return SpendSummary(
        currency="USD",
        total=money(total),
        bill_count=bill_count,
        item_count=item_count,
        avg_per_bill=money(total / bill_count) if bill_count else Decimal("0.00"),
        has_spend=has_spend,
        comparison=comparison,
    )


def money(value: Decimal) -> Decimal:
    return value.quantize(_CENTS)
