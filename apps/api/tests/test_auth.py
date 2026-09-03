from uuid import uuid4

from api.main import app
from fastapi.testclient import TestClient
from sqlmodel import Session
from storage.crud.user import get_local_identity_by_email
from storage.database import engine

_PASSWORD = "password1"


def _email() -> str:
    return f"{uuid4().hex}@example.com"


def _register(client: TestClient, email: str | None = None) -> tuple[str, dict]:
    email = email or _email()
    response = client.post(
        "/auth/register",
        json={"name": "Ada", "email": email, "password": _PASSWORD},
    )
    return email, response.json() if response.status_code < 400 else {}


def test_register_valid_user() -> None:
    client = TestClient(app)
    email = _email()
    response = client.post(
        "/auth/register",
        json={"name": "Ada", "email": email, "password": _PASSWORD},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == email
    assert body["token_type"] == "bearer"
    assert "access_token" in body
    assert "password" not in body
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


def test_register_duplicate_email() -> None:
    client = TestClient(app)
    email, _ = _register(client)
    response = client.post(
        "/auth/register",
        json={"name": "Ada", "email": email, "password": _PASSWORD},
    )
    assert response.status_code == 409


def test_register_invalid_email() -> None:
    response = TestClient(app).post(
        "/auth/register",
        json={"name": "Ada", "email": "not-an-email", "password": _PASSWORD},
    )
    assert response.status_code == 422


def test_password_stored_hashed() -> None:
    client = TestClient(app)
    email, _ = _register(client)
    with Session(engine) as session:
        identity = get_local_identity_by_email(session, email)
    assert identity is not None
    assert identity.password_hash is not None
    assert identity.password_hash != _PASSWORD


def test_login_succeeds() -> None:
    client = TestClient(app)
    email, _ = _register(client)
    response = client.post(
        "/auth/login", json={"email": email, "password": _PASSWORD}
    )
    assert response.status_code == 200
    assert response.json()["user"]["email"] == email
    assert "access_token" in response.json()


def test_login_wrong_password() -> None:
    client = TestClient(app)
    email, _ = _register(client)
    response = client.post(
        "/auth/login", json={"email": email, "password": "wrongpass"}
    )
    assert response.status_code == 401


def test_me_requires_token() -> None:
    response = TestClient(app).get("/users/me")
    assert response.status_code == 401


def test_me_with_access_token() -> None:
    client = TestClient(app)
    email, body = _register(client)
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "id": body["user"]["id"],
        "name": "Ada",
        "email": email,
    }


def test_refresh_rotates_and_revokes_old() -> None:
    client = TestClient(app)
    _register(client)
    old = client.cookies.get("refresh_token")
    assert old

    rotated = client.post("/auth/refresh")
    assert rotated.status_code == 200
    new = client.cookies.get("refresh_token")
    assert new
    assert new != old

    stale = TestClient(app)
    stale.cookies.set("refresh_token", old, path="/auth")
    replayed = stale.post("/auth/refresh")
    assert replayed.status_code == 401


def test_logout_then_refresh_rejected() -> None:
    client = TestClient(app)
    _register(client)
    logout = client.post("/auth/logout")
    assert logout.status_code == 204
    response = client.post("/auth/refresh")
    assert response.status_code == 401
