from uuid import uuid4

import pytest
from storage.catalog import CATALOG_CSV
from storage.catalog.loader import read_catalog
from storage.models.catalog import CatalogItem
from worker.jobs.items.matching import CatalogIndex


@pytest.fixture(scope="module")
def index() -> CatalogIndex:
    ids: dict[str, CatalogItem] = {}
    for row in read_catalog(CATALOG_CSV):
        ids[row.slug] = CatalogItem(
            id=uuid4(),
            slug=row.slug,
            name=row.name,
            name_key=row.name.lower(),
            synonyms=list(row.synonyms),
            parent_id=ids[row.parent_slug].id if row.parent_slug else None,
            category=row.category,
        )
    return CatalogIndex(list(ids.values()))


def test_committed_catalog_has_no_ambiguous_match_keys(index: CatalogIndex) -> None:
    assert [key for key, owner in index._by_key.items() if owner is None] == []


@pytest.mark.parametrize(
    ("cleaned", "raw", "slug", "category"),
    [
        (
            "Kirkland organic chicken breast",
            "KS ORG CHX BRST",
            "chicken-breast",
            "Groceries",
        ),
        (None, "KS ORG CHX BRST", "chicken-breast", "Groceries"),
        (
            "Silk unsweetened almond milk",
            "SILK ALMOND 64OZ",
            "almond-milk",
            "Groceries",
        ),
        ("Tide pods", "TIDE PODS 81CT", "laundry-pods", "Household"),
        (None, "COCA COLA 12PK", "cola", "Groceries"),
        ("Organic bananas", "ORG BANANAS 2.1 LB", "bananas", "Groceries"),
        ("Greek yogurt", None, "greek-yogurt", "Groceries"),
        ("Toilet paper", None, "toilet-paper", "Household"),
        ("Ibuprofen 200mg", None, "ibuprofen", "Health"),
    ],
)
def test_real_receipt_lines(
    index: CatalogIndex, cleaned: str | None, raw: str | None, slug: str, category: str
) -> None:
    row = index.match(cleaned=cleaned, raw=raw)
    assert row is not None and row.slug == slug
    assert index.category_of(row) == category


def test_unknown_lines_stay_unmatched(index: CatalogIndex) -> None:
    assert index.match(cleaned=None, raw="POP TARTS") is None
    assert index.match(cleaned=None, raw="SILK ALMOND 64OZ") is None
