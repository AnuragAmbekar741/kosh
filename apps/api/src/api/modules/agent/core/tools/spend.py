"""Spend tools: totals and individual lines from the confirmed ledger."""

from datetime import date
from typing import Any
from uuid import UUID

from pydantic import Field, model_validator
from storage.models.spend import Category

from api.modules.agent.core.tools.base import Args, Tool, ToolContext, line
from api.modules.spend import analytics
from api.modules.spend import service as spend
from api.modules.spend.presenter import to_public

__all__ = ["TOOLS", "ListArgs", "SpendItemArgs", "SummaryArgs"]


class _Filters(Args):
    date_from: date | None = Field(
        default=None,
        description="First day to include, YYYY-MM-DD. Null means from the first record.",
    )
    date_to: date | None = Field(
        default=None,
        description="Last day to include, YYYY-MM-DD. Null means up to today.",
    )
    categories: list[Category] | None = Field(
        default=None, description="Only these categories. Null means all."
    )
    search: str | None = Field(
        default=None,
        max_length=100,
        description="Case-insensitive text in the merchant or line description, "
        "for example 'starbucks' or 'milk'. Null means no text filter.",
    )

    @model_validator(mode="after")
    def _dates_in_order(self) -> _Filters:
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("date_from is after date_to")
        return self


class SummaryArgs(_Filters):
    currency: str | None = Field(
        default=None,
        pattern=r"^[A-Z]{3}$",
        description="Three-letter currency code. Null means the most used one.",
    )


class ListArgs(_Filters):
    limit: int = Field(default=20, ge=1, le=50, description="Rows to return, 1-50.")
    offset: int = Field(default=0, ge=0, description="Rows to skip, for paging.")


class SpendItemArgs(Args):
    item_id: UUID = Field(description="id of a spend line from list_spend_items.")


def _summary(ctx: ToolContext, args: SummaryArgs) -> dict[str, Any]:
    result = analytics.analyze(
        ctx.session,
        ctx.user_id,
        spent_from=args.date_from,
        spent_to=args.date_to,
        category=args.categories,
        merchant=None,
        source=None,
        q=args.search,
        currency=args.currency,
    )
    data = result.model_dump(mode="json", exclude={"weekdays", "has_spend"})
    data["trend"] = [p for p in data["trend"] if p["total"] != "0.00"]
    if result.comparison is not None:
        # The model quotes the difference instead of subtracting.
        data["comparison"]["change"] = str(
            result.total - result.comparison.previous_total
        )
    return data


def _list_items(ctx: ToolContext, args: ListArgs) -> dict[str, Any]:
    rows, total = spend.list_items(
        ctx.session,
        ctx.user_id,
        skip=args.offset,
        limit=args.limit,
        spent_from=args.date_from,
        spent_to=args.date_to,
        category=args.categories,
        merchant=None,
        source=None,
        q=args.search,
    )
    return {"total_count": total, "items": [line(row) for row in rows]}


def _get_item(ctx: ToolContext, args: SpendItemArgs) -> dict[str, Any]:
    item = spend.get(ctx.session, ctx.user_id, args.item_id)
    return to_public(item).model_dump(mode="json", exclude={"created_at", "updated_at"})


TOOLS: dict[str, Tool] = {
    "get_spending_summary": Tool(
        "Totals for the user's confirmed spending: total, bill and line counts, "
        "breakdown by category, top merchants, largest bills, a trend over time, "
        "and the change (amount and percent) against the previous period of the "
        "same length when both dates are set. Use it for every 'how much' "
        "question; quote its numbers.",
        SummaryArgs,
        _summary,
    ),
    "list_spend_items": Tool(
        "Individual spend lines, newest first, with total_count for the filters. "
        "Use it to show or find specific purchases, not to add up totals.",
        ListArgs,
        _list_items,
    ),
    "get_spend_item": Tool(
        "One spend line by id, with its source and review status.",
        SpendItemArgs,
        _get_item,
    ),
}
