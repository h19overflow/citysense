import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://citysense:citysense_dev@localhost:5432/citysense",
)

# NullPool disables connection pooling entirely. Each connection is opened
# and closed per-use, which is required for Celery workers that call
# asyncio.run() per task (each call creates a new event loop). A pooled
# engine created in one loop cannot be reused in another loop without this.
engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    session = AsyncSessionLocal()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Depends() compatible session generator."""
    async with get_session() as session:
        yield session
