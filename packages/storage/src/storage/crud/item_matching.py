"""Claim protocol for matching receipt lines to catalog items.

Pending lines are claimed one bill at a time: every pending line of the
bill gets the same claim token. Results are written only while that token
still owns the line, so an edit (which clears the token) wins over a
match that was already in flight.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlmodel import Session, col, select

from storage.models.spend import CategorySource, ItemStatus, SpendItem

__all__ = [
    "claim_pending_bill",
    "claimed_lines",
    "finish_line",
    "reclaim_stuck_lines",
    "release_lines",
]

_STUCK_AFTER = timedelta(minutes=5)
_MAX_ATTEMPTS = 3


def claim_pending_bill(session: Session) -> tuple[UUID, UUID] | None:
    """Claim every pending line of the bill with the oldest pending line.

    Returns (document_id, claim_token), or None when nothing is pending.
    """
    first = session.exec(
        select(SpendItem)
        .where(
            SpendItem.item_status == ItemStatus.PENDING,
            col(SpendItem.document_id).is_not(None),
        )
        .order_by(col(SpendItem.updated_at), col(SpendItem.id))
        .with_for_update(skip_locked=True)
    ).first()
    if first is None or first.document_id is None:
        return None
    document_id = first.document_id
    lines = session.exec(
        select(SpendItem)
        .where(
            SpendItem.document_id == document_id,
            SpendItem.item_status == ItemStatus.PENDING,
        )
        .with_for_update(skip_locked=True)
    ).all()
    token = uuid4()
    now = datetime.now(UTC)
    for line in lines:
        line.item_status = ItemStatus.PROCESSING
        line.item_claim_token = token
        line.item_claimed_at = now
        session.add(line)
    session.commit()
    return document_id, token


def claimed_lines(session: Session, document_id: UUID, token: UUID) -> list[SpendItem]:
    return list(
        session.exec(
            select(SpendItem)
            .where(
                SpendItem.document_id == document_id,
                SpendItem.item_claim_token == token,
                SpendItem.item_status == ItemStatus.PROCESSING,
            )
            .order_by(col(SpendItem.line_index))
        ).all()
    )


def finish_line(
    session: Session,
    line_id: UUID,
    *,
    token: UUID,
    status: ItemStatus,
    catalog_item_id: UUID | None = None,
    method: str | None = None,
    category: str | None = None,
) -> bool:
    """Write one line's result if the claim still holds; the caller commits.

    `category` replaces the line's category unless the user set it.
    """
    # The claim is checked in SQL with fresh values: the session may still
    # hold this line from before an edit that cleared the token.
    line = session.exec(
        select(SpendItem)
        .where(
            SpendItem.id == line_id,
            SpendItem.item_claim_token == token,
            SpendItem.item_status == ItemStatus.PROCESSING,
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    ).first()
    if line is None:
        return False
    line.item_status = status
    line.catalog_item_id = catalog_item_id
    line.item_method = method
    line.item_claim_token = None
    line.item_claimed_at = None
    if category is not None and line.category_source != CategorySource.USER:
        line.category = category
        line.category_source = CategorySource.ITEM
    line.updated_at = datetime.now(UTC)
    session.add(line)
    return True


def release_lines(session: Session, document_id: UUID, token: UUID) -> int:
    """Give claimed lines back for a retry, or fail them after the last attempt."""
    lines = claimed_lines(session, document_id, token)
    for line in lines:
        _release(line)
        session.add(line)
    session.commit()
    return len(lines)


def reclaim_stuck_lines(session: Session) -> int:
    cutoff = datetime.now(UTC) - _STUCK_AFTER
    lines = session.exec(
        select(SpendItem)
        .where(
            SpendItem.item_status == ItemStatus.PROCESSING,
            col(SpendItem.item_claimed_at) < cutoff,
        )
        .with_for_update(skip_locked=True)
    ).all()
    for line in lines:
        _release(line)
        session.add(line)
    if lines:
        session.commit()
    return len(lines)


def _release(line: SpendItem) -> None:
    line.item_attempts += 1
    line.item_status = (
        ItemStatus.FAILED if line.item_attempts >= _MAX_ATTEMPTS else ItemStatus.PENDING
    )
    line.item_claim_token = None
    line.item_claimed_at = None
