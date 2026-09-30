from storage.crud.item_matching import reclaim_stuck_lines

from worker.jobs.items.job import claim, run
from worker.runtime import Job

JOB = Job(name="items", reclaim=reclaim_stuck_lines, claim=claim, run=run)

__all__ = ["JOB"]
