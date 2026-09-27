from datetime import date
from uuid import uuid4

from ai.schemas import LineItem, ReceiptExtraction, StatementExtraction, Transaction
from worker.consumers.extraction.services.draft_mapper import drafts


def test_receipt_creates_only_line_item_drafts() -> None:
    extraction = ReceiptExtraction(
        document_kind="receipt",
        merchant="Walmart",
        purchased_at=date(2024, 10, 19),
        currency="USD",
        total="30.00",
        line_items=[
            LineItem(
                raw_description="MILK",
                line_total="10.00",
                category="Groceries",
                confidence=1,
                requires_review=False,
            ),
            LineItem(
                raw_description="SOAP",
                line_total="20.00",
                category="Household",
                confidence=1,
                requires_review=False,
            ),
        ],
    )
    rows = drafts(uuid4(), extraction)
    assert [row.line_index for row in rows] == [0, 1]


def test_statement_skips_credits() -> None:
    extraction = StatementExtraction(
        document_kind="statement",
        currency="USD",
        transactions=[
            Transaction(
                merchant="Starbucks",
                amount="4.50",
                spent_at=date(2024, 10, 19),
                category="Dining out",
                confidence=0.9,
            ),
            Transaction(
                merchant="Refund",
                amount="4.50",
                spent_at=date(2024, 10, 20),
                category="Dining out",
                direction="credit",
                confidence=0.9,
            ),
        ],
    )
    rows = drafts(uuid4(), extraction)
    assert len(rows) == 1
    assert rows[0].merchant == "Starbucks"
