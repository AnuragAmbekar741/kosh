from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_REPO_ROOT / ".env",
        extra="ignore",
    )

    jwt_secret: str
    google_client_id: str = ""
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    cookie_secure: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
