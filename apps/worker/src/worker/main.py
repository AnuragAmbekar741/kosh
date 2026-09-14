import logging
import time

from sqlmodel import Session
from storage import database
from storage.crud.document import claim_next, reclaim_stuck

from worker.bootstrap import bootstrap
from worker.consumers.extraction.consumer import process_document
from worker.settings import get_settings

logger = logging.getLogger(__name__)


def run() -> None:
    bootstrap()
    poll = get_settings().worker_poll_seconds
    logger.info("worker started", extra={"poll_seconds": poll})
    while True:
        with Session(database.engine) as session:
            reclaimed = reclaim_stuck(session)
            document = claim_next(session)
        if reclaimed:
            logger.warning("reclaimed stuck documents", extra={"count": reclaimed})
        if document is None:
            time.sleep(poll)
            continue
        if document.claim_token is None:
            continue
        try:
            process_document(document.id, document.claim_token)
        except Exception:
            logger.exception(
                "document processing crashed", extra={"document_id": str(document.id)}
            )


def main() -> None:
    run()


if __name__ == "__main__":
    main()
