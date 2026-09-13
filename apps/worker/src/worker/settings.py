from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = next(
    p for p in Path(__file__).resolve().parents if (p / "uv.lock").exists()
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_REPO_ROOT / ".env",
        extra="ignore",
    )

    worker_poll_seconds: int = 2


@lru_cache
def get_settings() -> Settings:
    return Settings()
