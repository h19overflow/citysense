"""Auth endpoints — user identity and role checking."""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from backend.api.auth import ClerkUser
from backend.api.deps import get_current_user
from backend.db.crud import get_admin_by_email
from backend.db.session import get_session

router = APIRouter(tags=["auth"])


@router.get("/auth/me")
async def get_me(user: ClerkUser = Depends(get_current_user)) -> JSONResponse:
    """Return the current user's identity and admin status."""
    is_admin = False

    if user.email:
        async with get_session() as session:
            admin = await get_admin_by_email(session, user.email)
            is_admin = admin is not None and admin.is_active

    return JSONResponse({
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "is_admin": is_admin,
    })
