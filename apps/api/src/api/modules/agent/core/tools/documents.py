"""Document tools: the user's bills, their draft lines, and proposing to save one."""

from collections import defaultdict
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import Field
from storage.crud import agent as agent_crud

from api.common.errors import DocumentNotReadyError, NoDraftsToConfirmError
from api.modules.agent.core.tools.base import (
    LINE_FIELDS,
    Args,
    Tool,
    ToolContext,
    ToolRefused,
)
from api.modules.documents import presenter as document_presenter
from api.modules.documents import service as documents
from api.modules.documents.services.confirm import check_confirmable
from api.modules.documents.services.duplicates import find_duplicates

__all__ = ["TOOLS", "DocumentArgs", "DocumentsArgs"]

_DOCUMENT_FIELDS = {"id", "filename", "status", "source", "error", "created_at"}


class DocumentsArgs(Args):
    limit: int = Field(default=10, ge=1, le=50, description="Bills to return, 1-50.")


class DocumentArgs(Args):
    document_id: UUID = Field(description="id of a bill from list_documents.")


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
        draft.model_dump(mode="json", include=LINE_FIELDS) for draft in detail.drafts
    ]
    # The model quotes the total instead of adding the lines up itself.
    totals: dict[str, Decimal] = defaultdict(Decimal)
    for draft in detail.drafts:
        totals[draft.currency] += draft.amount
    data["drafts_total"] = {currency: str(t) for currency, t in totals.items()}
    return data


def _confirm_document(ctx: ToolContext, args: DocumentArgs) -> dict[str, Any]:
    """Check the bill could be saved and describe its card. Saves nothing."""
    try:
        drafts = check_confirmable(
            ctx.session, user_id=ctx.user_id, document_id=args.document_id
        )
    except DocumentNotReadyError:
        raise ToolRefused(
            "this bill is still being read or could not be read"
        ) from None
    except NoDraftsToConfirmError:
        raise ToolRefused("this bill has no lines waiting to be saved") from None
    # Enforced here, not left to the prompt: only bills sent in this chat.
    attached = (
        agent_crud.attached_document_ids(
            ctx.session, conversation_id=ctx.conversation_id
        )
        if ctx.conversation_id
        else set()
    )
    if str(args.document_id) not in attached:
        raise ToolRefused(
            "only bills attached in this chat can be offered here; "
            "this one is waiting in the bell for review"
        )
    document = documents.get(ctx.session, ctx.user_id, args.document_id)
    totals: dict[str, Decimal] = defaultdict(Decimal)
    for draft in drafts:
        totals[draft.currency] += draft.amount
    duplicates = find_duplicates(
        ctx.session, user_id=ctx.user_id, document=document, drafts=drafts
    )
    first = drafts[0]
    return {
        "kind": "review_document",
        "document_id": str(document.id),
        "merchant": first.merchant,
        "spent_at": first.spent_at.isoformat(),
        "line_count": len(drafts),
        "totals": {currency: str(t) for currency, t in totals.items()},
        "possible_duplicates": len(duplicates),
    }


TOOLS: dict[str, Tool] = {
    "list_documents": Tool(
        "The user's uploaded bills and manual bills, newest first, with "
        "processing status (uploaded, processing, ready, failed).",
        DocumentsArgs,
        _list_documents,
    ),
    "get_document": Tool(
        "One bill by id: its status, the draft lines waiting for review and "
        "their total per currency.",
        DocumentArgs,
        _get_document,
    ),
    "confirm_document": Tool(
        "Offer to save a bill the user attached in this chat, once you have "
        "read it with get_document. This does not save it: the user sees a card "
        "with the lines and total and saves it with one tap. Use it once per "
        "bill. Bills not attached here are refused; point the user to the bell.",
        DocumentArgs,
        _confirm_document,
        risk="write",
    ),
}
