"""Tools the agent can call. Each runs as the signed-in user and returns JSON text."""

import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from typing import Any, Literal
from uuid import UUID

import ai
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from sqlmodel import Session
from storage.models.spend import Category, SpendItem

from api.common.errors import NotFoundError
from api.modules.documents import presenter as document_presenter
from api.modules.documents import service as documents
from api.modules.spend import analytics
from api.modules.spend import service as spend
from api.modules.spend.presenter import to_public

__all__ = ["TOOLS", "Tool", "ToolContext", "run_tool", "tool_schemas"]

Risk = Literal["read", "write", "destructive"]


@dataclass(frozen=True)
class ToolContext:
    """Who a tool runs as. Tools take the user from here, never from arguments."""

    session: Session
    user_id: UUID


class _Args(BaseModel):
    # An argument the schema does not list (say, user_id) is an error, not ignored.
    model_config = ConfigDict(extra="forbid")


class _Filters(_Args):
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


class SpendItemArgs(_Args):
    item_id: UUID = Field(description="id of a spend line from list_spend_items.")


class DocumentsArgs(_Args):
    limit: int = Field(default=10, ge=1, le=50, description="Bills to return, 1-50.")


class DocumentArgs(_Args):
    document_id: UUID = Field(description="id of a bill from list_documents.")


_LINE_FIELDS = {
    "id",
    "merchant",
    "description",
    "amount",
    "currency",
    "spent_at",
    "category",
    "item",
    "document_id",
}
_DOCUMENT_FIELDS = {"id", "filename", "status", "source", "error", "created_at"}


def _line(item: SpendItem) -> dict[str, Any]:
    return to_public(item).model_dump(mode="json", include=_LINE_FIELDS)


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
    return {"total_count": total, "items": [_line(row) for row in rows]}


def _get_item(ctx: ToolContext, args: SpendItemArgs) -> dict[str, Any]:
    item = spend.get(ctx.session, ctx.user_id, args.item_id)
    return to_public(item).model_dump(mode="json", exclude={"created_at", "updated_at"})


def _list_documents(ctx: ToolContext, args: DocumentsArgs) -> dict[str, Any]:
    rows = documents.list_owned(ctx.session, ctx.user_id)
    return {
        "total_count": len(rows),
        "documents": [
            document_presenter.to_summary(row).model_dump(
                mode="json", include=_DOCUMENT_FIELDS
            )
            for row in rows[: args.limit]
        ],
    }


def _get_document(ctx: ToolContext, args: DocumentArgs) -> dict[str, Any]:
    document = documents.get(ctx.session, ctx.user_id, args.document_id)
    detail = document_presenter.to_detail(ctx.session, ctx.user_id, document)
    data = detail.model_dump(mode="json", include=_DOCUMENT_FIELDS)
    data["drafts"] = [
        draft.model_dump(mode="json", include=_LINE_FIELDS) for draft in detail.drafts
    ]
    return data


@dataclass(frozen=True)
class Tool:
    description: str
    args: type[_Args]
    handler: Callable[[ToolContext, Any], dict[str, Any]]
    risk: Risk = "read"


TOOLS: dict[str, Tool] = {
    "get_spending_summary": Tool(
        "Totals for the user's confirmed spending: total, bill and line counts, "
        "breakdown by category, top merchants, largest bills, a trend over time, "
        "and the change against the previous period of the same length when both "
        "dates are set. Use it for every 'how much' question; quote its numbers.",
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
    "list_documents": Tool(
        "The user's uploaded bills and manual bills, newest first, with "
        "processing status (uploaded, processing, ready, failed).",
        DocumentsArgs,
        _list_documents,
    ),
    "get_document": Tool(
        "One bill by id: its status and the draft lines waiting for review.",
        DocumentArgs,
        _get_document,
    ),
}


def tool_schemas() -> list[dict[str, Any]]:
    return [
        ai.function_tool(name, tool.description, tool.args)
        for name, tool in TOOLS.items()
    ]


def run_tool(ctx: ToolContext, name: str, arguments: str) -> str:
    """Run one tool call; the result is the content of the `tool` message.

    Mistakes the model can fix (unknown tool, bad arguments, missing row)
    come back as {"error": ...}. Anything else raises.
    """
    tool = TOOLS.get(name)
    if tool is None:
        return _json({"error": f"unknown tool: {name}"})
    if tool.risk != "read":
        raise RuntimeError("write tools run only through a confirmed pending action")
    try:
        args = tool.args.model_validate_json(arguments or "{}")
    except ValidationError as exc:
        return _json(
            {
                "error": "invalid arguments",
                "details": exc.errors(
                    include_url=False, include_context=False, include_input=False
                ),
            }
        )
    try:
        return _json(tool.handler(ctx, args))
    except NotFoundError:
        return _json({"error": "not found"})


def _json(data: dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"), default=str)
