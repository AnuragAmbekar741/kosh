import logging
import time
from collections import Counter

from observability import bound
from sqlmodel import Session
from storage import database
from storage.crud.item_matching import (
    claim_pending_bill,
    claimed_lines,
    finish_line,
    release_lines,
)

from worker.jobs.items.handler import handle
from worker.runtime import Claim

logger = logging.getLogger(__name__)


def claim(session: Session) -> Claim | None:
    claimed = claim_pending_bill(session)
    return Claim(*claimed) if claimed else None


def run(claimed: Claim) -> None:
    document_id, token = claimed
    with bound(document_id=str(document_id)), Session(database.engine) as session:
        lines = claimed_lines(session, document_id, token)
        if not lines:
            logger.warning("item claim no longer held; skipped")
            return
        started = time.perf_counter()
        outcome, results = handle(session, lines)
        if outcome.kind == "retry":
            session.rollback()
            release_lines(session, document_id, token)
            statuses: Counter[str] = Counter({"retry": len(lines)})
        else:
            written = [
                result.status
                for result in results
                if finish_line(
                    session,
                    result.line_id,
                    token=token,
                    status=result.status,
                    catalog_item_id=result.catalog_item_id,
                    method=result.method,
                    category=result.category,
                )
            ]
            session.commit()
            statuses = Counter(str(status) for status in written)
        logger.info(
            "items finished",
            extra={
                "lines": len(lines),
                "statuses": dict(statuses),
                "reason": outcome.reason,
                "duration_ms": round((time.perf_counter() - started) * 1000),
            },
        )
