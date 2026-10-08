"""OpenRouter plumbing shared by extraction, item matching and the agent."""

import copy
import json
from typing import Any, cast

from openai import APIError, OpenAI
from pydantic import TypeAdapter, ValidationError

from ai.settings import get_settings

__all__ = [
    "ExtractError",
    "ExtractMeta",
    "RetryableExtractError",
    "chat_json",
    "client",
    "is_retryable",
    "strict_json_schema",
]


def client() -> OpenAI:
    """The one place an OpenRouter client is built; tests replace this."""
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=get_settings().require_openrouter(),
    )


class ExtractError(Exception):
    pass


class RetryableExtractError(ExtractError):
    pass


class ExtractMeta:
    def __init__(
        self,
        *,
        model: str,
        provider: str | None,
        prompt_tokens: int | None,
        completion_tokens: int | None,
    ) -> None:
        self.model = model
        self.provider = provider
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


def strict_json_schema(target: Any) -> dict[str, Any]:
    schema = TypeAdapter(target).json_schema()
    _force_additional_properties_false(schema)
    schema = _inline_refs(schema)
    _require_all_properties(schema)
    _strip_defaults(schema)
    return schema


def _force_additional_properties_false(node: object) -> None:
    if isinstance(node, dict):
        if "properties" in node:
            node.setdefault("additionalProperties", False)
        for value in node.values():
            _force_additional_properties_false(value)
    elif isinstance(node, list):
        for value in node:
            _force_additional_properties_false(value)


def _inline_refs(schema: dict[str, Any]) -> dict[str, Any]:
    defs = schema.get("$defs", {})
    resolved = _resolve_refs(schema, defs)
    resolved.pop("$defs", None)
    resolved.pop("discriminator", None)
    return resolved


def _resolve_refs(node: object, defs: dict[str, Any]) -> Any:
    if isinstance(node, dict):
        ref = node.get("$ref")
        if isinstance(ref, str) and set(node) <= {"$ref"}:
            name = ref.rsplit("/", 1)[-1]
            return _resolve_refs(copy.deepcopy(defs[name]), defs)
        return {
            key: _resolve_refs(value, defs)
            for key, value in node.items()
            if key != "$defs"
        }
    if isinstance(node, list):
        return [_resolve_refs(value, defs) for value in node]
    return node


def _require_all_properties(node: object) -> None:
    if isinstance(node, dict):
        props = node.get("properties")
        if isinstance(props, dict):
            node["required"] = list(props)
        for value in node.values():
            _require_all_properties(value)
    elif isinstance(node, list):
        for value in node:
            _require_all_properties(value)


def _strip_defaults(node: object) -> None:
    if isinstance(node, dict):
        node.pop("default", None)
        for value in node.values():
            _strip_defaults(value)
    elif isinstance(node, list):
        for value in node:
            _strip_defaults(value)


def is_retryable(exc: APIError) -> bool:
    """Timeouts, conflicts, rate limits, 5xx, and errors with no status code."""
    status_code = getattr(exc, "status_code", None)
    return status_code is None or status_code in {408, 409, 429} or status_code >= 500


def chat_json(
    content: list[dict[str, Any]],
    *,
    target: Any,
    name: str,
    model: str,
    extra_body: dict[str, Any] | None = None,
) -> tuple[Any, ExtractMeta]:
    """One OpenRouter chat call that must answer with strict JSON for `target`.

    Rate limits, timeouts and 5xx raise RetryableExtractError; other API
    errors and invalid output raise ExtractError.
    """
    try:
        response = client().chat.completions.create(
            model=model,
            messages=cast(Any, [{"role": "user", "content": content}]),
            response_format=cast(
                Any,
                {
                    "type": "json_schema",
                    "json_schema": {
                        "name": name,
                        "strict": True,
                        "schema": strict_json_schema(target),
                    },
                },
            ),
            extra_body={"provider": {"require_parameters": True}, **(extra_body or {})},
        )
    except APIError as exc:
        if is_retryable(exc):
            raise RetryableExtractError(f"openrouter error: {exc}") from exc
        raise ExtractError(f"openrouter error: {exc}") from exc
    raw = response.choices[0].message.content
    if not raw:
        raise ExtractError("empty model response")
    try:
        parsed = TypeAdapter(target).validate_python(json.loads(raw))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ExtractError("invalid model output") from exc
    usage = response.usage
    return parsed, ExtractMeta(
        model=response.model or model,
        provider=getattr(response, "provider", None),
        prompt_tokens=getattr(usage, "prompt_tokens", None) if usage else None,
        completion_tokens=getattr(usage, "completion_tokens", None) if usage else None,
    )
