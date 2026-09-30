import base64
import copy
import json
from io import BytesIO
from typing import Any, cast

from openai import APIError, OpenAI
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import TypeAdapter, ValidationError
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from ai.schemas import Extraction
from ai.settings import get_settings

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

__all__ = [
    "ExtractError",
    "ExtractMeta",
    "RetryableExtractError",
    "extract",
    "inspect_and_normalize",
    "strict_json_schema",
]

_PROMPT = (
    "Extract spending data from this financial document. "
    "Use document_kind receipt for store receipts and statement for bank or card statements. "
    "Money fields must be decimal strings such as 56.71. "
    "Dates must be ISO 8601 (YYYY-MM-DD). Treat 10/19/24 as 2024-10-19 when the locale is US. "
    "Assign every line item and transaction exactly one category by what was bought, "
    "not by the store. "
    "Groceries: food and drink bought to take home. "
    "Dining out: restaurants, cafes, bars, food delivery. "
    "Household: cleaning supplies, paper goods, batteries, kitchen and home supplies. "
    "Personal care: toiletries, cosmetics, haircuts. "
    "Health: pharmacy, medicine, vitamins, doctors, fitness. "
    "Baby & kids: diapers, formula, children's items. "
    "Pet: pet food, litter, vet. "
    "Shopping: clothing, electronics, gifts, general merchandise. "
    "Transport: fuel, parking, transit, rideshare, tolls. "
    "Housing: rent, mortgage, repairs, furniture. "
    "Utilities: electricity, water, gas, internet, phone. "
    "Entertainment: streaming, events, games. "
    "Travel: flights, hotels, car rental. "
    "Use Other only when none fit."
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


def strict_json_schema(target: Any = Extraction) -> dict[str, Any]:
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


def inspect_and_normalize(
    data: bytes, mime: str, *, max_upload_mb: int
) -> tuple[bytes, str]:
    settings = get_settings()
    max_bytes = max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise ExtractError("file exceeds upload limit")
    if mime == "application/pdf":
        _inspect_pdf(data, settings.max_pdf_pages)
        return data, mime
    if not mime.startswith("image/"):
        raise ExtractError("unsupported file type")
    return _normalize_image(data, settings.max_image_pixels)


def _inspect_pdf(data: bytes, max_pages: int) -> None:
    try:
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted:
            raise ExtractError("encrypted pdf")
        if len(reader.pages) > max_pages:
            raise ExtractError("pdf has too many pages")
    except ExtractError:
        raise
    except (PdfReadError, OSError, ValueError) as exc:
        raise ExtractError("corrupt pdf") from exc


def _normalize_image(data: bytes, max_pixels: int) -> tuple[bytes, str]:
    previous = Image.MAX_IMAGE_PIXELS
    Image.MAX_IMAGE_PIXELS = None
    try:
        image = Image.open(BytesIO(data))
        if image.width * image.height > max_pixels:
            raise ExtractError("image exceeds pixel limit")
        image.load()
    except Image.DecompressionBombError as exc:
        raise ExtractError("image exceeds pixel limit") from exc
    except (UnidentifiedImageError, OSError) as exc:
        raise ExtractError("unreadable image") from exc
    finally:
        Image.MAX_IMAGE_PIXELS = previous
    normalized = ImageOps.exif_transpose(image).convert("RGB")
    normalized.thumbnail((1600, 1600))
    out = BytesIO()
    normalized.save(out, format="JPEG", quality=85)
    return out.getvalue(), "image/jpeg"


def extract(
    data: bytes, mime: str, *, max_upload_mb: int
) -> tuple[Extraction, ExtractMeta]:
    settings = get_settings()
    settings.require_openrouter()
    payload, mime = inspect_and_normalize(data, mime, max_upload_mb=max_upload_mb)
    content = [{"type": "text", "text": _PROMPT}, _part(payload, mime, "document")]
    extraction, meta = chat_json(
        content,
        target=Extraction,
        name="extraction",
        model=settings.openrouter_model,
        extra_body={
            "plugins": [
                {"id": "file-parser", "pdf": {"engine": settings.openrouter_pdf_engine}}
            ],
        },
    )
    return cast(Extraction, extraction), meta


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
    api_key = get_settings().require_openrouter()
    client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)
    try:
        response = client.chat.completions.create(
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
        status_code = getattr(exc, "status_code", None)
        if status_code is None or status_code in {408, 409, 429} or status_code >= 500:
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


def _part(data: bytes, mime: str, filename: str) -> dict:
    encoded = base64.b64encode(data).decode("ascii")
    if mime == "application/pdf":
        return {
            "type": "file",
            "file": {
                "filename": f"{filename}.pdf",
                "file_data": f"data:application/pdf;base64,{encoded}",
            },
        }
    return {
        "type": "image_url",
        "image_url": {"url": f"data:{mime};base64,{encoded}"},
    }
