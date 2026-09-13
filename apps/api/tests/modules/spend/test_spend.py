from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient

_PASSWORD = "password1"


def _email() -> str:
    return f"{uuid4().hex}@example.com"


def _auth(client: TestClient) -> dict[str, str]:
    email = _email()
    response = client.post(
        "/auth/register",
        json={"name": "Ada", "email": email, "password": _PASSWORD},
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _payload(**overrides: object) -> dict:
    body: dict = {
        "merchant": "Walmart",
        "amount": "12.34",
        "currency": "usd",
        "spent_at": "2024-10-19",
        "category": "groceries",
    }
    body.update(overrides)
    return body


def test_create_spend_item(client) -> None:
    headers = _auth(client)
    response = client.post("/spend-items", json=_payload(), headers=headers)
    assert response.status_code == 201
    body = response.json()
    assert body["merchant"] == "Walmart"
    assert body["amount"] == "12.34"
    assert body["currency"] == "USD"
    assert body["spent_at"] == "2024-10-19"
    assert body["source"] == "manual"
    assert body["status"] == "confirmed"
    assert Decimal(body["amount"]) == Decimal("12.34")


def test_unauthenticated_rejected(client) -> None:
    response = client.post("/spend-items", json=_payload())
    assert response.status_code == 401


def test_zero_and_negative_amount_rejected(client) -> None:
    headers = _auth(client)
    zero = client.post("/spend-items", json=_payload(amount="0"), headers=headers)
    assert zero.status_code == 422
    negative = client.post(
        "/spend-items", json=_payload(amount="-1.00"), headers=headers
    )
    assert negative.status_code == 422


def test_get_and_list_spend_items(client) -> None:
    headers = _auth(client)
    created = client.post("/spend-items", json=_payload(), headers=headers).json()
    item_id = created["id"]
    got = client.get(f"/spend-items/{item_id}", headers=headers)
    assert got.status_code == 200
    assert got.json()["id"] == item_id
    listed = client.get("/spend-items", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_filters(client) -> None:
    headers = _auth(client)
    client.post("/spend-items", json=_payload(), headers=headers)
    client.post(
        "/spend-items",
        json=_payload(
            merchant="Starbucks",
            amount="4.50",
            spent_at="2024-11-01",
            category="coffee",
        ),
        headers=headers,
    )
    groceries = client.get(
        "/spend-items", params={"category": "groceries"}, headers=headers
    )
    assert len(groceries.json()) == 1
    assert groceries.json()[0]["merchant"] == "Walmart"
    coffee = client.get(
        "/spend-items", params={"merchant": "Starbucks"}, headers=headers
    )
    assert len(coffee.json()) == 1
    ranged = client.get(
        "/spend-items",
        params={"spent_from": "2024-11-01", "spent_to": "2024-11-30"},
        headers=headers,
    )
    assert len(ranged.json()) == 1
    manual = client.get("/spend-items", params={"source": "manual"}, headers=headers)
    assert len(manual.json()) == 2


def test_patch_and_delete(client) -> None:
    headers = _auth(client)
    created = client.post("/spend-items", json=_payload(), headers=headers).json()
    item_id = created["id"]
    patched = client.patch(
        f"/spend-items/{item_id}",
        json={"merchant": "Target", "amount": "20.00", "description": None},
        headers=headers,
    )
    assert patched.status_code == 200
    assert patched.json()["merchant"] == "Target"
    assert patched.json()["amount"] == "20.00"
    deleted = client.delete(f"/spend-items/{item_id}", headers=headers)
    assert deleted.status_code == 204
    missing = client.get(f"/spend-items/{item_id}", headers=headers)
    assert missing.status_code == 404


def test_user_cannot_access_another_users_item(client) -> None:
    headers_a = _auth(client)
    created = client.post("/spend-items", json=_payload(), headers=headers_a).json()
    item_id = created["id"]
    headers_b = _auth(client)
    assert client.get(f"/spend-items/{item_id}", headers=headers_b).status_code == 404
    assert (
        client.patch(
            f"/spend-items/{item_id}", json={"merchant": "Nope"}, headers=headers_b
        ).status_code
        == 404
    )
    assert (
        client.delete(f"/spend-items/{item_id}", headers=headers_b).status_code == 404
    )
    listed = client.get("/spend-items", headers=headers_b)
    assert listed.json() == []
