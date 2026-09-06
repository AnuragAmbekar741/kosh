import pytest
from api import main
from fastapi.testclient import TestClient
from pydantic import ValidationError
from security.settings import Settings as SecuritySettings
from storage.settings import Settings as StorageSettings


@pytest.mark.parametrize(
    ("variable", "getter", "settings"),
    [
        ("DATABASE_URL", "get_storage_settings", StorageSettings),
        ("JWT_SECRET", "get_security_settings", SecuritySettings),
    ],
)
def test_startup_rejects_missing_configuration(
    monkeypatch, variable, getter, settings
) -> None:
    monkeypatch.delenv(variable)
    monkeypatch.setattr(main, getter, lambda: settings(_env_file=None))
    with pytest.raises(ValidationError), TestClient(main.app):
        pytest.fail("Startup accepted missing configuration")


def test_startup_rejects_database_failure(monkeypatch) -> None:
    def unavailable() -> None:
        raise ConnectionError("database unavailable")

    monkeypatch.setattr(main, "ping", unavailable)
    with (
        pytest.raises(ConnectionError, match="database unavailable"),
        TestClient(main.app),
    ):
        pytest.fail("Startup accepted an unavailable database")
