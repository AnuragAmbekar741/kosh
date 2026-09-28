from sqlmodel import Session, select
from storage.crud.catalog import CatalogRow, load_shared_catalog, name_key
from storage.models.catalog import CatalogItem

_ROWS = [
    CatalogRow("chicken", None, "Chicken", ("poultry",), "Groceries"),
    CatalogRow("chicken-breast", "chicken", "Chicken breast", ("chx brst",), None),
    CatalogRow("detergent", None, "Laundry detergent", (), "Household"),
]


def _by_slug(session: Session) -> dict[str, CatalogItem]:
    return {item.slug: item for item in session.exec(select(CatalogItem)).all()}


def test_name_key_normalizes_case_and_punctuation() -> None:
    assert name_key("  Chicken   BREAST!! ") == "chicken breast"
    assert name_key("Baby & Kids / 2-pack") == "baby kids 2 pack"
    assert name_key("Crème Fraîche") == "creme fraiche"


def test_load_inserts_and_links_parents(session: Session) -> None:
    result = load_shared_catalog(session, _ROWS)
    assert result == (3, 0, 0)
    items = _by_slug(session)
    assert items["chicken-breast"].parent_id == items["chicken"].id
    assert items["chicken"].category == "Groceries"
    assert items["chicken-breast"].synonyms == ["chx brst"]
    assert items["chicken-breast"].name_key == "chicken breast"
    assert all(item.user_id is None for item in items.values())


def test_reload_is_idempotent(session: Session) -> None:
    load_shared_catalog(session, _ROWS)
    assert load_shared_catalog(session, _ROWS) == (0, 0, 0)


def test_changes_update_and_missing_rows_retire(session: Session) -> None:
    load_shared_catalog(session, _ROWS)
    changed = [
        _ROWS[0],
        _ROWS[1]._replace(synonyms=("chx brst", "bnls breast")),
    ]
    assert load_shared_catalog(session, changed) == (0, 1, 1)
    items = _by_slug(session)
    assert items["detergent"].retired is True
    assert items["chicken-breast"].synonyms == ["chx brst", "bnls breast"]
    assert load_shared_catalog(session, _ROWS) == (0, 2, 0)
    assert _by_slug(session)["detergent"].retired is False
