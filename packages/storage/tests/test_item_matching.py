from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlmodel import Session, select
from storage.crud.catalog import (
    CatalogRow,
    active_catalog,
    find_alias,
    load_shared_catalog,
    save_alias,
)
from storage.crud.item_matching import (
    claim_pending_bill,
    claimed_lines,
    finish_line,
    reclaim_stuck_lines,
    release_lines,
)
from storage.models.document import Document
from storage.models.spend import SpendItem
from storage.models.user import User


def _bill(
    session: Session, *, lines: int, status: str = "pending"
) -> tuple[User, Document]:
    user = User(email=f"{uuid4()}@x.io", name="Ada")
    session.add(user)
    session.flush()
    document = Document(
        user_id=user.id,
        filename="r.jpg",
        mime_type="image/jpeg",
        size_bytes=1,
        storage_key=str(uuid4()),
        content_hash="h",
        status="ready",
    )
    session.add(document)
    session.flush()
    for index in range(lines):
        session.add(
            SpendItem(
                user_id=user.id,
                document_id=document.id,
                merchant="Costco",
                description=f"LINE {index}",
                amount=Decimal("1.00"),
                currency="USD",
                spent_at=date(2026, 9, 1),
                category="Groceries",
                category_source="extraction",
                source="document",
                status="confirmed",
                line_index=index,
                item_status=status,
            )
        )
    session.commit()
    return user, document


def test_claims_every_pending_line_of_one_bill(session: Session) -> None:
    _, first = _bill(session, lines=2)
    _bill(session, lines=1)
    claim = claim_pending_bill(session)
    assert claim is not None
    document_id, token = claim
    assert document_id == first.id
    lines = claimed_lines(session, document_id, token)
    assert [line.item_status for line in lines] == ["processing", "processing"]


def test_nothing_pending_means_no_claim(session: Session) -> None:
    _bill(session, lines=1, status="none")
    assert claim_pending_bill(session) is None


def test_finish_requires_the_claim_and_respects_user_category(
    session: Session,
) -> None:
    _bill(session, lines=2)
    claim = claim_pending_bill(session)
    assert claim is not None
    document_id, token = claim
    first, second = claimed_lines(session, document_id, token)
    second.category_source = "user"
    session.add(second)
    session.commit()
    for line in (first, second):
        assert finish_line(
            session,
            line.id,
            token=token,
            status="resolved",
            method="match",
            category="Household",
        )
    assert not finish_line(session, first.id, token=uuid4(), status="failed")
    session.commit()
    session.refresh(first)
    session.refresh(second)
    assert (first.item_status, first.category, first.category_source) == (
        "resolved",
        "Household",
        "item",
    )
    assert first.item_claim_token is None
    assert (second.category, second.category_source) == ("Groceries", "user")


def test_release_retries_then_fails(session: Session) -> None:
    _bill(session, lines=1)
    for expected in ("pending", "pending", "failed"):
        claim = claim_pending_bill(session)
        assert claim is not None
        assert release_lines(session, *claim) == 1
        line = session.exec(select(SpendItem)).one()
        assert line.item_status == expected
    assert claim_pending_bill(session) is None


def test_stuck_lines_are_reclaimed(session: Session) -> None:
    _bill(session, lines=1)
    claim = claim_pending_bill(session)
    assert claim is not None
    line = claimed_lines(session, *claim)[0]
    line.item_claimed_at = datetime.now(UTC) - timedelta(minutes=10)
    session.add(line)
    session.commit()
    assert reclaim_stuck_lines(session) == 1
    session.refresh(line)
    assert (line.item_status, line.item_attempts, line.item_claim_token) == (
        "pending",
        1,
        None,
    )


def test_saved_answers_never_let_the_model_override_the_user(session: Session) -> None:
    user, _ = _bill(session, lines=0)
    load_shared_catalog(
        session,
        [
            CatalogRow("chicken", None, "Chicken", (), "Groceries"),
            CatalogRow("chicken-breast", "chicken", "Chicken breast", (), None),
            CatalogRow("old", None, "Old", (), "Other"),
        ],
    )
    load_shared_catalog(
        session,
        [
            CatalogRow("chicken", None, "Chicken", (), "Groceries"),
            CatalogRow("chicken-breast", "chicken", "Chicken breast", (), None),
        ],
    )
    rows = {row.slug: row for row in active_catalog(session)}
    assert set(rows) == {"chicken", "chicken-breast"}
    key = {
        "user_id": user.id,
        "kind": "text",
        "merchant_key": "costco",
        "key": "ks chx brst",
    }
    save_alias(session, **key, catalog_item_id=rows["chicken"].id, source="user")
    save_alias(
        session, **key, catalog_item_id=rows["chicken-breast"].id, source="model"
    )
    session.commit()
    alias = find_alias(session, **key)
    assert alias is not None
    assert (alias.catalog_item_id, alias.source) == (rows["chicken"].id, "user")
