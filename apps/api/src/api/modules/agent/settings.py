from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = next(
    p for p in Path(__file__).resolve().parents if (p / "uv.lock").exists()
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_REPO_ROOT / ".env", extra="ignore")

    # Every message counts, failed ones too, so retries cannot get around it.
    agent_daily_runs: int = Field(default=50, ge=1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
