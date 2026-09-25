from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

__all__ = [
    "SCHEMA_VERSION",
    "Category",
    "Extraction",
    "LineItem",
    "ReceiptExtraction",
    "StatementExtraction",
    "Transaction",
]

SCHEMA_VERSION = 2

Category = Literal[
    "Food",
    "Transport",
    "Housing",
    "Entertainment",
    "Shopping",
    "Health",
    "Utilities",
    "Travel",
    "Other",
]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


MoneyText = Annotated[str, Field(pattern=r"^(?:0|[1-9]\d*)(?:\.\d{1,4})?$")]
PositiveDecimalText = Annotated[
    str, Field(pattern=r"^(?:0*[1-9]\d*)(?:\.\d+)?$|^0*\.0*[1-9]\d*$")
]
CurrencyCode = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]


class LineItem(_Strict):
    raw_description: str
    normalized_name: str | None = None
    upc: str | None = None
    quantity: PositiveDecimalText | None = None
    unit_price: MoneyText | None = None
    line_total: MoneyText
    category: Category
    confidence: float = Field(ge=0, le=1)
    requires_review: bool


class ReceiptExtraction(_Strict):
    document_kind: Literal["receipt"]
    merchant: str
    store_location: str | None = None
    purchased_at: date
    currency: CurrencyCode
    subtotal: MoneyText | None = None
    tax: MoneyText | None = None
    total: MoneyText
    category: Category
    line_items: list[LineItem] = Field(min_length=1)


class Transaction(_Strict):
    merchant: str
    amount: MoneyText
    spent_at: date
    direction: Literal["debit", "credit"] = "debit"
    category: Category
    confidence: float = Field(ge=0, le=1)
    requires_review: bool = False


class StatementExtraction(_Strict):
    document_kind: Literal["statement"]
    institution: str | None = None
    period_start: date | None = None
    period_end: date | None = None
    currency: CurrencyCode
    transactions: list[Transaction]


Extraction = Annotated[
    ReceiptExtraction | StatementExtraction, Field(discriminator="document_kind")
]
