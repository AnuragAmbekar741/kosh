from worker.jobs import extraction

# Priority order: the runtime serves the first job with work, so uploads stay fast.
JOBS = (extraction.JOB,)
