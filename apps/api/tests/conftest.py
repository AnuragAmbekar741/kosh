import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import SQLModel, create_engine

# Storage creates its engine during import. Set harmless test configuration
# before pytest imports any application modules; never use a developer's .env.
os.environ.update(
    DATABASE_URL="sqlite://",
    JWT_SECRET="test-only-secret-at-least-32-characters",
    GOOGLE_CLIENT_ID="test-google-client",
    COOKIE_SECURE="false",
    ACCESS_TOKEN_MINUTES="15",
    REFRESH_TOKEN_DAYS="30",
)


@pytest.fixture(autouse=True)
def db_engine(tmp_path, monkeypatch) -> Iterator[Engine]:
    from security.settings import get_settings as security_settings
    from storage import database
    from storage.settings import get_settings as storage_settings

    url = f"sqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    storage_settings.cache_clear()
    security_settings.cache_clear()
    engine = create_engine(url, connect_args={"check_same_thread": False})
    monkeypatch.setattr(database, "engine", engine)
    SQLModel.metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()
        storage_settings.cache_clear()
        security_settings.cache_clear()


@pytest.fixture(autouse=True)
def blob_store(monkeypatch) -> dict[str, bytes]:
    import api.documents as documents_mod
    import storage.blobs as blobs_mod
    import worker.pipeline as pipeline_mod

    store: dict[str, bytes] = {}

    def put_bytes(key: str, data: bytes, content_type: str) -> None:
        store[key] = data

    def get_bytes(key: str) -> bytes:
        if key not in store:
            from storage.blobs import BlobError

            raise BlobError("missing")
        return store[key]

    def delete_bytes(key: str) -> None:
        store.pop(key, None)

    monkeypatch.setattr(blobs_mod, "put_bytes", put_bytes)
    monkeypatch.setattr(blobs_mod, "get_bytes", get_bytes)
    monkeypatch.setattr(blobs_mod, "delete_bytes", delete_bytes)
    monkeypatch.setattr(documents_mod, "put_bytes", put_bytes)
    monkeypatch.setattr(documents_mod, "delete_bytes", delete_bytes)
    monkeypatch.setattr(pipeline_mod, "get_bytes", get_bytes)
    return store


@pytest.fixture
def client(db_engine) -> Iterator[TestClient]:
    from api.main import app

    with TestClient(app) as client:
        yield client
