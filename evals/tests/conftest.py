import os
from collections.abc import Iterator

import pytest
from sqlalchemy import Engine, event
from sqlmodel import SQLModel, create_engine

# Storage builds its engine at import; never touch a developer's database.
os.environ.update(
    DATABASE_URL="sqlite://",
    JWT_SECRET="test-only-secret-at-least-32-characters",
)


@pytest.fixture
def db_engine(tmp_path, monkeypatch) -> Iterator[Engine]:
    import storage.models  # noqa: F401  registers every table
    from storage import database

    engine = create_engine(
        f"sqlite:///{tmp_path / 'evals.db'}", connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine, "connect")
    def _enable_sqlite_fks(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    monkeypatch.setattr(database, "engine", engine)
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()
