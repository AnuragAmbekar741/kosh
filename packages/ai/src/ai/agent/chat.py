"""One chat call with tools for the agent; the runtime never touches the SDK."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, Literal, NotRequired, TypedDict, cast

from openai import APIError
from pydantic import BaseModel

from ai import openrouter
from ai.openrouter import is_retryable, strict_json_schema
from ai.settings import get_settings

__all__ = [
    "ChatError",
    "ChatMessage",
    "ChatTurn",
    "RetryableChatError",
    "ToolCall",
    "chat_with_tools",
    "function_tool",
]


class _Function(TypedDict):
    name: str
    arguments: str  # JSON text, exactly as the model wrote it


class ToolCall(TypedDict):
    id: str
    type: Literal["function"]
    function: _Function


class ChatMessage(TypedDict):
    """An OpenAI chat message, the shape stored in `agent_messages`."""

    role: Literal["system", "user", "assistant", "tool"]
    content: str | None
    tool_calls: NotRequired[list[ToolCall]]
    tool_call_id: NotRequired[str]


@dataclass(frozen=True)
class ChatTurn:
    message: ChatMessage  # the assistant message, ready to save and replay
    model: str
    provider: str | None
    prompt_tokens: int
    completion_tokens: int
    cost_usd: str | None

    @property
    def tool_calls(self) -> list[ToolCall]:
        return self.message.get("tool_calls", [])


class ChatError(Exception):
    pass


class RetryableChatError(ChatError):
    pass


def function_tool(name: str, description: str, args: type[BaseModel]) -> dict[str, Any]:
    """A tool definition in the OpenAI format, parameters from a Pydantic model."""
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": strict_json_schema(args),
        },
    }


def chat_with_tools(
    messages: Sequence[ChatMessage],
    tools: Sequence[dict[str, Any]],
    *,
    model: str | None = None,
    max_tokens: int = 800,
) -> ChatTurn:
    """One model step: reply text, tool calls, or both.

    Rate limits, timeouts and 5xx raise RetryableChatError; other API errors
    and an empty answer raise ChatError.
    """
    settings = get_settings()
    model = model or settings.openrouter_agent_model or settings.openrouter_model
    optional: dict[str, Any] = {"tools": list(tools)} if tools else {}
    try:
        response = openrouter.client().chat.completions.create(
            model=model,
            messages=cast(Any, list(messages)),
            max_tokens=max_tokens,
            **optional,
            extra_body={
                # Only route to providers that honour `tools`; ask for the cost.
                "provider": {"require_parameters": True},
                "usage": {"include": True},
            },
        )
    except APIError as exc:
        if is_retryable(exc):
            raise RetryableChatError(f"openrouter error: {exc}") from exc
        raise ChatError(f"openrouter error: {exc}") from exc
    if not response.choices:
        raise ChatError("empty model response")
    choice = response.choices[0].message
    calls: list[ToolCall] = [
        {
            "id": call.id,
            "type": "function",
            "function": {
                "name": call.function.name,
                "arguments": call.function.arguments or "{}",
            },
        }
        for call in choice.tool_calls or []
        if call.type == "function"
    ]
    if not choice.content and not calls:
        raise ChatError("empty model response")
    message: ChatMessage = {"role": "assistant", "content": choice.content or None}
    if calls:
        message["tool_calls"] = calls
    usage = response.usage
    cost = getattr(usage, "cost", None) if usage else None
    return ChatTurn(
        message=message,
        model=response.model or model,
        provider=getattr(response, "provider", None),
        prompt_tokens=(usage.prompt_tokens or 0) if usage else 0,
        completion_tokens=(usage.completion_tokens or 0) if usage else 0,
        cost_usd=None if cost is None else str(cost),
    )
