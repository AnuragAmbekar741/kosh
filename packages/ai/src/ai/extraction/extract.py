import base64
from datetime import UTC, datetime
from typing import cast

from ai.extraction.files import inspect_and_normalize
from ai.extraction.schemas import Extraction
from ai.openrouter import ExtractMeta, chat_json
from ai.settings import get_settings

__all__ = ["extract"]

_PROMPT = (
    "Extract spending data from this financial document. "
    "Use document_kind receipt for store receipts and statement for bank or card statements. "
    "Money fields must be decimal strings such as 56.71. "
    "Dates must be ISO 8601 (YYYY-MM-DD). Treat 10/19/24 as 2024-10-19 when the locale is US. "
    "When a printed year has two digits or is hard to read, choose the year that puts the "
    "date closest to today; a document is never dated after today. "
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


def extract(
    data: bytes, mime: str, *, max_upload_mb: int
) -> tuple[Extraction, ExtractMeta]:
    settings = get_settings()
    settings.require_openrouter()
    payload, mime = inspect_and_normalize(data, mime, max_upload_mb=max_upload_mb)
    prompt = f"Today is {datetime.now(UTC).date().isoformat()}. {_PROMPT}"
    content = [{"type": "text", "text": prompt}, _part(payload, mime, "document")]
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
