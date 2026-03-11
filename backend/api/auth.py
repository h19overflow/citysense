"""Clerk JWT verification for FastAPI.

Fetches Clerk's JWKS on first use, caches the keys, and provides
a FastAPI dependency to extract + verify Bearer tokens.
Uses Clerk Backend API to resolve email from user ID.
"""

import base64
import logging
import os
from dataclasses import dataclass

import httpx
import jwt
from jwt import PyJWKClient

logger = logging.getLogger(__name__)

_CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")


def _extract_issuer(publishable_key: str) -> str:
    """Derive the Clerk issuer URL from the publishable key."""
    prefix_end = publishable_key.index("_", 3) + 1
    encoded = publishable_key[prefix_end:]
    decoded = base64.b64decode(encoded + "==").decode().rstrip("$")
    return f"https://{decoded}"


_CLERK_PK = os.getenv("CLERK_PUBLISHABLE_KEY", "")
_CLERK_ISSUER = _extract_issuer(_CLERK_PK) if _CLERK_PK else ""
_JWKS_URL = f"{_CLERK_ISSUER}/.well-known/jwks.json" if _CLERK_ISSUER else ""
_jwk_client: PyJWKClient | None = None

# Cache user_id -> email to avoid repeated API calls
_email_cache: dict[str, str | None] = {}


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        if not _JWKS_URL:
            raise RuntimeError("CLERK_PUBLISHABLE_KEY not set — cannot verify JWTs")
        _jwk_client = PyJWKClient(_JWKS_URL, cache_keys=True)
    return _jwk_client


async def _fetch_clerk_user_email(user_id: str) -> str | None:
    """Fetch user email from Clerk Backend API, with caching."""
    if user_id in _email_cache:
        return _email_cache[user_id]

    if not _CLERK_SECRET_KEY:
        logger.warning("CLERK_SECRET_KEY not set — cannot fetch user email")
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.clerk.com/v1/users/{user_id}",
                headers={"Authorization": f"Bearer {_CLERK_SECRET_KEY}"},
            )
            response.raise_for_status()
            data = response.json()

            email = None
            primary_email_id = data.get("primary_email_address_id")
            for addr in data.get("email_addresses", []):
                if addr.get("id") == primary_email_id:
                    email = addr.get("email_address")
                    break

            if not email and data.get("email_addresses"):
                email = data["email_addresses"][0].get("email_address")

            _email_cache[user_id] = email
            return email
    except httpx.HTTPError as exc:
        logger.error("Failed to fetch Clerk user %s: %s", user_id, exc)
        return None


@dataclass(frozen=True)
class ClerkUser:
    """Verified user claims extracted from a Clerk JWT."""
    user_id: str
    email: str | None
    name: str | None
    org_id: str | None
    role: str | None


def _decode_token(token: str) -> dict:
    """Decode and verify a Clerk JWT, returning the raw payload."""
    client = _get_jwk_client()
    signing_key = client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        issuer=_CLERK_ISSUER,
        options={"verify_aud": False},
        leeway=30,
    )


async def verify_clerk_token(token: str) -> ClerkUser:
    """Verify a Clerk JWT and return the user claims.

    If the JWT doesn't contain email, fetches it from Clerk Backend API.
    Raises jwt.PyJWTError on invalid/expired tokens.
    """
    payload = _decode_token(token)
    user_id = payload.get("sub", "")
    email = payload.get("email")

    if not email and user_id:
        email = await _fetch_clerk_user_email(user_id)

    return ClerkUser(
        user_id=user_id,
        email=email,
        name=payload.get("name"),
        org_id=payload.get("org_id"),
        role=payload.get("org_role"),
    )
