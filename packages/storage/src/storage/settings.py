from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_REPO_ROOT / ".env",
        extra="ignore",
    )

    database_url: str
    documents_bucket: str = "documents"
    aws_endpoint_url_s3: str | None = None
    aws_region: str = "us-east-2"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    max_upload_mb: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # values come from environment
