"""Every tool the agent can call, and the one way to run them.

Each domain file (spend, documents) defines its argument models, handlers and
a TOOLS dict; this module joins them. A new domain is one file and one line.
"""

import json
from dataclasses import dataclass
from typing import Any

import ai
from pydantic import ValidationError

from api.common.errors import NotFoundError
from api.modules.agent.core.tools import documents, spend
from api.modules.agent.core.tools.base import Tool, ToolContext, ToolRefused

__all__ = [
    "AWAITING_USER",
    "TOOLS",
    "Tool",
    "ToolContext",
    "ToolResult",
    "call_tool",
    "run_tool",
    "tool_schemas",
]

AWAITING_USER = "awaiting_user"

TOOLS: dict[str, Tool] = {**spend.TOOLS, **documents.TOOLS}


def tool_schemas() -> list[dict[str, Any]]:
    return [
        ai.function_tool(name, tool.description, tool.args)
        for name, tool in TOOLS.items()
    ]


@dataclass(frozen=True)
class ToolResult:
    """The `tool` message content, and the card to show when a write awaits the user."""

    content: str
    action: dict[str, Any] | None = None


def run_tool(ctx: ToolContext, name: str, arguments: str) -> str:
    """Run one tool call; the result is the content of the `tool` message."""
    return call_tool(ctx, name, arguments).content


def call_tool(ctx: ToolContext, name: str, arguments: str) -> ToolResult:
    """Run one tool call the way the guardrail allows.

    Reads run. A write is never executed here: its handler only checks it, and
    the model hears that it awaits the user while the client gets the card.
    Mistakes the model can fix (unknown tool, bad arguments, missing row, a
    refused write) come back as {"error": ...}. Anything else raises.
    """
    tool = TOOLS.get(name)
    if tool is None:
        return ToolResult(_json({"error": f"unknown tool: {name}"}))
    try:
        args = tool.args.model_validate_json(arguments or "{}")
    except ValidationError as exc:
        return ToolResult(
            _json(
                {
                    "error": "invalid arguments",
                    "details": exc.errors(
                        include_url=False, include_context=False, include_input=False
                    ),
                }
            )
        )
    try:
        data = tool.handler(ctx, args)
    except NotFoundError:
        return ToolResult(_json({"error": "not found"}))
    except ToolRefused as exc:
        return ToolResult(_json({"error": str(exc)}))
    if tool.risk == "read":
        return ToolResult(_json(data))
    action = {"tool": name, **data}
    return ToolResult(
        _json(
            {
                "status": AWAITING_USER,
                "note": "Shown to the user as a card. Nothing has changed; "
                "only their tap does it.",
                "action": action,
            }
        ),
        action=action,
    )


def _json(data: dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"), default=str)
