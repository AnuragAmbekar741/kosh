from fastapi import FastAPI

from api.common.exception_handlers import register_exception_handlers
from api.modules.auth import router as auth
from api.modules.documents import router as documents
from api.modules.health import router as health
from api.modules.spend import router as spend
from api.modules.users import router as users


def register(app: FastAPI) -> None:
    register_exception_handlers(app)
    app.include_router(health, tags=["health"])
    app.include_router(auth)
    app.include_router(users)
    app.include_router(spend)
    app.include_router(documents)
