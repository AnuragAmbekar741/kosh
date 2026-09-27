from datetime import date

from ai.schemas import LineItem, ReceiptExtraction
from worker.consumers.extraction.services.validator import receipt_totals_mismatch


def test_sum_check() -> None:
    extraction = ReceiptExtraction(
        document_kind="receipt",
        merchant="Walmart",
        purchased_at=date(2024, 10, 19),
        currency="USD",
        subtotal="56.71",
        tax=None,
        total="56.71",
        line_items=[
            LineItem(
                raw_description="A",
                normalized_name="A",
                quantity="1",
                unit_price="10.00",
                line_total="10.00",
                confidence=1,
                requires_review=False,
            )
        ],
    )
    assert receipt_totals_mismatch(extraction)
