import logging
import time
from uuid import UUID

from observability import bound
from sqlmodel import Session
from storage import database
from storage.crud.document import (
    get_claimed_document,
    get_document_by_id,
    mark_failed,
    mark_ready,
    mark_retry,
)
from storage.models.document import DocumentStatus

from worker.consumers.extraction.handler import handle

logger = logging.getLogger(__name__)

_LEVEL = {"ready": logging.INFO, "retry": logging.WARNING, "failed": logging.WARNING}


def process_document(document_id: UUID | str, claim_token: UUID | str) -> None:
    document_id = UUID(str(document_id))
    claim_token = UUID(str(claim_token))
    with bound(document_id=str(document_id)), Session(database.engine) as session:
        document = get_document_by_id(session, document_id)
        if (
            document is None
            or document.status != DocumentStatus.PROCESSING
            or document.claim_token != claim_token
        ):
            logger.warning("claim no longer held; skipped")
            return
        user_id = str(document.user_id)
        started = time.perf_counter()
        outcome = handle(session, document)
        claimed = get_claimed_document(
            session, document_id=document_id, claim_token=claim_token
        )
        if claimed is None:
            logger.warning(
                "claim lost during extraction; result discarded",
                extra={"outcome": outcome.kind},
            )
            return
        if outcome.kind == "ready":
            mark_ready(session, claimed, outcome.warning)
        elif outcome.kind == "retry":
            mark_retry(session, claimed, outcome.reason or "")
        else:
            mark_failed(session, claimed, outcome.reason or "")
        logger.log(
            _LEVEL[outcome.kind],
            "extraction finished",
            extra={
                "user_id": user_id,
                "outcome": outcome.kind,
                "reason": outcome.reason,
                "warning": outcome.warning,
                "duration_ms": round((time.perf_counter() - started) * 1000),
            },
        )
