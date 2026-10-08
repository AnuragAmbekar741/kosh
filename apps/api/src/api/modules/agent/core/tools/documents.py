"""Document tools: the user's bills and the draft lines waiting for review."""

from typing import Any
from uuid import UUID

from pydantic import Field

from api.modules.agent.core.tools.base import LINE_FIELDS, Args, Tool, ToolContext
from api.modules.documents import presenter as document_presenter
from api.modules.documents import service as documents

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
    return data


TOOLS: dict[str, Tool] = {
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
