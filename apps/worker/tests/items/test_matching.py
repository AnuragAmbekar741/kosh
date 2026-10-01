from uuid import uuid4

from storage.models.catalog import CatalogItem
from worker.jobs.items.matching import CatalogIndex, match_key


def _catalog() -> dict[str, CatalogItem]:
    rows: dict[str, CatalogItem] = {}

    def add(slug, name, synonyms=(), parent=None, category=None):
        rows[slug] = CatalogItem(
            id=uuid4(),
            slug=slug,
            name=name,
            name_key=name.lower(),
            synonyms=list(synonyms),
            parent_id=rows[parent].id if parent else None,
            category=category,
        )

    add("chicken", "Chicken", ["chx"], category="Groceries")
    add("chicken-breast", "Chicken breast", ["chx brst"], parent="chicken")
    add("fruit", "Fresh fruit", category="Groceries")
    add("bananas", "Bananas", ["banana"], parent="fruit")
    add("nuts", "Nuts and seeds", category="Groceries")
    add("almonds", "Almonds", ["almond"], parent="nuts")
    add("plant-milk", "Plant milk", category="Groceries")
    add("almond-milk", "Almond milk", parent="plant-milk")
    add("soft-drinks", "Soft drinks", ["pop"], category="Groceries")
    add("a", "Widget", category="Other")
    add("b", "Gadget", ["widget"], category="Other")
    return rows


def test_match_key_folds_case_plurals_and_trailing_sizes() -> None:
    assert match_key("ORGANIC BANANAS 2 LB") == "organic banana"
    assert match_key("Silk Almond 64OZ") == "silk almond"
    assert match_key("2% Milk") == "2 milk"


def test_longest_ending_wins() -> None:
    rows = _catalog()
    index = CatalogIndex(list(rows.values()))
    assert (
        index.match(cleaned="Kirkland organic chicken breasts", raw=None)
        is rows["chicken-breast"]
    )
    assert index.match(cleaned=None, raw="KS ORG CHX BRST") is rows["chicken-breast"]


def test_one_word_endings_only_count_from_the_cleaned_name() -> None:
    rows = _catalog()
    index = CatalogIndex(list(rows.values()))
    assert index.match(cleaned=None, raw="SILK ALMOND 64OZ") is None
    assert (
        index.match(cleaned="Silk almond milk", raw="SILK ALMOND 64OZ")
        is rows["almond-milk"]
    )
    assert index.match(cleaned=None, raw="ORGANIC BANANAS 2 LB") is None
    assert index.match(cleaned="Organic bananas", raw=None) is rows["bananas"]
    assert index.match(cleaned=None, raw="BANANAS") is rows["bananas"]


def test_a_word_in_the_middle_never_matches() -> None:
    index = CatalogIndex(list(_catalog().values()))
    assert index.match(cleaned="Pop tarts", raw="POP TARTS") is None


def test_ambiguous_keys_never_match() -> None:
    index = CatalogIndex(list(_catalog().values()))
    assert index.match(cleaned="Widget", raw=None) is None


def test_items_take_their_familys_category() -> None:
    rows = _catalog()
    index = CatalogIndex(list(rows.values()))
    assert index.category_of(rows["chicken-breast"]) == "Groceries"
    assert index.category_of(rows["soft-drinks"]) == "Groceries"
