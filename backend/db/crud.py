"""Public re-export facade for all CRUD helpers."""

from backend.db.crud_admin import (
    create_admin,
    delete_admin,
    get_admin_by_email,
    get_admin_by_id,
    list_admins,
    update_admin,
)
from backend.db.crud_citizen import (
    create_citizen,
    delete_citizen,
    get_citizen_by_email,
    get_citizen_by_id,
    list_citizens,
    update_citizen,
)

__all__ = [
    "create_citizen",
    "get_citizen_by_id",
    "get_citizen_by_email",
    "list_citizens",
    "update_citizen",
    "delete_citizen",
    "create_admin",
    "get_admin_by_id",
    "get_admin_by_email",
    "list_admins",
    "update_admin",
    "delete_admin",
]
