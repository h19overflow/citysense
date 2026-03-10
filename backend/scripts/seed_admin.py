"""Seed the initial super admin.

Usage:
    python -m backend.scripts.seed_admin <email> <name>

Example:
    python -m backend.scripts.seed_admin admin@citysense.dev "Super Admin"
"""

import asyncio
import logging
import sys

from backend.db.crud import create_admin, get_admin_by_email
from backend.db.session import get_session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_super_admin(email: str, name: str) -> None:
    async with get_session() as session:
        existing = await get_admin_by_email(session, email)
        if existing:
            logger.info("Admin already exists: %s (%s)", existing.email, existing.role)
            return

        admin = await create_admin(
            session, email=email, name=name, role="super_admin"
        )
        logger.info("Super admin created: %s (id=%s)", admin.email, admin.id)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python -m backend.scripts.seed_admin <email> <name>")
        sys.exit(1)

    asyncio.run(seed_super_admin(sys.argv[1], sys.argv[2]))
