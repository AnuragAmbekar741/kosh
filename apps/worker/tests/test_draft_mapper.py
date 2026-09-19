from datetime import date
from uuid import uuid4

from ai.schemas import LineItem, ReceiptExtraction, StatementExtraction, Transaction
from worker.consumers.extraction.services.draft_mapper import drafts


def test_receipt_total_and_line_categories() -> None:
    extraction = ReceiptExtraction(
        document_kind="receipt",
        merchant="Walmart",
        purchased_at=date(2024, 10, 19),
        currency="USD",
        total="30.00",
        category="Food",
        line_items=[
            LineItem(
                raw_description="MILK",
                line_total="10.00",
                category="Food",
                confidence=1,
                requires_review=False,
            ),
            LineItem(
                raw_description="SOAP",
                line_total="20.00",
                category="Health",
                confidence=1,
                requires_review=False,
            ),
        ],
    )
    rows = drafts(uuid4(), extraction)
    total = next(row for row in rows if row.line_index is None)
    assert total.category == "Food"
    assert [row.category for row in rows if row.line_index is not None] == [
        "Food",
        "Health",
    ]


def test_statement_skips_credits_and_copies_category() -> None:
    extraction = StatementExtraction(
        document_kind="statement",
        currency="USD",
        transactions=[
            Transaction(
                merchant="Starbucks",
                amount="4.50",
                spent_at=date(2024, 10, 19),
                category="Food",
                confidence=0.9,
            ),
            Transaction(
                merchant="Refund",
                amount="4.50",
                spent_at=date(2024, 10, 20),
                direction="credit",
                category="Food",
                confidence=0.9,
            ),
        ],
    )
    rows = drafts(uuid4(), extraction)
    assert len(rows) == 1
    assert rows[0].merchant == "Starbucks"
    assert rows[0].category == "Food"
