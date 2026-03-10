"""
Create all database tables defined in the ORM models.

Usage:
    python -m backend.scripts.create_tables
"""

import asyncio
import logging

from backend.db.base import Base
from backend.db.session import engine

# Import models so their table metadata is registered on Base
import backend.db.models  # noqa: F401

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_all_tables() -> None:
    logger.info("Connecting to database and creating tables...")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    logger.info("All tables created successfully.")


async def _create_and_dispose() -> None:
    await create_all_tables()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(_create_and_dispose())
