import logging

from ai import ExtractError, RetryableExtractError
from sqlmodel import Session
from storage.blobs import BlobError
from storage.crud.spend import upsert_drafts
from storage.models.document import Document

from worker.common.outcome import Outcome
from worker.consumers.extraction.services import (
    attempt_writer,
    draft_mapper,
    extractor,
    loader,
    validator,
)

logger = logging.getLogger(__name__)


def handle(session: Session, document: Document) -> Outcome:
    try:
        data = loader.get_bytes(document.storage_key)
        extraction, meta = extractor.extract(data, document.mime_type)
    except BlobError:
        logger.exception("document blob read failed")
        return Outcome.failed("storage read failed")
    except ExtractError as exc:
        attempt_writer.write_error(session, document.id, str(exc))
        if isinstance(exc, RetryableExtractError):
            return Outcome.retry(str(exc))
        return Outcome.failed(str(exc))
    except RuntimeError as exc:
        logger.exception("extraction failed unexpectedly")
        return Outcome.failed(str(exc))
    warning = validator.warning_for(extraction)
    attempt = attempt_writer.write_success(
        session,
        document.id,
        meta=meta,
        payload=extraction.model_dump(mode="json"),
        warning=warning,
    )
    upsert_drafts(
        session,
        user_id=document.user_id,
        document_id=document.id,
        extraction_attempt_id=attempt.id,
        drafts=draft_mapper.drafts(document.user_id, extraction),
        commit=False,
    )
    return Outcome.ready(warning)
