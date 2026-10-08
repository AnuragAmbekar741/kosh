"""Match receipt lines to catalog entries with one text-only model call per bill."""

import json
from collections.abc import Sequence
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from ai.openrouter import ExtractMeta, chat_json
from ai.settings import get_settings

__all__ = ["ItemChoice", "ItemChoices", "ItemLine", "classify_items"]

_PROMPT = (
    "You match lines from one shopping receipt to a product catalog. "
    "The catalog lists families, each followed by its items, all by slug: "
    "'family: item, item, ...'. "
    "For each line pick the most specific item that is clearly right; pick the "
    "family when the line clearly belongs to it but no item fits. "
    "Use outcome not_product for fees, deposits, bag fees, coupons, discounts, "
    "taxes, tips, gift cards, subtotals and totals. "
    "Use outcome unsure when nothing fits or you are not confident. "
    "Only use slugs that appear in the catalog; slug is null unless outcome is "
    "match. Confidence is your probability, from 0 to 1, that the answer is "
    "right. Answer with one choice per line, keeping each line's ref."
)


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ItemLine(BaseModel):
    ref: int
    text: str
    cleaned: str | None
    amount: str


class ItemChoice(_Strict):
    ref: int
    outcome: Literal["match", "not_product", "unsure"]
    slug: str | None
    confidence: float = Field(ge=0, le=1)


class ItemChoices(_Strict):
    choices: list[ItemChoice]


def classify_items(
    merchant: str, lines: Sequence[ItemLine], catalog: str
) -> tuple[list[ItemChoice], ExtractMeta]:
    """`catalog` is one 'family: item, item' line per family, by slug."""
    settings = get_settings()
    body = (
        f"{_PROMPT}\n\nMerchant: {merchant}\n\nCatalog:\n{catalog}\n\nLines:\n"
        + json.dumps([line.model_dump() for line in lines])
    )
    choices, meta = chat_json(
        [{"type": "text", "text": body}],
        target=ItemChoices,
        name="item_choices",
        model=settings.openrouter_item_model or settings.openrouter_model,
    )
    return choices.choices, meta
