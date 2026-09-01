from collections.abc import Generator

from sqlmodel import Session, create_engine

from storage.settings import get_settings

engine = create_engine(get_settings().database_url)


def get_session() -> Generator[Session]:
    with Session(engine) as session:
        yield session
