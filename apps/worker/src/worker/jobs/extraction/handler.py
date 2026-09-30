import logging

import ai
from sqlmodel import Session
from storage import blobs
from storage.models.document import Document
from storage.settings import get_settings as get_storage_settings

from worker.jobs.extraction import attempts, drafts, validation
from worker.outcome import Outcome

logger = logging.getLogger(__name__)


def handle(session: Session, document: Document) -> Outcome:
    try:
        data = blobs.get_bytes(document.storage_key)
        extraction, meta = ai.extract(
            data,
            document.mime_type,
            max_upload_mb=get_storage_settings().max_upload_mb,
        )
    except blobs.BlobError:
        logger.exception("document blob read failed")
        return Outcome.failed("storage read failed")
    except ai.ExtractError as exc:
        attempts.write_error(session, document.id, str(exc))
        if isinstance(exc, ai.RetryableExtractError):
            return Outcome.retry(str(exc))
        return Outcome.failed(str(exc))
    except RuntimeError as exc:
        logger.exception("extraction failed unexpectedly")
        return Outcome.failed(str(exc))
    warning = validation.warning_for(extraction)
    attempt = attempts.write_success(
        session,
        document.id,
        meta=meta,
        payload=extraction.model_dump(mode="json"),
        warning=warning,
    )
    drafts.save(session, document, attempt.id, extraction)
    return Outcome.ready(warning)
