from datetime import UTC, datetime, timedelta
from unittest.mock import Mock
from uuid import uuid4

import jwt
import pytest
from fastapi import HTTPException
from jwt.exceptions import PyJWKClientConnectionError, PyJWKClientError
from security import decode_access_token, google
from security.settings import get_settings


@pytest.mark.parametrize("claim", ["exp", "sub"])
def test_access_token_requires_claims(claim) -> None:
    payload = {"sub": str(uuid4()), "exp": datetime.now(UTC) + timedelta(minutes=5)}
    del payload[claim]
    token = jwt.encode(payload, get_settings().jwt_secret, algorithm="HS256")
    # Decode directly: an unknown user would also produce 401 at /users/me,
    # masking an incorrectly accepted token.
    with pytest.raises(HTTPException) as error:
        decode_access_token(token)
    assert error.value.status_code == 401


def test_expired_access_token(client) -> None:
    registered = client.post(
        "/auth/register",
        json={"name": "Ada", "email": "ada@example.com", "password": "password1"},
    )
    assert registered.status_code == 201
    token = jwt.encode(
        {
            "sub": registered.json()["user"]["id"],
            "exp": datetime.now(UTC) - timedelta(seconds=1),
        },
        get_settings().jwt_secret,
        algorithm="HS256",
    )
    response = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


@pytest.mark.parametrize(
    ("error", "expected_status"),
    [
        (PyJWKClientConnectionError("offline"), 503),
        (PyJWKClientError("unknown key"), 401),
    ],
)
def test_google_key_errors(client, monkeypatch, error, expected_status) -> None:
    jwks = Mock()
    jwks.get_signing_key_from_jwt.side_effect = error
    monkeypatch.setattr(google, "_jwks", lambda: jwks)
    response = client.post("/auth/google", json={"id_token": "fake"})
    assert response.status_code == expected_status
