import logging
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import NamedTuple
from uuid import UUID

from sqlmodel import Session
from storage import database

logger = logging.getLogger(__name__)


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
    while True:
        if not run_once(jobs):
            time.sleep(poll_seconds)
