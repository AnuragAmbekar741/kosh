from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_REPO_ROOT / ".env",
        extra="ignore",
    )

    openrouter_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OPENROUTER_API_KEY", "OPEN_ROUTER_API_KEY"),
    )
    openrouter_model: str = "google/gemini-3.6-flash"
    openrouter_pdf_engine: str = "native"
    max_pdf_pages: int = 30
    max_image_pixels: int = 50_000_000
    max_upload_mb: int = 15
    worker_poll_seconds: int = 2

    def require_openrouter(self) -> str:
        if not self.openrouter_api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not set")
        if self.openrouter_pdf_engine == "native" and not self.openrouter_model:
            raise RuntimeError("OPENROUTER_MODEL is required for native PDF engine")
        return self.openrouter_api_key


@lru_cache
def get_settings() -> Settings:
    return Settings()
