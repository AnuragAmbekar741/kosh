from decimal import Decimal

from ai.schemas import ReceiptExtraction


def receipt_totals_mismatch(extraction: ReceiptExtraction) -> bool:
    total = Decimal(extraction.total)
    lines = sum(
        (Decimal(item.line_total) for item in extraction.line_items), Decimal(0)
    )
    tax = Decimal(extraction.tax) if extraction.tax else Decimal(0)
    return abs(lines + tax - total) > Decimal("0.01")


def warning_for(extraction: object) -> str | None:
    if isinstance(extraction, ReceiptExtraction) and receipt_totals_mismatch(
        extraction
    ):
        return "line items plus tax differ from total"
    return None
