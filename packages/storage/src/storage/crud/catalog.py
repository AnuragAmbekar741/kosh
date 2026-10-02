import re
import unicodedata
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import NamedTuple
from uuid import UUID

from sqlalchemy import or_
from sqlmodel import Session, col, select

from storage.models.catalog import AliasSource, CatalogAlias, CatalogItem

__all__ = [
    "CatalogLoadResult",
    "CatalogRow",
    "active_catalog",
    "find_alias",
    "load_shared_catalog",
    "name_key",
    "save_alias",
    "search_catalog",
    "visible_catalog",
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


def active_catalog(session: Session) -> list[CatalogItem]:
    """Shared rows that are not retired, families before items."""
    return list(
        session.exec(
            select(CatalogItem)
            .where(
                col(CatalogItem.user_id).is_(None), col(CatalogItem.retired).is_(False)
            )
            .order_by(col(CatalogItem.parent_id).is_not(None), col(CatalogItem.name))
        ).all()
    )


def find_alias(
    session: Session, *, user_id: UUID, kind: str, merchant_key: str, key: str
) -> CatalogAlias | None:
    return session.exec(
        select(CatalogAlias).where(
            CatalogAlias.user_id == user_id,
            CatalogAlias.kind == kind,
            CatalogAlias.merchant_key == merchant_key,
            CatalogAlias.key == key,
        )
    ).first()


def save_alias(
    session: Session,
    *,
    user_id: UUID,
    kind: str,
    merchant_key: str,
    key: str,
    catalog_item_id: UUID | None,
    source: str,
) -> None:
    """Insert or update a saved answer; a model answer never replaces a user one.

    The caller commits.
    """
    alias = find_alias(
        session, user_id=user_id, kind=kind, merchant_key=merchant_key, key=key
    )
    if (
        alias is not None
        and alias.source == AliasSource.USER
        and source != alias.source
    ):
        return
    if alias is None:
        alias = CatalogAlias(
            user_id=user_id,
            kind=kind,
            merchant_key=merchant_key,
            key=key,
            source=source,
        )
    alias.catalog_item_id = catalog_item_id
    alias.source = source
    alias.updated_at = datetime.now(UTC)
    session.add(alias)


def visible_catalog(session: Session, user_id: UUID) -> list[CatalogItem]:
    """Shared rows plus this user's own rows, none retired."""
    return list(
        session.exec(
            select(CatalogItem).where(
                or_(col(CatalogItem.user_id).is_(None), CatalogItem.user_id == user_id),
                col(CatalogItem.retired).is_(False),
            )
        ).all()
    )


def search_catalog(
    session: Session, user_id: UUID, query: str, *, limit: int = 20
) -> list[CatalogItem]:
    """Rank by name prefix, then name contains, then a synonym contains."""
    needle = name_key(query)
    if not needle:
        return []
    ranked: list[tuple[int, int, str, CatalogItem]] = []
    for row in visible_catalog(session, user_id):
        if row.name_key.startswith(needle):
            rank = 0
        elif needle in row.name_key:
            rank = 1
        elif any(needle in name_key(synonym) for synonym in row.synonyms):
            rank = 2
        else:
            continue
        ranked.append((rank, len(row.name), row.name, row))
    ranked.sort(key=lambda entry: entry[:3])
    return [row for *_, row in ranked[:limit]]
