"""Clerk JWT verification for FastAPI.

Fetches Clerk's JWKS on first use, caches the keys, and provides
a FastAPI dependency to extract + verify Bearer tokens.
"""

import base64
import logging
import os
from dataclasses import dataclass

import jwt
from jwt import PyJWKClient

logger = logging.getLogger(__name__)


def _extract_issuer(publishable_key: str) -> str:
    """Derive the Clerk issuer URL from the publishable key.

    The key is base64-encoded after the 'pk_test_' or 'pk_live_' prefix
    and decodes to '<slug>.clerk.accounts.dev$' (test) or similar.
    """
    prefix_end = publishable_key.index("_", 3) + 1  # after pk_test_ or pk_live_
    encoded = publishable_key[prefix_end:]
    decoded = base64.b64decode(encoded + "==").decode().rstrip("$")
    return f"https://{decoded}"


_CLERK_PK = os.getenv("CLERK_PUBLISHABLE_KEY", "")
_CLERK_ISSUER = _extract_issuer(_CLERK_PK) if _CLERK_PK else ""
_JWKS_URL = f"{_CLERK_ISSUER}/.well-known/jwks.json" if _CLERK_ISSUER else ""
_jwk_client: PyJWKClient | None = None


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        if not _JWKS_URL:
            raise RuntimeError("CLERK_PUBLISHABLE_KEY not set — cannot verify JWTs")
        _jwk_client = PyJWKClient(_JWKS_URL, cache_keys=True)
    return _jwk_client


@dataclass(frozen=True)
class ClerkUser:
    """Verified user claims extracted from a Clerk JWT."""
    user_id: str
    email: str | None
    name: str | None
    org_id: str | None
    role: str | None


def verify_clerk_token(token: str) -> ClerkUser:
    """Verify a Clerk JWT and return the user claims.

    Raises jwt.PyJWTError on invalid/expired tokens.
    """
    client = _get_jwk_client()
    signing_key = client.get_signing_key_from_jwt(token)

    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        issuer=_CLERK_ISSUER,
        options={"verify_aud": False},
    )

    return ClerkUser(
        user_id=payload.get("sub", ""),
        email=payload.get("email"),
        name=payload.get("name"),
        org_id=payload.get("org_id"),
        role=payload.get("org_role"),
    )
