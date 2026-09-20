from typing import Any

from sqlalchemy import func
from sqlmodel import Session, select

__all__ = ["paginate"]


def paginate[T](
    session: Session, statement: Any, *, skip: int, limit: int
) -> tuple[list[T], int]:
    total = session.exec(
        select(func.count()).select_from(statement.order_by(None).subquery())
    ).one()
    rows = list(session.exec(statement.offset(skip).limit(limit)).all())
    return rows, total
