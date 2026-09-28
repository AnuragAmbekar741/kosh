import os
from collections.abc import Iterator

import pytest
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

# Storage builds its engine at import time; never touch a developer's database.
os.environ["DATABASE_URL"] = "sqlite://"


@pytest.fixture
def session(tmp_path) -> Iterator[Session]:
    import storage.models  # noqa: F401  registers every table

    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")

    @event.listens_for(engine, "connect")
    def _enable_sqlite_fks(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()
