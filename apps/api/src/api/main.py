from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from security.settings import get_settings as get_security_settings
from storage.database import ping
from storage.settings import get_settings as get_storage_settings

from api.routers import auth, health, users


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    get_storage_settings()
    get_security_settings()
    ping()
    yield


app = FastAPI(title="Finance API", lifespan=lifespan)
app.include_router(health.router, tags=["health"])
app.include_router(auth.router)
app.include_router(users.router)
