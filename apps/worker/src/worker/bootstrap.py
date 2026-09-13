from storage.database import ping

from worker.settings import get_settings


def bootstrap() -> None:
    get_settings()
    ping()
