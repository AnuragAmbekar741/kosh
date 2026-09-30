from worker.jobs import extraction, items

# Priority order: the runtime serves the first job with work, so uploads stay fast.
JOBS = (extraction.JOB, items.JOB)
