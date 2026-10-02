from uuid import UUID

from sqlmodel import Session
from storage.crud.catalog import search_catalog

from api.modules.catalog.schemas import CatalogEntry


def search(session: Session, user_id: UUID, q: str, limit: int) -> list[CatalogEntry]:
    entries = []
    for row in search_catalog(session, user_id, q, limit=limit):
        family = row.parent
        entries.append(
            CatalogEntry(
                id=row.id,
                name=row.name,
                family=family.name if family else None,
                category=family.category if family else row.category,
                is_family=family is None,
                mine=row.user_id is not None,
            )
        )
    return entries
