import logging

from worker.bootstrap import bootstrap
from worker.jobs import JOBS
from worker.runtime import run
from worker.settings import get_settings

logger = logging.getLogger(__name__)


def main() -> None:
    bootstrap()
    poll = get_settings().worker_poll_seconds
    logger.info(
        "worker started", extra={"poll_seconds": poll, "jobs": [j.name for j in JOBS]}
    )
    run(JOBS, poll_seconds=poll)


if __name__ == "__main__":
    main()
