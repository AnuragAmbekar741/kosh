from collections.abc import Generator

from sqlalchemy import text
from sqlmodel import Session, create_engine

from storage.settings import get_settings

engine = create_engine(get_settings().database_url)


def ping() -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def get_session() -> Generator[Session]:
    with Session(engine) as session:
        yield session
