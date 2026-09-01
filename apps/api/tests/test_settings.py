from storage.settings import get_settings


def test_settings_reads_database_url_from_env(monkeypatch) -> None:
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://test:test@localhost:5432/test",
    )
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.database_url == "postgresql+psycopg://test:test@localhost:5432/test"
    get_settings.cache_clear()
