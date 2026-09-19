from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session
from storage.crud.spend import create_spend_item
from storage.models.spend import SpendSource, SpendStatus

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


def test_repeatable_category_and_q(client) -> None:
    headers = _auth(client)
    client.post("/spend-items", json=_payload(), headers=headers)
    client.post(
        "/spend-items",
        json=_payload(
            merchant="Starbucks",
            amount="4.50",
            spent_at="2024-11-01",
            category="coffee",
            description="Iced latte",
        ),
        headers=headers,
    )
    client.post(
        "/spend-items",
        json=_payload(merchant="Target", amount="9.00", category="shopping"),
        headers=headers,
    )
    both = client.get(
        "/spend-items",
        params=[("category", "groceries"), ("category", "coffee")],
        headers=headers,
    )
    assert {row["merchant"] for row in both.json()} == {"Walmart", "Starbucks"}
    by_merchant = client.get("/spend-items", params={"q": "STAR"}, headers=headers)
    assert [row["merchant"] for row in by_merchant.json()] == ["Starbucks"]
    by_description = client.get("/spend-items", params={"q": "latte"}, headers=headers)
    assert [row["merchant"] for row in by_description.json()] == ["Starbucks"]
    exact = client.get("/spend-items", params={"merchant": "Walmart"}, headers=headers)
    assert len(exact.json()) == 1
    missed = client.get("/spend-items", params={"merchant": "wal"}, headers=headers)
    assert missed.json() == []


def test_summary_totals_and_bill_count(client) -> None:
    headers = _auth(client)
    created = client.post(
        "/documents/manual", json={"title": "Trader Joe's"}, headers=headers
    )
    document_id = created.json()["id"]
    client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Milk", "amount": "4.00", "category": "Food"},
        headers=headers,
    )
    client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Eggs", "amount": "6.00", "category": "Food"},
        headers=headers,
    )
    client.post(
        "/spend-items",
        json=_payload(merchant="Cash", amount="5.00", category="Other"),
        headers=headers,
    )
    body = client.get("/spend-items/summary", headers=headers).json()
    assert body["currency"] == "USD"
    assert body["total"] == "15.00"
    assert body["item_count"] == 3
    assert body["bill_count"] == 2
    assert body["avg_per_bill"] == "7.50"
    assert body["has_spend"] is True
    assert body["comparison"] is None
    names = [row["name"] for row in body["categories"]]
    assert names == ["Food", "Other"]
    assert body["categories"][0]["amount"] == "10.00"
    assert body["categories"][0]["percent"] == 200 / 3
    assert body["categories"][1]["amount"] == "5.00"
    assert body["categories"][1]["percent"] == 100 / 3


def test_summary_category_filter_does_not_change_mix(client) -> None:
    headers = _auth(client)
    client.post(
        "/spend-items",
        json=_payload(amount="30.00", category="Food", spent_at="2024-09-10"),
        headers=headers,
    )
    client.post(
        "/spend-items",
        json=_payload(
            merchant="Pharmacy",
            amount="10.00",
            category="Health",
            spent_at="2024-09-11",
        ),
        headers=headers,
    )
    client.post(
        "/spend-items",
        json=_payload(
            merchant="Unknown",
            amount="10.00",
            category=None,
            spent_at="2024-09-12",
        ),
        headers=headers,
    )
    params = {
        "spent_from": "2024-09-01",
        "spent_to": "2024-09-30",
        "category": "Food",
    }
    body = client.get("/spend-items/summary", params=params, headers=headers).json()
    assert body["total"] == "30.00"
    assert body["item_count"] == 1
    assert body["bill_count"] == 1
    assert {row["name"] for row in body["categories"]} == {"Food", "Health"}
    by_name = {row["name"]: row for row in body["categories"]}
    assert by_name["Food"]["amount"] == "30.00"
    assert by_name["Food"]["percent"] == 60.0
    assert by_name["Health"]["percent"] == 20.0


def test_summary_month_comparison(client) -> None:
    headers = _auth(client)
    client.post(
        "/spend-items",
        json=_payload(amount="100.00", category="Food", spent_at="2024-08-15"),
        headers=headers,
    )
    client.post(
        "/spend-items",
        json=_payload(amount="112.00", category="Food", spent_at="2024-09-15"),
        headers=headers,
    )
    month = client.get(
        "/spend-items/summary",
        params={
            "spent_from": "2024-09-01",
            "spent_to": "2024-09-30",
            "period": "month",
        },
        headers=headers,
    ).json()
    assert month["total"] == "112.00"
    assert month["comparison"] == {
        "delta_percent": 12.0,
        "previous_label": "August",
    }
    for period in ("day", "week", "custom"):
        body = client.get(
            "/spend-items/summary",
            params={
                "spent_from": "2024-09-01",
                "spent_to": "2024-09-30",
                "period": period,
            },
            headers=headers,
        ).json()
        assert body["comparison"] is None


def test_summary_month_comparison_null_when_previous_empty(client) -> None:
    headers = _auth(client)
    client.post(
        "/spend-items",
        json=_payload(amount="20.00", spent_at="2024-09-15"),
        headers=headers,
    )
    body = client.get(
        "/spend-items/summary",
        params={
            "spent_from": "2024-09-01",
            "spent_to": "2024-09-30",
            "period": "month",
        },
        headers=headers,
    ).json()
    assert body["total"] == "20.00"
    assert body["comparison"] is None


def test_summary_has_spend_and_empty_states(client) -> None:
    headers = _auth(client)
    empty = client.get("/spend-items/summary", headers=headers).json()
    assert empty["has_spend"] is False
    assert empty["total"] == "0.00"
    assert empty["bill_count"] == 0
    assert empty["item_count"] == 0
    assert empty["avg_per_bill"] == "0.00"
    assert empty["categories"] == []
    client.post("/spend-items", json=_payload(), headers=headers)
    filtered = client.get(
        "/spend-items/summary",
        params={"spent_from": "2024-11-01", "spent_to": "2024-11-30"},
        headers=headers,
    ).json()
    assert filtered["has_spend"] is True
    assert filtered["total"] == "0.00"
    assert filtered["item_count"] == 0


def test_summary_excludes_pending_review_and_other_users(client, db_engine) -> None:
    headers_a = _auth(client)
    me = client.get("/users/me", headers=headers_a).json()
    client.post(
        "/spend-items",
        json=_payload(amount="10.00", category="Food"),
        headers=headers_a,
    )
    with Session(db_engine) as session:
        create_spend_item(
            session,
            user_id=UUID(me["id"]),
            merchant="Draft Co",
            amount=Decimal("99.00"),
            currency="USD",
            spent_at=date(2024, 10, 19),
            source=SpendSource.DOCUMENT,
            status=SpendStatus.PENDING_REVIEW,
            category="Food",
        )
    own = client.get("/spend-items/summary", headers=headers_a).json()
    assert own["total"] == "10.00"
    assert own["item_count"] == 1
    headers_b = _auth(client)
    other = client.get("/spend-items/summary", headers=headers_b).json()
    assert other["has_spend"] is False
    assert other["total"] == "0.00"
    listed = client.get("/spend-items", headers=headers_b)
    assert listed.json() == []


def test_summary_is_not_captured_as_item_id(client) -> None:
    headers = _auth(client)
    response = client.get("/spend-items/summary", headers=headers)
    assert response.status_code == 200, response.json()
    assert "has_spend" in response.json()
