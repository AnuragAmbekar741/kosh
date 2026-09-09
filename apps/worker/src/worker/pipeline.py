from decimal import Decimal
from uuid import UUID

from sqlmodel import Session
from storage import database
from storage.blobs import BlobError, get_bytes
from storage.crud.document import (
    create_extraction_attempt,
    get_claimed_document,
    get_document_by_id,
    mark_failed,
    mark_ready,
    mark_retry,
    next_attempt_no,
)
from storage.crud.spend import upsert_drafts
from storage.models.document import DocumentStatus, ExtractionAttempt
from storage.models.spend import SpendItem, SpendSource, SpendStatus

from worker.extract import (
    ExtractError,
    RetryableExtractError,
    extract,
    receipt_totals_mismatch,
)
from worker.schemas import ReceiptExtraction, StatementExtraction
from worker.settings import get_settings

__all__ = ["process_document"]


def process_document(document_id: UUID | str, claim_token: UUID | str) -> None:
    document_id = UUID(str(document_id))
    claim_token = UUID(str(claim_token))
    with Session(database.engine) as session:
        document = get_document_by_id(session, document_id)
        if (
            document is None
            or document.status != DocumentStatus.PROCESSING
            or document.claim_token != claim_token
        ):
            return
        try:
            data = get_bytes(document.storage_key)
            extraction, meta = extract(data, document.mime_type)
        except BlobError:
            claimed = get_claimed_document(
                session, document_id=document_id, claim_token=claim_token
            )
            if claimed is not None:
                mark_failed(session, claimed, "storage read failed")
            return
        except ExtractError as exc:
            document = get_claimed_document(
                session, document_id=document_id, claim_token=claim_token
            )
            if document is None:
                return
            attempt_no = next_attempt_no(session, document.id)
            create_extraction_attempt(
                session,
                ExtractionAttempt(
                    document_id=document.id,
                    attempt_no=attempt_no,
                    model=get_settings().openrouter_model,
                    error=str(exc),
                ),
                commit=False,
            )
            if isinstance(exc, RetryableExtractError):
                mark_retry(session, document, str(exc))
            else:
                mark_failed(session, document, str(exc))
            return
        except RuntimeError as exc:
            claimed = get_claimed_document(
                session, document_id=document_id, claim_token=claim_token
            )
            if claimed is not None:
                mark_failed(session, claimed, str(exc))
            return
        document = get_claimed_document(
            session, document_id=document_id, claim_token=claim_token
        )
        if document is None:
            return
        warning = None
        if isinstance(extraction, ReceiptExtraction) and receipt_totals_mismatch(
            extraction
        ):
            warning = "line items plus tax differ from total"
        attempt_no = next_attempt_no(session, document.id)
        attempt = create_extraction_attempt(
            session,
            ExtractionAttempt(
                document_id=document.id,
                attempt_no=attempt_no,
                model=meta.model,
                provider=meta.provider,
                payload=extraction.model_dump(mode="json"),
                prompt_tokens=meta.prompt_tokens,
                completion_tokens=meta.completion_tokens,
                error=warning,
            ),
            commit=False,
        )
        drafts = _drafts(document.user_id, extraction)
        upsert_drafts(
            session,
            user_id=document.user_id,
            document_id=document.id,
            extraction_attempt_id=attempt.id,
            drafts=drafts,
            commit=False,
        )
        mark_ready(session, document, warning)


def _drafts(
    user_id: UUID, extraction: ReceiptExtraction | StatementExtraction
) -> list[SpendItem]:
    if isinstance(extraction, ReceiptExtraction):
        rows = [
            SpendItem(
                user_id=user_id,
                merchant=extraction.merchant,
                description=None,
                amount=Decimal(extraction.total),
                currency=extraction.currency,
                spent_at=extraction.purchased_at,
                category=None,
                source=SpendSource.DOCUMENT,
                status=SpendStatus.PENDING_REVIEW,
                line_index=None,
            )
        ]
        for index, item in enumerate(extraction.line_items):
            rows.append(
                SpendItem(
                    user_id=user_id,
                    merchant=extraction.merchant,
                    description=item.normalized_name or item.raw_description,
                    amount=Decimal(item.line_total),
                    currency=extraction.currency,
                    spent_at=extraction.purchased_at,
                    category=None,
                    source=SpendSource.DOCUMENT,
                    status=SpendStatus.PENDING_REVIEW,
                    line_index=index,
                )
            )
        return rows
    rows = []
    for index, txn in enumerate(extraction.transactions):
        if txn.direction == "credit":
            continue
        rows.append(
            SpendItem(
                user_id=user_id,
                merchant=txn.merchant,
                description=None,
                amount=Decimal(txn.amount),
                currency=extraction.currency,
                spent_at=txn.spent_at,
                category=txn.category,
                source=SpendSource.DOCUMENT,
                status=SpendStatus.PENDING_REVIEW,
                line_index=index,
            )
        )
    return rows
