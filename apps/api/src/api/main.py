from fastapi import FastAPI

from api.routers import health

app = FastAPI(title="Finance API")
app.include_router(health.router, tags=["health"])
