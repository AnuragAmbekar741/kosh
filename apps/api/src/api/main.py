import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from security.settings import get_settings as get_security_settings
from storage.database import ping
from storage.settings import get_settings as get_storage_settings

from api.bootstrap import register
from api.common.request_logging import RequestLoggingMiddleware, configure_logging

_DEFAULT_CORS = "http://localhost:5173,http://127.0.0.1:5173"

logger = logging.getLogger(__name__)


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", _DEFAULT_CORS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    get_storage_settings()
    get_security_settings()
    ping()
    logger.info("api started")
    yield


app = FastAPI(title="Finance API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Added last, so it is the outermost layer and also sees CORS preflights.
app.add_middleware(RequestLoggingMiddleware)
register(app)
