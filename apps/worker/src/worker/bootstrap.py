from observability import configure
from storage.database import ping

from worker.settings import get_settings


def bootstrap() -> None:
    configure("worker")
    get_settings()
    ping()
