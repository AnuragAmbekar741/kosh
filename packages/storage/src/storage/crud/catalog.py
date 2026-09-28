import re
import unicodedata
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import NamedTuple

from sqlmodel import Session, col, select

from storage.models.catalog import CatalogItem

__all__ = [
    "CatalogLoadResult",
    "CatalogRow",
    "load_shared_catalog",
    "name_key",
]


class CatalogRow(NamedTuple):
    slug: str
    parent_slug: str | None
    name: str
    synonyms: tuple[str, ...]
    category: str | None


class CatalogLoadResult(NamedTuple):
    inserted: int
    updated: int
    retired: int


def name_key(text: str) -> str:
    """Casefold, fold accents, turn anything but letters and digits into spaces."""
    folded = unicodedata.normalize("NFKD", text.casefold())
    ascii_text = folded.encode("ascii", "ignore").decode("ascii")
    return " ".join(re.sub(r"[^0-9a-z]+", " ", ascii_text).split())


def load_shared_catalog(
    session: Session, rows: Sequence[CatalogRow], *, commit: bool = True
) -> CatalogLoadResult:
    """Insert or update shared rows by slug; retire shared rows not in `rows`.

    `rows` must list every parent before its children.
    """
    existing = {
        item.slug: item
        for item in session.exec(
            select(CatalogItem).where(
                col(CatalogItem.user_id).is_(None),
                col(CatalogItem.slug).is_not(None),
            )
        ).all()
    }
    ids = {slug: item.id for slug, item in existing.items()}
    now = datetime.now(UTC)
    inserted = updated = 0
    for row in rows:
        parent_id = ids[row.parent_slug] if row.parent_slug else None
        fields = {
            "parent_id": parent_id,
            "name": row.name,
            "name_key": name_key(row.name),
            "synonyms": list(row.synonyms),
            "category": row.category,
            "retired": False,
        }
        item = existing.get(row.slug)
        if item is None:
            item = CatalogItem(slug=row.slug, **fields)
            inserted += 1
        elif any(getattr(item, key) != value for key, value in fields.items()):
            for key, value in fields.items():
                setattr(item, key, value)
            item.updated_at = now
            updated += 1
        session.add(item)
        session.flush()
        ids[row.slug] = item.id
    wanted = {row.slug for row in rows}
    retired = 0
    for slug, item in existing.items():
        if slug not in wanted and not item.retired:
            item.retired = True
            item.updated_at = now
            session.add(item)
            retired += 1
    if commit:
        session.commit()
    else:
        session.flush()
    return CatalogLoadResult(inserted=inserted, updated=updated, retired=retired)
