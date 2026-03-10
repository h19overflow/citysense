"""SQLAlchemy ORM models."""

from backend.db.models.citizen_profile import CitizenProfile
from backend.db.models.admin_profile import AdminProfile

__all__ = ["CitizenProfile", "AdminProfile"]
