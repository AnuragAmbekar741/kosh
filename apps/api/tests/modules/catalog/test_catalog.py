from uuid import uuid4

from sqlmodel import Session
from storage import database
from storage.crud.catalog import CatalogRow, load_shared_catalog


def _auth(client) -> dict[str, str]:
    response = client.post(
        "/auth/register",
        json={"name": "Ada", "email": f"{uuid4()}@x.io", "password": "pw-12345678"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _seed() -> None:
    with Session(database.engine) as session:
        load_shared_catalog(
            session,
            [
                CatalogRow("chicken", None, "Chicken", ("poultry",), "Groceries"),
                CatalogRow("chicken-breast", "chicken", "Chicken breast", (), None),
                CatalogRow("canned-chicken", "chicken", "Canned chicken", (), None),
                CatalogRow("laundry", None, "Laundry detergent", (), "Household"),
                CatalogRow("pods", "laundry", "Laundry pods", ("tide pods",), None),
            ],
        )


def test_search_ranks_prefix_then_contains_then_synonyms(client) -> None:
    _seed()
    headers = _auth(client)
    names = [
        entry["name"]
        for entry in client.get(
            "/catalog/search", params={"q": "chicken"}, headers=headers
        ).json()
    ]
    assert names == ["Chicken", "Chicken breast", "Canned chicken"]
    pods = client.get("/catalog/search", params={"q": "tide"}, headers=headers).json()
    assert pods == [
        {
            "id": pods[0]["id"],
            "name": "Laundry pods",
            "family": "Laundry detergent",
            "category": "Household",
            "is_family": False,
            "mine": False,
        }
    ]
    family = client.get(
        "/catalog/search", params={"q": "poultry"}, headers=headers
    ).json()
    assert [(e["name"], e["is_family"], e["category"]) for e in family] == [
        ("Chicken", True, "Groceries")
    ]


def test_search_needs_a_query_and_a_user(client) -> None:
    headers = _auth(client)
    assert client.get("/catalog/search", headers=headers).status_code == 422
    assert client.get("/catalog/search", params={"q": "x"}).status_code == 401
