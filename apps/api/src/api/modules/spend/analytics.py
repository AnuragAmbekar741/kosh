"""Spend analytics for the filtered ledger: one payload for every chart."""

from calendar import monthrange
from collections import Counter, defaultdict
from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlmodel import Session
from storage.crud.spend import list_spend_items, user_has_confirmed_spend
from storage.models.spend import Category, SpendItem

from api.modules.spend.presenter import money
from api.modules.spend.schemas import (
    AnalyticsBill,
    AnalyticsCategory,
    AnalyticsComparison,
    AnalyticsMerchant,
    AnalyticsTrendPoint,
    AnalyticsWeekday,
    SpendAnalytics,
    TrendBucket,
)

_TOP = 5
_ZERO = Decimal("0.00")


def analyze(
    session: Session,
    user_id: UUID,
    *,
    spent_from: date | None,
    spent_to: date | None,
    category: Sequence[str] | None,
    merchant: str | None,
    source: str | None,
    q: str | None,
    currency: str | None,
    today: date | None = None,
) -> SpendAnalytics:
    """Analytics in one currency (default: the most used); never past today."""
    # ponytail: aggregates in Python over the filtered rows, like the summary;
    # move to GROUP BY queries if one user's ledger reaches tens of thousands.
    today = today or datetime.now(UTC).date()
    filters = {"category": category, "merchant": merchant, "source": source, "q": q}
    bound = _effective_to(spent_from, spent_to, today)
    rows = list_spend_items(
        session, user_id=user_id, spent_from=spent_from, spent_to=bound, **filters
    )
    currencies = [
        code for code, _ in Counter(row.currency for row in rows).most_common()
    ]
    currency = currency or (currencies[0] if currencies else "USD")
    items = [row for row in rows if row.currency == currency]
    total = _total(items)
    bills = _bills(items)
    dates = [item.spent_at for item in items]
    start = spent_from or min(dates, default=today)
    end = max(start, bound or max(dates, default=today))
    bucket = _bucket(start, end)
    comparison = None
    if spent_from is not None and spent_to is not None:
        prev_from, prev_to = _previous_range(spent_from, spent_to, end)
        previous = _total(
            [
                row
                for row in list_spend_items(
                    session,
                    user_id=user_id,
                    spent_from=prev_from,
                    spent_to=prev_to,
                    **filters,
                )
                if row.currency == currency
            ]
        )
        comparison = AnalyticsComparison(
            previous_total=money(previous),
            delta_percent=float((total - previous) / previous * 100)
            if previous
            else None,
            previous_from=prev_from,
            previous_to=prev_to,
        )
    return SpendAnalytics(
        currency=currency,
        currencies=currencies,
        total=money(total),
        bill_count=len(bills),
        item_count=len(items),
        avg_per_bill=money(total / len(bills)) if bills else _ZERO,
        daily_average=money(total / ((end - start).days + 1)),
        has_spend=user_has_confirmed_spend(session, user_id=user_id),
        comparison=comparison,
        bucket=bucket,
        trend=_trend(items, bucket, start, end),
        categories=_categories(items, total),
        merchants=_merchants(bills),
        largest_bills=sorted(bills, key=lambda bill: bill.total, reverse=True)[:_TOP],
        weekdays=_weekdays(items),
    )


def _effective_to(
    spent_from: date | None, spent_to: date | None, today: date
) -> date | None:
    """The last day counted: today at most, unless the whole range is ahead."""
    if spent_from is not None and spent_from > today:
        return spent_to
    return today if spent_to is None or spent_to > today else spent_to


def _total(items: Sequence[SpendItem]) -> Decimal:
    return sum((item.amount for item in items), Decimal(0))


def _bills(items: Sequence[SpendItem]) -> list[AnalyticsBill]:
    """One bill per document; a loose manual row is its own bill."""
    groups: dict[UUID, list[SpendItem]] = defaultdict(list)
    for item in items:
        groups[item.document_id or item.id].append(item)
    return [
        AnalyticsBill(
            document_id=lines[0].document_id,
            merchant=lines[0].merchant,
            spent_at=max(line.spent_at for line in lines),
            total=money(_total(lines)),
            item_count=len(lines),
        )
        for lines in groups.values()
    ]


def _bucket(start: date, end: date) -> TrendBucket:
    days = (end - start).days + 1
    if days <= 31:
        return "day"
    return "week" if days <= 183 else "month"


def _bucket_start(day: date, bucket: TrendBucket) -> date:
    if bucket == "week":
        return day - timedelta(days=day.weekday())
    if bucket == "month":
        return day.replace(day=1)
    return day


def _next_bucket(day: date, bucket: TrendBucket) -> date:
    if bucket == "month":
        return _add_months(day, 1)
    return day + timedelta(days=7 if bucket == "week" else 1)


def _trend(
    items: Sequence[SpendItem], bucket: TrendBucket, start: date, end: date
) -> list[AnalyticsTrendPoint]:
    """Every bucket from start to end, empty ones as zero."""
    totals: dict[date, Decimal] = defaultdict(Decimal)
    for item in items:
        totals[_bucket_start(item.spent_at, bucket)] += item.amount
    last = _bucket_start(end, bucket)
    points = []
    cursor = _bucket_start(start, bucket)
    while cursor <= last:
        points.append(AnalyticsTrendPoint(start=cursor, total=money(totals[cursor])))
        cursor = _next_bucket(cursor, bucket)
    return points


def _categories(items: Sequence[SpendItem], total: Decimal) -> list[AnalyticsCategory]:
    totals: dict[str, Decimal] = defaultdict(Decimal)
    counts: dict[str, int] = defaultdict(int)
    for item in items:
        name = item.category or Category.OTHER
        totals[name] += item.amount
        counts[name] += 1
    return [
        AnalyticsCategory(
            category=name,
            total=money(amount),
            share=float(amount / total) if total else 0.0,
            item_count=counts[name],
        )
        for name, amount in sorted(totals.items(), key=lambda row: -row[1])
    ]


def _merchants(bills: Sequence[AnalyticsBill]) -> list[AnalyticsMerchant]:
    totals: dict[str, Decimal] = defaultdict(Decimal)
    counts: dict[str, int] = defaultdict(int)
    for bill in bills:
        totals[bill.merchant] += bill.total
        counts[bill.merchant] += 1
    ranked = sorted(totals.items(), key=lambda row: -row[1])[:_TOP]
    return [
        AnalyticsMerchant(merchant=name, total=money(amount), bill_count=counts[name])
        for name, amount in ranked
    ]


def _weekdays(items: Sequence[SpendItem]) -> list[AnalyticsWeekday]:
    totals = [Decimal(0)] * 7
    for item in items:
        totals[item.spent_at.weekday()] += item.amount
    return [
        AnalyticsWeekday(weekday=day, total=money(amount))
        for day, amount in enumerate(totals)
    ]


def _previous_range(spent_from: date, spent_to: date, end: date) -> tuple[date, date]:
    """The period just before, cut to the same elapsed length.

    Whole calendar months step back by months, so this month to date compares
    with the same days of last month; any other range steps back by its length.
    """
    elapsed = end - spent_from
    if (
        spent_from.day == 1
        and spent_to.day == monthrange(spent_to.year, spent_to.month)[1]
    ):
        months = (spent_to.year - spent_from.year) * 12 + spent_to.month
        months -= spent_from.month - 1
        prev_from = _add_months(spent_from, -months)
        prev_to = spent_from - timedelta(days=1)
        if end < spent_to:
            prev_to = min(prev_from + elapsed, prev_to)
        return prev_from, prev_to
    prev_to = spent_from - timedelta(days=1)
    return prev_to - elapsed, prev_to


def _add_months(day: date, months: int) -> date:
    """First of the month `months` away from `day`'s month."""
    index = day.year * 12 + day.month - 1 + months
    return date(index // 12, index % 12 + 1, 1)
