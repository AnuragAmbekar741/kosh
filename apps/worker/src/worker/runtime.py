import logging
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import NamedTuple
from uuid import UUID

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlmodel import Session
from storage import database

logger = logging.getLogger(__name__)

# Connection-level failures (Neon restart, network drop, laptop sleep). SQL or
# programming errors are not in this list: they should still stop the worker.
_DISCONNECTS = (OperationalError, InterfaceError)
_MAX_BACKOFF_SECONDS = 60.0


class Claim(NamedTuple):
    """One unit of claimed work: the row id and the claim token that owns it."""

    id: UUID
    token: UUID


@dataclass(frozen=True)
class Job:
    name: str
    reclaim: Callable[[Session], int]
    claim: Callable[[Session], Claim | None]
    run: Callable[[Claim], None]


def run_once(jobs: Sequence[Job]) -> bool:
    """Run one unit of work from the first job that has any; jobs are in priority order."""
    for job in jobs:
        with Session(database.engine) as session:
            reclaimed = job.reclaim(session)
            claim = job.claim(session)
        if reclaimed:
            logger.warning(
                "reclaimed stuck work", extra={"job": job.name, "count": reclaimed}
            )
        if claim is None:
            continue
        try:
            job.run(claim)
        except Exception:
            logger.exception(
                "job crashed", extra={"job": job.name, "claim_id": str(claim.id)}
            )
        return True
    return False


def run(jobs: Sequence[Job], *, poll_seconds: float) -> None:
    """Poll forever. A lost database connection waits and retries, doubling the
    wait up to a minute; SQLAlchemy drops the dead connection from the pool."""
    failures = 0
    while True:
        try:
            worked = run_once(jobs)
        except _DISCONNECTS:
            failures += 1
            delay = min(poll_seconds * 2**failures, _MAX_BACKOFF_SECONDS)
            logger.warning(
                "database unavailable, retrying",
                extra={"attempt": failures, "retry_in_s": delay},
                exc_info=failures == 1,
            )
            time.sleep(delay)
            continue
        if failures:
            logger.info("database reachable again", extra={"attempts": failures})
            failures = 0
        if not worked:
            time.sleep(poll_seconds)
