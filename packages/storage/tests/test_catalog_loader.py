from pathlib import Path

import pytest
from sqlmodel import Session, select
from storage import database
from storage.catalog import CATALOG_CSV
from storage.catalog.__main__ import main
from storage.catalog.loader import CatalogError, read_catalog
from storage.models.catalog import CatalogItem

_HEADER = "slug,parent_slug,name,synonyms,category\n"


def _csv(tmp_path: Path, body: str) -> Path:
    path = tmp_path / "catalog.csv"
    path.write_text(_HEADER + body, encoding="utf-8")
    return path


def test_reads_families_before_items_and_splits_synonyms(tmp_path: Path) -> None:
    path = _csv(
        tmp_path,
        "chicken-breast,chicken,Chicken breast,chx brst| bnls breast ,\n"
        "chicken,,Chicken,poultry,Groceries\n",
    )
    rows = read_catalog(path)
    assert [row.slug for row in rows] == ["chicken", "chicken-breast"]
    assert rows[1].synonyms == ("chx brst", "bnls breast")
    assert rows[1].category is None


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("Chicken,,Chicken,,Groceries\n", "kebab-case"),
        ("chicken,,Chicken,,Food\n", "needs one of the 14 categories"),
        ("chicken,,Chicken,,Groceries\nbreast,chicken,Breast,,Groceries\n", "inherits"),
        ("breast,chicken,Breast,,\n", "is not a family"),
        (
            "chicken,,Chicken,,Groceries\nbreast,chicken,Breast,,\nfillet,breast,Fillet,,\n",
            "is not a family",
        ),
        (
            "chicken,,Chicken,,Groceries\nchicken,,Poultry,,Groceries\n",
            "duplicate slug",
        ),
        (
            "chicken,,Chicken,,Groceries\na,chicken,Breast,,\nb,chicken,BREAST!,,\n",
            "'BREAST!' already names 'a'",
        ),
        (
            (
                "milk,,Milk,,Groceries\nchicken,,Chicken,,Groceries\n"
                "whole-milk,milk,Whole,,\nwhole-chicken,chicken,Whole,,\n"
            ),
            "'Whole' already names 'whole-milk'",
        ),
        ("nuts,,Nuts,,Groceries\nseeds,,Nuts, seeds,,Groceries\n", "too many values"),
        ("chicken,,,,Groceries\n", "name is empty"),
        (
            "fresh-fruit,,Fresh fruit,produce,Groceries\nveg,,Fresh vegetables,produce,Groceries\n",
            "'produce' already names 'fresh-fruit'",
        ),
        (
            "chicken,,Chicken,,Groceries\nturkey,,Turkey,chicken,Groceries\n",
            "'chicken' already names 'chicken'",
        ),
    ],
)
def test_rejects_invalid_rows(tmp_path: Path, body: str, message: str) -> None:
    with pytest.raises(CatalogError, match=message):
        read_catalog(_csv(tmp_path, body))


def test_reads_a_byte_order_mark(tmp_path: Path) -> None:
    path = tmp_path / "catalog.csv"
    path.write_text(_HEADER + "chicken,,Chicken,,Groceries\n", encoding="utf-8-sig")
    assert [row.slug for row in read_catalog(path)] == ["chicken"]


def test_rejects_unexpected_columns(tmp_path: Path) -> None:
    path = tmp_path / "catalog.csv"
    path.write_text("slug,name\nchicken,Chicken\n", encoding="utf-8")
    with pytest.raises(CatalogError, match="columns must be"):
        read_catalog(path)


def test_committed_catalog_is_valid() -> None:
    read_catalog(CATALOG_CSV)


def test_cli_loads_and_reloads(
    tmp_path: Path, session: Session, monkeypatch, capsys
) -> None:
    monkeypatch.setattr(database, "engine", session.get_bind())
    path = _csv(
        tmp_path, "chicken,,Chicken,,Groceries\nbreast,chicken,Chicken breast,,\n"
    )
    assert main(["load", str(path)]) == 0
    assert "2 inserted" in capsys.readouterr().out
    assert main(["load", str(path)]) == 0
    assert "0 inserted, 0 updated, 0 retired" in capsys.readouterr().out
    assert len(session.exec(select(CatalogItem)).all()) == 2


def test_cli_reports_invalid_catalog(tmp_path: Path, capsys) -> None:
    assert main(["load", str(_csv(tmp_path, "Chicken,,Chicken,,Groceries\n"))]) == 1
    assert "catalog is invalid" in capsys.readouterr().err
    assert main(["oops"]) == 2
