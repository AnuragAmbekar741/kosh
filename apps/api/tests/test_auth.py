from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from security import GoogleClaims, GoogleNotConfiguredError, InvalidGoogleTokenError
from sqlmodel import Session
from storage.crud.user import (
    get_identity_by_provider,
    get_local_identity_by_email,
    get_user_by_email,
)
from storage.models import AuthProvider

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


def test_register_valid_user(client) -> None:
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


def test_register_duplicate_email(client) -> None:
    email, _ = _register(client)
    response = client.post(
        "/auth/register",
        json={"name": "Ada", "email": email, "password": _PASSWORD},
    )
    assert response.status_code == 409


def test_register_invalid_email(client) -> None:
    response = client.post(
        "/auth/register",
        json={"name": "Ada", "email": "not-an-email", "password": _PASSWORD},
    )
    assert response.status_code == 422


def test_password_stored_hashed(client, db_engine) -> None:
    email, _ = _register(client)
    with Session(db_engine) as session:
        identity = get_local_identity_by_email(session, email)
    assert identity is not None
    assert identity.password_hash is not None
    assert identity.password_hash != _PASSWORD


def test_login_succeeds(client) -> None:
    email, _ = _register(client)
    response = client.post("/auth/login", json={"email": email, "password": _PASSWORD})
    assert response.status_code == 200
    assert response.json()["user"]["email"] == email
    assert "access_token" in response.json()


def test_login_wrong_password(client) -> None:
    email, _ = _register(client)
    response = client.post(
        "/auth/login", json={"email": email, "password": "wrongpass"}
    )
    assert response.status_code == 401


def test_me_requires_token(client) -> None:
    response = client.get("/users/me")
    assert response.status_code == 401


def test_me_with_access_token(client) -> None:
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


def test_refresh_rotates_and_revokes_old(client) -> None:
    _register(client)
    old = client.cookies.get("refresh_token")
    assert old

    rotated = client.post("/auth/refresh")
    assert rotated.status_code == 200
    new = client.cookies.get("refresh_token")
    assert new
    assert new != old

    client.cookies.clear()
    client.cookies.set("refresh_token", old, path="/auth")
    replayed = client.post("/auth/refresh")
    assert replayed.status_code == 401


def test_logout_then_refresh_rejected(client) -> None:
    _register(client)
    logout = client.post("/auth/logout")
    assert logout.status_code == 204
    response = client.post("/auth/refresh")
    assert response.status_code == 401


def _google_claims(**overrides: str) -> GoogleClaims:
    return GoogleClaims(
        subject=overrides.get("subject", uuid4().hex),
        email=overrides.get("email", f"{uuid4().hex}@gmail.com"),
        name=overrides.get("name", "Ada"),
    )


def test_google_creates_user(client, db_engine, monkeypatch) -> None:
    claims = _google_claims()
    monkeypatch.setattr("api.auth.verify_google_id_token", lambda _token: claims)
    response = client.post("/auth/google", json={"id_token": "fake"})
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == claims.email
    assert "access_token" in body
    with Session(db_engine) as session:
        identity = get_identity_by_provider(
            session, AuthProvider.GOOGLE, claims.subject
        )
    assert identity is not None
    assert identity.password_hash is None


def test_google_existing_identity_logs_in(client, monkeypatch) -> None:
    claims = _google_claims()
    monkeypatch.setattr("api.auth.verify_google_id_token", lambda _token: claims)
    first = client.post("/auth/google", json={"id_token": "fake"})
    second = client.post("/auth/google", json={"id_token": "fake"})
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["user"]["id"] == second.json()["user"]["id"]


def test_google_rejects_existing_local_email(client, db_engine, monkeypatch) -> None:
    email, body = _register(client)
    claims = _google_claims(email=email.upper())
    monkeypatch.setattr("api.auth.verify_google_id_token", lambda _token: claims)
    client.cookies.clear()
    response = client.post("/auth/google", json={"id_token": "fake"})
    assert response.status_code == 409
    assert "access_token" not in response.json()
    assert "set-cookie" not in response.headers
    with Session(db_engine) as session:
        google = get_identity_by_provider(session, AuthProvider.GOOGLE, claims.subject)
        local = get_local_identity_by_email(session, email)
    assert google is None
    assert local is not None
    assert str(local.user_id) == body["user"]["id"]
    login = client.post("/auth/login", json={"email": email, "password": _PASSWORD})
    assert login.status_code == 200
    assert login.json()["user"]["id"] == body["user"]["id"]


def test_google_invalid_token(client, monkeypatch) -> None:
    def boom(_token: str) -> None:
        raise InvalidGoogleTokenError

    monkeypatch.setattr("api.auth.verify_google_id_token", boom)
    response = client.post("/auth/google", json={"id_token": "fake"})
    assert response.status_code == 401


@pytest.mark.parametrize("provider", [AuthProvider.LOCAL, AuthProvider.GOOGLE])
def test_google_registration_collision(
    client, db_engine, monkeypatch, provider
) -> None:
    claims = _google_claims()
    monkeypatch.setattr("api.auth.verify_google_id_token", lambda _token: claims)
    if provider == AuthProvider.LOCAL:
        _register(client, claims.email)
    else:
        assert client.post("/auth/google", json={"id_token": "fake"}).status_code == 200
    with Session(db_engine) as session:
        user = get_user_by_email(session, claims.email)
        identity = get_identity_by_provider(
            session, AuthProvider.GOOGLE, claims.subject
        )
    # Simulate another registration winning after our initial lookups. The
    # insert hits the real unique constraint; recovery must use the subject.
    monkeypatch.setattr("api.auth.get_user_by_email", Mock(side_effect=[None, user]))
    monkeypatch.setattr(
        "api.auth.get_identity_by_provider", Mock(side_effect=[None, identity])
    )
    client.cookies.clear()
    response = client.post("/auth/google", json={"id_token": "fake"})
    if provider == AuthProvider.LOCAL:
        assert response.status_code == 409
        assert "set-cookie" not in response.headers
        with Session(db_engine) as session:
            assert (
                get_identity_by_provider(session, AuthProvider.GOOGLE, claims.subject)
                is None
            )
    else:
        assert response.status_code == 200
        assert response.json()["user"]["id"] == str(user.id)


def test_google_not_configured(client, monkeypatch) -> None:
    def boom(_token: str) -> None:
        raise GoogleNotConfiguredError

    monkeypatch.setattr("api.auth.verify_google_id_token", boom)
    response = client.post("/auth/google", json={"id_token": "fake"})
    assert response.status_code == 503


def test_google_empty_id_token(client) -> None:
    response = client.post("/auth/google", json={"id_token": ""})
    assert response.status_code == 422


def test_me_with_google_access_token(client, monkeypatch) -> None:
    claims = _google_claims()
    monkeypatch.setattr("api.auth.verify_google_id_token", lambda _token: claims)
    body = client.post("/auth/google", json={"id_token": "fake"}).json()
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == claims.email
