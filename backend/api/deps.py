"""Shared FastAPI dependencies."""

import logging

import jwt as pyjwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.api.auth import ClerkUser, verify_clerk_token
from backend.config import WEBHOOK_SECRET

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


def verify_webhook_secret(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> None:
    """Reject requests that lack a valid Bearer token when WEBHOOK_SECRET is set."""
    if not WEBHOOK_SECRET:
        return

    if credentials is None or credentials.credentials != WEBHOOK_SECRET:
        logger.warning("Webhook request rejected: invalid or missing Bearer token")
        raise HTTPException(status_code=401, detail="Invalid or missing webhook secret")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> ClerkUser:
    """Extract and verify Clerk JWT from Authorization header."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    try:
        return verify_clerk_token(credentials.credentials)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.PyJWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid token")


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> ClerkUser | None:
    """Like get_current_user but returns None for unauthenticated requests."""
    if credentials is None:
        return None

    try:
        return verify_clerk_token(credentials.credentials)
    except pyjwt.PyJWTError:
        return None


async def require_admin(
    user: ClerkUser = Depends(get_current_user),
) -> ClerkUser:
    """Verify the authenticated user exists in admin_profiles and is active."""
    from backend.db.crud import get_admin_by_email
    from backend.db.session import get_session

    if not user.email:
        raise HTTPException(status_code=403, detail="No email in token")

    async with get_session() as session:
        admin = await get_admin_by_email(session, user.email)

    if not admin:
        raise HTTPException(status_code=403, detail="Not an admin")

    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Admin account is deactivated")

    return user
