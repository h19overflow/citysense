"""Auth endpoints — user identity, role checking, and admin management."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr

from backend.api.auth import ClerkUser
from backend.api.deps import get_current_user, require_admin
from backend.db.crud import (
    create_admin,
    get_admin_by_email,
    list_admins,
    update_admin,
)
from backend.db.session import get_session

router = APIRouter(tags=["auth"])


@router.get("/auth/me")
async def get_me(user: ClerkUser = Depends(get_current_user)) -> JSONResponse:
    """Return the current user's identity and admin status."""
    is_admin = False
    admin_role = None

    if user.email:
        async with get_session() as session:
            admin = await get_admin_by_email(session, user.email)
            if admin and admin.is_active:
                is_admin = True
                admin_role = admin.role

    return JSONResponse({
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "is_admin": is_admin,
        "admin_role": admin_role,
    })


class PromoteAdminRequest(BaseModel):
    email: EmailStr
    name: str
    role: str = "admin"
    department: str | None = None


@router.post("/admin/promote")
async def promote_to_admin(
    body: PromoteAdminRequest,
    user: ClerkUser = Depends(require_admin),
) -> JSONResponse:
    """Promote a user to admin. Requires super_admin role."""
    async with get_session() as session:
        caller = await get_admin_by_email(session, user.email)
        if not caller or caller.role != "super_admin":
            raise HTTPException(status_code=403, detail="Only super admins can promote")

        existing = await get_admin_by_email(session, body.email)
        if existing:
            raise HTTPException(status_code=409, detail="User is already an admin")

        admin = await create_admin(
            session,
            email=body.email,
            name=body.name,
            role=body.role,
            department=body.department,
        )

    return JSONResponse(
        {"id": admin.id, "email": admin.email, "role": admin.role},
        status_code=201,
    )


@router.post("/admin/demote")
async def demote_admin(
    body: dict,
    user: ClerkUser = Depends(require_admin),
) -> JSONResponse:
    """Deactivate an admin. Requires super_admin role."""
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=422, detail="email is required")

    async with get_session() as session:
        caller = await get_admin_by_email(session, user.email)
        if not caller or caller.role != "super_admin":
            raise HTTPException(status_code=403, detail="Only super admins can demote")

        target = await get_admin_by_email(session, email)
        if not target:
            raise HTTPException(status_code=404, detail="Admin not found")

        if target.email == user.email:
            raise HTTPException(status_code=400, detail="Cannot demote yourself")

        await update_admin(session, target.id, is_active=False)

    return JSONResponse({"status": "ok", "email": email, "is_active": False})


@router.get("/admin/list")
async def list_all_admins(
    _user: ClerkUser = Depends(require_admin),
) -> JSONResponse:
    """List all admins. Requires admin role."""
    async with get_session() as session:
        admins = await list_admins(session)

    return JSONResponse({
        "admins": [
            {
                "id": a.id,
                "email": a.email,
                "name": a.name,
                "role": a.role,
                "department": a.department,
                "is_active": a.is_active,
            }
            for a in admins
        ]
    })
