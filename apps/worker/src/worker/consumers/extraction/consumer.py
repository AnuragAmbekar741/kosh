from uuid import UUID

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
        outcome = handle(session, document)
        claimed = get_claimed_document(
            session, document_id=document_id, claim_token=claim_token
        )
        if claimed is None:
            return
        if outcome.kind == "ready":
            mark_ready(session, claimed, outcome.warning)
        elif outcome.kind == "retry":
            mark_retry(session, claimed, outcome.reason or "")
        else:
            mark_failed(session, claimed, outcome.reason or "")
