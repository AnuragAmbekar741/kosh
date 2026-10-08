"""Every tool the agent can call, and the one way to run them.

Each domain file (spend, documents) defines its argument models, handlers and
a TOOLS dict; this module joins them. A new domain is one file and one line.
"""

import json
from typing import Any

import ai
from pydantic import ValidationError

from api.common.errors import NotFoundError
from api.modules.agent.core.tools import documents, spend
from api.modules.agent.core.tools.base import Tool, ToolContext

__all__ = ["TOOLS", "Tool", "ToolContext", "run_tool", "tool_schemas"]

TOOLS: dict[str, Tool] = {**spend.TOOLS, **documents.TOOLS}


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
