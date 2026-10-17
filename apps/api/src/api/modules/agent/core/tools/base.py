"""What every tool shares: who it runs as, its definition, strict arguments."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from sqlmodel import Session
from storage.models.spend import SpendItem

from api.modules.spend.presenter import to_public

__all__ = ["LINE_FIELDS", "Args", "Risk", "Tool", "ToolContext", "ToolRefused", "line"]

Risk = Literal["read", "write", "destructive"]


@dataclass(frozen=True)
class ToolContext:
    """Who a tool runs as. Tools take the user from here, never from arguments."""

    session: Session
    user_id: UUID


class Args(BaseModel):
    # An argument the schema does not list (say, user_id) is an error, not ignored.
    model_config = ConfigDict(extra="forbid")


@dataclass(frozen=True)
class Tool:
    """A read tool's handler returns its result.

    A write or destructive tool's handler is only a check: it must not change
    anything. It returns the card to show the user (`kind` plus what the card
    needs) or raises `ToolRefused`; `call_tool` never runs the write itself.
    The user's tap does, through the same endpoint the UI uses.
    """

    description: str
    args: type[Args]
    handler: Callable[[ToolContext, Any], dict[str, Any]]
    risk: Risk = "read"


class ToolRefused(Exception):
    """The request can't go ahead; the message goes back to the model."""


# The fields of a spend line the model needs; the rest is UI bookkeeping.
LINE_FIELDS = {
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


def line(item: SpendItem) -> dict[str, Any]:
    return to_public(item).model_dump(mode="json", include=LINE_FIELDS)
