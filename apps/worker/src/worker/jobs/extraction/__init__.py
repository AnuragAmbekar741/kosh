from storage.crud.document import reclaim_stuck

from worker.jobs.extraction.job import claim, run
from worker.runtime import Job

JOB = Job(name="extraction", reclaim=reclaim_stuck, claim=claim, run=run)

__all__ = ["JOB"]
