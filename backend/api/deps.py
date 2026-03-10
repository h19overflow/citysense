"""Shared FastAPI dependencies."""

import logging

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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
