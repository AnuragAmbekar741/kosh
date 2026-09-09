import logging
import time

from sqlmodel import Session
from storage import database
from storage.crud.document import claim_next, reclaim_stuck
from storage.database import ping

from worker.pipeline import process_document
from worker.settings import get_settings

logger = logging.getLogger(__name__)


def run() -> None:
    get_settings()
    ping()
    poll = get_settings().worker_poll_seconds
    while True:
        with Session(database.engine) as session:
            reclaim_stuck(session)
            document = claim_next(session)
        if document is None:
            time.sleep(poll)
            continue
        if document.claim_token is None:
            continue
        try:
            process_document(document.id, document.claim_token)
        except Exception:
            logger.exception(
                "document processing crashed", extra={"document_id": document.id}
            )


def main() -> None:
    run()


if __name__ == "__main__":
    main()
