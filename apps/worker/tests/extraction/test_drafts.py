from datetime import date
from decimal import Decimal
from uuid import uuid4

from ai import LineItem, ReceiptExtraction, StatementExtraction, Transaction
from worker.jobs.extraction.drafts import to_spend_items


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
                normalized_name="Milk",
                upc="851770003920",
                quantity="2",
                unit_price="5.00",
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
    rows = to_spend_items(uuid4(), extraction)
    assert [row.line_index for row in rows] == [0, 1]
    assert [row.category for row in rows] == ["Groceries", "Household"]
    assert [row.description for row in rows] == ["MILK", "SOAP"]
    assert [row.normalized_name for row in rows] == ["Milk", None]
    assert [row.item_code for row in rows] == ["851770003920", None]
    assert [row.quantity for row in rows] == [Decimal(2), None]
    assert [row.unit_price for row in rows] == [Decimal("5.00"), None]


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
    rows = to_spend_items(uuid4(), extraction)
    assert len(rows) == 1
    assert rows[0].merchant == "Starbucks"
    assert rows[0].category == "Dining out"
