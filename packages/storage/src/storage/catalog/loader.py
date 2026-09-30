import csv
import re
from pathlib import Path

from storage.crud.catalog import CatalogRow, name_key
from storage.models.spend import Category

__all__ = ["CatalogError", "read_catalog"]

_COLUMNS = ["slug", "parent_slug", "name", "synonyms", "category"]
_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_CATEGORIES = {category.value for category in Category}


class CatalogError(ValueError):
    pass


def read_catalog(path: Path) -> list[CatalogRow]:
    """Parse and validate catalog.csv; families come before their items.

    Families have no parent_slug and must name one of the 14 categories.
    Items name a family as parent_slug and leave category empty (they
    inherit it). Synonyms are separated by "|". Names and synonyms share one
    namespace: each may point at only one row, so matching is never ambiguous.
    """
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != _COLUMNS:
            raise CatalogError(f"columns must be {','.join(_COLUMNS)}")
        raw = [(line, record) for line, record in enumerate(reader, start=2)]

    errors: list[str] = []
    rows: list[tuple[int, CatalogRow]] = []
    for line, record in raw:
        if None in record:
            errors.append(f"line {line}: too many values; quote text with commas")
        slug = (record["slug"] or "").strip()
        parent = (record["parent_slug"] or "").strip() or None
        name = (record["name"] or "").strip()
        category = (record["category"] or "").strip() or None
        synonyms = tuple(
            part.strip()
            for part in (record["synonyms"] or "").split("|")
            if part.strip()
        )
        if not _SLUG.match(slug):
            errors.append(f"line {line}: slug {slug!r} must be lowercase kebab-case")
        if not name_key(name):
            errors.append(f"line {line}: name is empty")
        if parent is None and category not in _CATEGORIES:
            errors.append(
                f"line {line}: family {slug!r} needs one of the 14 categories"
            )
        if parent is not None and category is not None:
            errors.append(
                f"line {line}: item {slug!r} inherits its category; leave it empty"
            )
        rows.append((line, CatalogRow(slug, parent, name, synonyms, category)))

    families = {row.slug for _, row in rows if row.parent_slug is None}
    seen_slugs: set[str] = set()
    owners: dict[str, str] = {}
    for line, row in rows:
        if row.slug in seen_slugs:
            errors.append(f"line {line}: duplicate slug {row.slug!r}")
        seen_slugs.add(row.slug)
        if row.parent_slug is not None and row.parent_slug not in families:
            errors.append(f"line {line}: parent {row.parent_slug!r} is not a family")
        for text in (row.name, *row.synonyms):
            owner = owners.setdefault(name_key(text), row.slug)
            if owner != row.slug:
                errors.append(f"line {line}: {text!r} already names {owner!r}")

    if errors:
        raise CatalogError("\n".join(errors))
    ordered = [row for _, row in rows]
    return [row for row in ordered if row.parent_slug is None] + [
        row for row in ordered if row.parent_slug is not None
    ]
