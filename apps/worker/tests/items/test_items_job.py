from datetime import date
from decimal import Decimal
from uuid import uuid4

import ai
import pytest
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine, select
from storage import database
from storage.crud.catalog import CatalogRow, load_shared_catalog
from storage.models.catalog import CatalogAlias, CatalogItem
from storage.models.document import Document
from storage.models.spend import SpendItem
from storage.models.user import User
from worker.jobs import JOBS
from worker.jobs.items import JOB
from worker.runtime import run_once

_CATALOG = [
    CatalogRow("chicken", None, "Chicken", (), "Groceries"),
    CatalogRow("chicken-breast", "chicken", "Chicken breast", ("chx brst",), None),
    CatalogRow("laundry-detergent", None, "Laundry detergent", (), "Household"),
    CatalogRow(
        "laundry-pods", "laundry-detergent", "Laundry pods", ("tide pods",), None
    ),
    CatalogRow("fresh-fruit", None, "Fresh fruit", (), "Groceries"),
    CatalogRow("bananas", "fresh-fruit", "Bananas", ("banana",), None),
]


@pytest.fixture(autouse=True)
def engine(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")

    @event.listens_for(engine, "connect")
    def _fks(dbapi_connection, _record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    SQLModel.metadata.create_all(engine)
    monkeypatch.setattr(database, "engine", engine)
    with Session(engine) as session:
        load_shared_catalog(session, _CATALOG)
    return engine


def _bill(engine, lines, *, merchant="Costco", user_id=None):
    with Session(engine) as session:
        if user_id is None:
            user = User(email=f"{uuid4()}@x.io", name="Ada")
            session.add(user)
            session.flush()
            user_id = user.id
        document = Document(
            user_id=user_id,
            filename="r.jpg",
            mime_type="image/jpeg",
            size_bytes=1,
            storage_key=str(uuid4()),
            content_hash="h",
            status="ready",
        )
        session.add(document)
        session.flush()
        for index, (raw, cleaned, category_source) in enumerate(lines):
            session.add(
                SpendItem(
                    user_id=user_id,
                    document_id=document.id,
                    merchant=merchant,
                    description=raw,
                    normalized_name=cleaned,
                    amount=Decimal("5.00"),
                    currency="USD",
                    spent_at=date(2026, 9, 1),
                    category="Groceries",
                    category_source=category_source,
                    source="document",
                    status="confirmed",
                    line_index=index,
                    item_status="pending",
                )
            )
        document_id = document.id
        session.commit()
        return user_id, document_id


def _lines(engine, document_id):
    with Session(engine) as session:
        return list(
            session.exec(
                select(SpendItem)
                .where(SpendItem.document_id == document_id)
                .order_by(SpendItem.line_index)
            ).all()
        )


def _slug(engine, catalog_item_id):
    with Session(engine) as session:
        row = session.get(CatalogItem, catalog_item_id) if catalog_item_id else None
        return row.slug if row else None


def _model(monkeypatch, answers):
    calls = []

    def fake(merchant, lines, catalog):
        calls.append([line.text for line in lines])
        assert "chicken: chicken-breast" in catalog
        return [
            ai.ItemChoice(ref=line.ref, **answers[line.text]) for line in lines
        ], None

    monkeypatch.setattr("ai.classify_items", fake)
    return calls


def test_items_job_is_registered_after_extraction() -> None:
    assert [job.name for job in JOBS] == ["extraction", "items"]


def test_bill_resolves_by_match_and_model_and_saves_answers(
    engine, monkeypatch
) -> None:
    calls = _model(
        monkeypatch,
        {
            "TD HE PDS": {
                "outcome": "match",
                "slug": "laundry-pods",
                "confidence": 0.95,
            },
            "BAG FEE": {"outcome": "not_product", "slug": None, "confidence": 0.99},
            "MYSTERY 1": {"outcome": "unsure", "slug": None, "confidence": 0.3},
        },
    )
    user_id, document_id = _bill(
        engine,
        [
            ("KS ORG CHX BRST", "Kirkland organic chicken breast", "extraction"),
            ("TD HE PDS", None, "extraction"),
            ("BAG FEE", None, "extraction"),
            ("MYSTERY 1", None, "extraction"),
        ],
    )
    assert run_once([JOB]) is True
    lines = _lines(engine, document_id)
    assert [line.item_status for line in lines] == [
        "resolved",
        "resolved",
        "not_product",
        "needs_review",
    ]
    assert [line.item_method for line in lines] == ["match", "model", "model", None]
    assert [_slug(engine, line.catalog_item_id) for line in lines] == [
        "chicken-breast",
        "laundry-pods",
        None,
        None,
    ]
    assert [line.category for line in lines] == [
        "Groceries",
        "Household",
        "Groceries",
        "Groceries",
    ]
    assert lines[1].category_source == "item"
    assert lines[0].description == "KS ORG CHX BRST"
    assert calls == [["TD HE PDS", "BAG FEE", "MYSTERY 1"]]

    _, second = _bill(engine, [("TD HE PDS", None, "extraction")], user_id=user_id)
    assert run_once([JOB]) is True
    line = _lines(engine, second)[0]
    assert (line.item_status, line.item_method) == ("resolved", "alias")
    assert len(calls) == 1
    with Session(engine) as session:
        assert len(session.exec(select(CatalogAlias)).all()) == 2


def test_user_set_category_is_kept(engine, monkeypatch) -> None:
    _model(monkeypatch, {})
    _, document_id = _bill(engine, [("TIDE PODS 81CT", "Tide pods", "user")])
    run_once([JOB])
    line = _lines(engine, document_id)[0]
    assert (line.item_status, line.category, line.category_source) == (
        "resolved",
        "Groceries",
        "user",
    )


def test_retryable_model_errors_put_the_bill_back(engine, monkeypatch) -> None:
    def fail(*_args):
        raise ai.RetryableExtractError("rate limited")

    monkeypatch.setattr("ai.classify_items", fail)
    _, document_id = _bill(
        engine,
        [("KS ORG CHX BRST", None, "extraction"), ("MYSTERY", None, "extraction")],
    )
    run_once([JOB])
    lines = _lines(engine, document_id)
    assert [(line.item_status, line.item_attempts) for line in lines] == [
        ("pending", 1),
        ("pending", 1),
    ]


def test_an_edit_during_matching_wins(engine, monkeypatch) -> None:
    _, document_id = _bill(engine, [("MYSTERY", None, "extraction")])

    def edit_then_answer(merchant, lines, catalog):
        with Session(engine) as session:
            line = session.exec(select(SpendItem)).one()
            line.item_status = "pending"
            line.item_claim_token = None
            session.add(line)
            session.commit()
        return [
            ai.ItemChoice(ref=0, outcome="match", slug="bananas", confidence=0.9)
        ], None

    monkeypatch.setattr("ai.classify_items", edit_then_answer)
    run_once([JOB])
    line = _lines(engine, document_id)[0]
    assert (line.item_status, line.catalog_item_id) == ("pending", None)
