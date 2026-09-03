from dataclasses import dataclass
from urllib.error import URLError

import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError

from security.settings import get_settings

__all__ = [
    "GoogleClaims",
    "GoogleNotConfiguredError",
    "GoogleUnavailableError",
    "InvalidGoogleTokenError",
    "verify_google_id_token",
]

_ISSUERS = ("https://accounts.google.com", "accounts.google.com")
_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_jwks_client: PyJWKClient | None = None


class GoogleNotConfiguredError(Exception):
    pass


class GoogleUnavailableError(Exception):
    pass


class InvalidGoogleTokenError(Exception):
    pass


@dataclass(frozen=True)
class GoogleClaims:
    subject: str
    email: str
    name: str


def _jwks() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(_JWKS_URL)
    return _jwks_client


def verify_google_id_token(token: str) -> GoogleClaims:
    audience = get_settings().google_client_id
    if not audience:
        raise GoogleNotConfiguredError
    try:
        signing_key = _jwks().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=audience,
            issuer=_ISSUERS,
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
    except (InvalidTokenError, PyJWKClientError) as exc:
        raise InvalidGoogleTokenError from exc
    except (URLError, TimeoutError, OSError) as exc:
        raise GoogleUnavailableError from exc

    email = payload.get("email")
    verified = payload.get("email_verified")
    if not email or verified not in (True, "true"):
        raise InvalidGoogleTokenError
    name = payload.get("name") or str(email).split("@", 1)[0]
    return GoogleClaims(subject=str(payload["sub"]), email=str(email), name=name)
