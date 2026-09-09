from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlmodel import Session, col, select

from storage.models.document import Document, DocumentStatus, ExtractionAttempt

__all__ = [
    "claim_next",
    "create_document",
    "create_extraction_attempt",
    "get_claimed_document",
    "get_document",
    "get_document_by_id",
    "get_document_by_idempotency",
    "hash_matches_other",
    "latest_attempt",
    "list_documents",
    "list_extraction_attempts",
    "mark_failed",
    "mark_ready",
    "mark_retry",
    "next_attempt_no",
    "reclaim_stuck",
]

_STUCK_AFTER = timedelta(minutes=5)
_MAX_ATTEMPTS = 3


def create_document(session: Session, document: Document) -> Document:
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


def get_document(
    session: Session, *, user_id: UUID, document_id: UUID
) -> Document | None:
    document = session.get(Document, document_id)
    if document is None or document.user_id != user_id:
        return None
    return document


def get_document_by_id(session: Session, document_id: UUID) -> Document | None:
    return session.get(Document, document_id)


def get_document_by_idempotency(
    session: Session, *, user_id: UUID, idempotency_key: str
) -> Document | None:
    return session.exec(
        select(Document).where(
            Document.user_id == user_id,
            Document.idempotency_key == idempotency_key,
        )
    ).first()


def hash_matches_other(
    session: Session, *, user_id: UUID, content_hash: str, document_id: UUID
) -> bool:
    other = session.exec(
        select(Document).where(
            Document.user_id == user_id,
            Document.content_hash == content_hash,
            Document.id != document_id,
        )
    ).first()
    return other is not None


def list_documents(session: Session, *, user_id: UUID) -> list[Document]:
    statement = (
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(col(Document.created_at).desc())
    )
    return list(session.exec(statement).all())


def claim_next(session: Session) -> Document | None:
    row = session.exec(
        select(Document)
        .where(Document.status == DocumentStatus.UPLOADED)
        .order_by(col(Document.created_at))
        .with_for_update(skip_locked=True)
    ).first()
    if row is None:
        return None
    row.status = DocumentStatus.PROCESSING
    row.claimed_at = datetime.now(UTC)
    row.claim_token = uuid4()
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def reclaim_stuck(session: Session) -> int:
    cutoff = datetime.now(UTC) - _STUCK_AFTER
    rows = list(
        session.exec(
            select(Document)
            .where(
                Document.status == DocumentStatus.PROCESSING,
                col(Document.claimed_at).is_not(None),
                col(Document.claimed_at) < cutoff,
            )
            .with_for_update(skip_locked=True)
        ).all()
    )
    for row in rows:
        row.attempt_count += 1
        if row.attempt_count >= _MAX_ATTEMPTS:
            row.status = DocumentStatus.FAILED
            row.error = "exceeded processing retries"
            row.processed_at = datetime.now(UTC)
            row.claim_token = None
        else:
            row.status = DocumentStatus.UPLOADED
            row.claimed_at = None
            row.claim_token = None
        session.add(row)
    if rows:
        session.commit()
    return len(rows)


def mark_failed(session: Session, document: Document, error: str) -> Document:
    document.status = DocumentStatus.FAILED
    document.error = error
    document.processed_at = datetime.now(UTC)
    document.claim_token = None
    document.claimed_at = None
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


def mark_ready(
    session: Session, document: Document, error: str | None = None
) -> Document:
    document.status = DocumentStatus.READY
    document.error = error
    document.processed_at = datetime.now(UTC)
    document.claim_token = None
    document.claimed_at = None
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


def mark_retry(session: Session, document: Document, error: str) -> Document:
    document.attempt_count += 1
    document.error = error
    document.claim_token = None
    document.claimed_at = None
    if document.attempt_count >= _MAX_ATTEMPTS:
        document.status = DocumentStatus.FAILED
        document.processed_at = datetime.now(UTC)
    else:
        document.status = DocumentStatus.UPLOADED
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


def next_attempt_no(session: Session, document_id: UUID) -> int:
    rows = list(
        session.exec(
            select(ExtractionAttempt).where(
                ExtractionAttempt.document_id == document_id
            )
        ).all()
    )
    return len(rows) + 1


def get_claimed_document(
    session: Session, *, document_id: UUID, claim_token: UUID
) -> Document | None:
    return session.exec(
        select(Document)
        .where(
            Document.id == document_id,
            Document.status == DocumentStatus.PROCESSING,
            Document.claim_token == claim_token,
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    ).first()


def create_extraction_attempt(
    session: Session, attempt: ExtractionAttempt, *, commit: bool = True
) -> ExtractionAttempt:
    session.add(attempt)
    if commit:
        session.commit()
        session.refresh(attempt)
    else:
        session.flush()
    return attempt


def latest_attempt(session: Session, document_id: UUID) -> ExtractionAttempt | None:
    return session.exec(
        select(ExtractionAttempt)
        .where(ExtractionAttempt.document_id == document_id)
        .order_by(col(ExtractionAttempt.attempt_no).desc())
    ).first()


def list_extraction_attempts(
    session: Session, document_id: UUID
) -> list[ExtractionAttempt]:
    statement = (
        select(ExtractionAttempt)
        .where(ExtractionAttempt.document_id == document_id)
        .order_by(col(ExtractionAttempt.attempt_no).desc())
    )
    return list(session.exec(statement).all())
