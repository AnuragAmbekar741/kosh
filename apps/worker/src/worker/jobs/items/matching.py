"""Free string matching of receipt text to catalog rows.

Both the catalog and the receipt text go through the same key: casefold,
fold accents and plurals, drop trailing sizes. A line matches the row whose
name or synonym equals the longest ending of its key, since the product
noun comes last ("kirkland organic chicken breast"). One-word endings only
count from the model's cleaned-up name: raw text such as "SILK ALMOND
64OZ" would otherwise match the wrong row.
"""

import re
from collections.abc import Iterable, Sequence
from uuid import UUID

from storage.crud.catalog import name_key
from storage.models.catalog import CatalogItem

_UNITS = {
    "lb",
    "lbs",
    "oz",
    "fl",
    "kg",
    "g",
    "gm",
    "ml",
    "l",
    "ltr",
    "gal",
    "qt",
    "pt",
    "ct",
    "pk",
    "pack",
    "ea",
    "each",
    "x",
    "dz",
    "doz",
}
_HAS_DIGIT = re.compile(r"\d")


def match_key(text: str) -> str:
    words = [_singular(word) for word in name_key(text).split()]
    while words and (_HAS_DIGIT.search(words[-1]) or words[-1] in _UNITS):
        words.pop()
    return " ".join(words)


def _singular(word: str) -> str:
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


class CatalogIndex:
    def __init__(self, rows: Sequence[CatalogItem]) -> None:
        self._rows = {row.id: row for row in rows}
        self._by_key: dict[str, UUID | None] = {}
        for row in rows:
            for text in (row.name, *row.synonyms):
                key = match_key(text)
                if not key:
                    continue
                owner = self._by_key.setdefault(key, row.id)
                if owner != row.id:
                    self._by_key[key] = None  # ambiguous: never match

    def match(self, *, cleaned: str | None, raw: str | None) -> CatalogItem | None:
        for text, min_words in ((cleaned, 1), (raw, 2)):
            row = self._longest_ending(text, min_words) if text else None
            if row is not None:
                return row
        return None

    def get(self, row_id: UUID | None) -> CatalogItem | None:
        return self._rows.get(row_id) if row_id else None

    def by_slug(self, slug: str | None) -> CatalogItem | None:
        return next((row for row in self._rows.values() if row.slug == slug), None)

    def category_of(self, row: CatalogItem) -> str | None:
        if row.category is not None:
            return row.category
        parent = self._rows.get(row.parent_id) if row.parent_id else None
        return parent.category if parent else None

    def rows(self) -> Iterable[CatalogItem]:
        return self._rows.values()

    def _longest_ending(self, text: str, min_words: int) -> CatalogItem | None:
        words = match_key(text).split()
        for start in range(len(words)):
            if len(words) - start < min_words and start > 0:
                break
            owner = self._by_key.get(" ".join(words[start:]))
            if owner is not None:
                return self._rows[owner]
        return None
