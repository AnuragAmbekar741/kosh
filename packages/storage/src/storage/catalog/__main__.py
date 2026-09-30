import sys
from pathlib import Path

from sqlmodel import Session

from storage import database
from storage.catalog import CATALOG_CSV
from storage.catalog.loader import CatalogError, read_catalog
from storage.crud.catalog import load_shared_catalog

_USAGE = "usage: python -m storage.catalog load [path/to/catalog.csv]"


def main(argv: list[str]) -> int:
    if not argv or argv[0] != "load" or len(argv) > 2:
        print(_USAGE, file=sys.stderr)
        return 2
    path = Path(argv[1]) if len(argv) == 2 else CATALOG_CSV
    try:
        rows = read_catalog(path)
    except CatalogError as exc:
        print(f"catalog is invalid:\n{exc}", file=sys.stderr)
        return 1
    with Session(database.engine) as session:
        result = load_shared_catalog(session, rows)
    print(
        f"catalog loaded: {len(rows)} rows, {result.inserted} inserted, "
        f"{result.updated} updated, {result.retired} retired"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
