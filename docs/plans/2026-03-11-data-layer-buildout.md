# Data Layer Build-Out Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace static JSON file storage with a proper PostgreSQL data layer — models, CRUD, Alembic migrations, API endpoints, scraper rewiring, and frontend API fetching.

**Architecture:** All scraped data (news, jobs, housing, benefits) moves from JSON files to PostgreSQL tables. JSONB columns for semi-structured fields. Scrapers upsert to DB. New API endpoints serve data. Frontend fetches from API instead of static files.

**Tech Stack:** SQLAlchemy 2.0 (async), Alembic (async), FastAPI, asyncpg, PostgreSQL JSONB

---

## Task 1: Alembic Setup

**Files:**
- Install: `alembic` + `asyncpg` packages
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/` (empty dir)

**Step 1: Install alembic**

Run:
```bash
pip install alembic
```

**Step 2: Initialize alembic in backend/**

Run from `backend/`:
```bash
cd backend && alembic init alembic
```

**Step 3: Configure alembic.ini**

Edit `backend/alembic.ini`:
- Set `script_location = alembic`
- Set `sqlalchemy.url` to empty (we'll use env.py for async)

**Step 4: Configure async env.py**

Replace `backend/alembic/env.py` with async version:

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from backend.db.base import Base
from backend.db.session import DATABASE_URL

# Import all models so Base.metadata is populated
from backend.db.models import *  # noqa: F401, F403

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = create_async_engine(DATABASE_URL)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

**Step 5: Verify alembic can see existing models**

Run:
```bash
cd backend && alembic check
```

Expected: No errors (may say "no new revision needed" since no migrations exist yet).

**Step 6: Commit**

```
chore(db): initialize Alembic with async PostgreSQL
```

---

## Task 2: News Article Model

**Files:**
- Create: `backend/db/models/news_article.py`
- Modify: `backend/db/models/__init__.py`

**Step 1: Create news_article.py**

```python
"""NewsArticle ORM model."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id: Mapped[str] = mapped_column(String(12), primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    excerpt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    source_url: Mapped[str] = mapped_column(String(2048), nullable=False, default="")
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    published_at: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    upvotes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    misinfo_risk: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reaction_counts: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        Index("ix_news_articles_category", "category"),
        Index("ix_news_articles_scraped_at", "scraped_at"),
    )
```

**Step 2: Update models/__init__.py**

Add `NewsArticle` to the imports and `__all__`.

**Step 3: Verify import**

Run:
```bash
python -c "from backend.db.models import NewsArticle; print(NewsArticle.__tablename__)"
```

Expected: `news_articles`

---

## Task 3: News Comment Model

**Files:**
- Create: `backend/db/models/news_comment.py`
- Modify: `backend/db/models/__init__.py`

**Step 1: Create news_comment.py**

```python
"""NewsComment ORM model."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class NewsComment(Base):
    __tablename__ = "news_comments"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    article_id: Mapped[str] = mapped_column(
        String(12), ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=False
    )
    citizen_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("citizen_profiles.id", ondelete="CASCADE"), nullable=False
    )
    citizen_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_initials: Mapped[str] = mapped_column(String(5), nullable=False, default="")
    avatar_color: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_news_comments_article_id", "article_id"),
    )
```

**Step 2: Update models/__init__.py**

Add `NewsComment` import and `__all__` entry.

**Step 3: Verify import**

Run:
```bash
python -c "from backend.db.models import NewsComment; print(NewsComment.__tablename__)"
```

Expected: `news_comments`

---

## Task 4: Job Listing Model

**Files:**
- Create: `backend/db/models/job_listing.py`
- Modify: `backend/db/models/__init__.py`

**Step 1: Create job_listing.py**

```python
"""JobListing ORM model."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class JobListing(Base):
    __tablename__ = "job_listings"

    id: Mapped[str] = mapped_column(String(12), primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    address: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    url: Mapped[str] = mapped_column(String(2048), nullable=False, default="")
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    properties: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        Index("ix_job_listings_source", "source"),
    )
```

**Step 2: Update models/__init__.py**

Add `JobListing` import and `__all__` entry.

**Step 3: Verify import**

Run:
```bash
python -c "from backend.db.models import JobListing; print(JobListing.__tablename__)"
```

---

## Task 5: Housing Listing Model

**Files:**
- Create: `backend/db/models/housing_listing.py`
- Modify: `backend/db/models/__init__.py`

**Step 1: Create housing_listing.py**

```python
"""HousingListing ORM model."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class HousingListing(Base):
    __tablename__ = "housing_listings"

    id: Mapped[str] = mapped_column(String(12), primary_key=True)
    address: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    properties: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        Index("ix_housing_listings_scraped_at", "scraped_at"),
    )
```

**Step 2: Update models/__init__.py**

Add `HousingListing` import and `__all__` entry.

**Step 3: Verify import**

Run:
```bash
python -c "from backend.db.models import HousingListing; print(HousingListing.__tablename__)"
```

---

## Task 6: Benefit Service Model

**Files:**
- Create: `backend/db/models/benefit_service.py`
- Modify: `backend/db/models/__init__.py`

**Step 1: Create benefit_service.py**

```python
"""BenefitService ORM model."""

from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class BenefitService(Base):
    __tablename__ = "benefit_services"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    provider: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    url: Mapped[str] = mapped_column(String(2048), nullable=False, default="")
    phone: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        Index("ix_benefit_services_category", "category"),
    )
```

**Step 2: Update models/__init__.py — final state**

```python
"""SQLAlchemy ORM models."""

from backend.db.models.admin_profile import AdminProfile
from backend.db.models.benefit_service import BenefitService
from backend.db.models.citizen_profile import CitizenProfile
from backend.db.models.housing_listing import HousingListing
from backend.db.models.job_listing import JobListing
from backend.db.models.news_article import NewsArticle
from backend.db.models.news_comment import NewsComment

__all__ = [
    "AdminProfile",
    "BenefitService",
    "CitizenProfile",
    "HousingListing",
    "JobListing",
    "NewsArticle",
    "NewsComment",
]
```

**Step 3: Verify all models import**

Run:
```bash
python -c "from backend.db.models import NewsArticle, NewsComment, JobListing, HousingListing, BenefitService; print('OK')"
```

Expected: `OK`

**Step 4: Commit**

```
feat(db): add news, jobs, housing, benefits models
```

---

## Task 7: News CRUD Module

**Files:**
- Create: `backend/db/crud/news.py`

**Step 1: Create news.py**

```python
"""CRUD operations for NewsArticle and NewsComment."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import (
    create_record,
    delete_record,
    get_record_by_field,
    list_records,
)
from backend.db.models import NewsArticle, NewsComment


# ---- Articles ----

async def upsert_article(session: AsyncSession, **kwargs: Any) -> None:
    """Insert or update a news article by ID."""
    stmt = pg_insert(NewsArticle).values(**kwargs)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={k: v for k, v in kwargs.items() if k != "id"},
    )
    await session.execute(stmt)


async def bulk_upsert_articles(session: AsyncSession, articles: list[dict]) -> int:
    """Upsert a batch of articles. Returns count."""
    for article in articles:
        await upsert_article(session, **article)
    await session.flush()
    return len(articles)


async def get_article_by_id(
    session: AsyncSession, article_id: str
) -> NewsArticle | None:
    return await get_record_by_field(session, NewsArticle, "id", article_id)


async def list_articles(
    session: AsyncSession,
    category: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[NewsArticle]:
    """List articles, optionally filtered by category."""
    stmt = select(NewsArticle)
    if category and category != "all":
        stmt = stmt.where(NewsArticle.category == category)
    stmt = stmt.order_by(NewsArticle.scraped_at.desc()).offset(skip).limit(limit)
    result = await session.execute(stmt)
    records = list(result.scalars().all())
    for r in records:
        session.expunge(r)
    return records


async def count_articles(session: AsyncSession, category: str | None = None) -> int:
    stmt = select(func.count(NewsArticle.id))
    if category and category != "all":
        stmt = stmt.where(NewsArticle.category == category)
    result = await session.execute(stmt)
    return result.scalar_one()


# ---- Comments ----

async def create_comment(session: AsyncSession, **kwargs: Any) -> NewsComment:
    return await create_record(session, NewsComment, **kwargs)


async def list_comments_by_article(
    session: AsyncSession, article_id: str
) -> list[NewsComment]:
    stmt = (
        select(NewsComment)
        .where(NewsComment.article_id == article_id)
        .order_by(NewsComment.created_at.asc())
    )
    result = await session.execute(stmt)
    records = list(result.scalars().all())
    for r in records:
        session.expunge(r)
    return records


async def list_all_comments(
    session: AsyncSession, skip: int = 0, limit: int = 200
) -> list[NewsComment]:
    return await list_records(session, NewsComment, skip, limit)


async def delete_comment(session: AsyncSession, comment_id: str) -> bool:
    return await delete_record(session, NewsComment, comment_id)
```

**Step 2: Verify import**

Run:
```bash
python -c "from backend.db.crud.news import upsert_article, list_articles, create_comment; print('OK')"
```

---

## Task 8: Jobs CRUD Module

**Files:**
- Create: `backend/db/crud/jobs.py`

**Step 1: Create jobs.py**

```python
"""CRUD operations for JobListing."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import get_record_by_field, list_records
from backend.db.models import JobListing


async def upsert_job(session: AsyncSession, **kwargs: Any) -> None:
    stmt = pg_insert(JobListing).values(**kwargs)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={k: v for k, v in kwargs.items() if k != "id"},
    )
    await session.execute(stmt)


async def bulk_upsert_jobs(session: AsyncSession, jobs: list[dict]) -> int:
    for job in jobs:
        await upsert_job(session, **job)
    await session.flush()
    return len(jobs)


async def get_job_by_id(session: AsyncSession, job_id: str) -> JobListing | None:
    return await get_record_by_field(session, JobListing, "id", job_id)


async def list_jobs(
    session: AsyncSession, skip: int = 0, limit: int = 500
) -> list[JobListing]:
    return await list_records(session, JobListing, skip, limit)


def job_to_geojson_feature(job: JobListing) -> dict | None:
    """Convert a JobListing row to a GeoJSON Feature dict."""
    if job.lat is None or job.lng is None:
        return None
    props = {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "source": job.source,
        "address": job.address,
        "url": job.url,
        "scraped_at": job.scraped_at.isoformat() if job.scraped_at else "",
        **(job.properties or {}),
    }
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [job.lng, job.lat]},
        "properties": props,
    }
```

**Step 2: Verify import**

Run:
```bash
python -c "from backend.db.crud.jobs import bulk_upsert_jobs, job_to_geojson_feature; print('OK')"
```

---

## Task 9: Housing CRUD Module

**Files:**
- Create: `backend/db/crud/housing.py`

**Step 1: Create housing.py**

```python
"""CRUD operations for HousingListing."""

from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import get_record_by_field, list_records
from backend.db.models import HousingListing


async def upsert_housing(session: AsyncSession, **kwargs: Any) -> None:
    stmt = pg_insert(HousingListing).values(**kwargs)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={k: v for k, v in kwargs.items() if k != "id"},
    )
    await session.execute(stmt)


async def bulk_upsert_housing(session: AsyncSession, listings: list[dict]) -> int:
    for listing in listings:
        await upsert_housing(session, **listing)
    await session.flush()
    return len(listings)


async def get_housing_by_id(
    session: AsyncSession, listing_id: str
) -> HousingListing | None:
    return await get_record_by_field(session, HousingListing, "id", listing_id)


async def list_housing(
    session: AsyncSession, skip: int = 0, limit: int = 500
) -> list[HousingListing]:
    return await list_records(session, HousingListing, skip, limit)


def housing_to_geojson_feature(listing: HousingListing) -> dict | None:
    """Convert a HousingListing row to a GeoJSON Feature dict."""
    if listing.lat is None or listing.lng is None:
        return None
    props = {
        "id": listing.id,
        "address": listing.address,
        "price": listing.price,
        "scraped_at": listing.scraped_at.isoformat() if listing.scraped_at else "",
        **(listing.properties or {}),
    }
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [listing.lng, listing.lat]},
        "properties": props,
    }
```

---

## Task 10: Benefits CRUD Module

**Files:**
- Create: `backend/db/crud/benefits.py`

**Step 1: Create benefits.py**

```python
"""CRUD operations for BenefitService."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import get_record_by_field, list_records
from backend.db.models import BenefitService


async def upsert_benefit(session: AsyncSession, **kwargs: Any) -> None:
    stmt = pg_insert(BenefitService).values(**kwargs)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={k: v for k, v in kwargs.items() if k != "id"},
    )
    await session.execute(stmt)


async def bulk_upsert_benefits(session: AsyncSession, services: list[dict]) -> int:
    for svc in services:
        await upsert_benefit(session, **svc)
    await session.flush()
    return len(services)


async def get_benefit_by_id(
    session: AsyncSession, benefit_id: str
) -> BenefitService | None:
    return await get_record_by_field(session, BenefitService, "id", benefit_id)


async def list_benefits(
    session: AsyncSession, category: str | None = None, skip: int = 0, limit: int = 100
) -> list[BenefitService]:
    if category:
        stmt = (
            select(BenefitService)
            .where(BenefitService.category == category)
            .offset(skip).limit(limit)
        )
        result = await session.execute(stmt)
        records = list(result.scalars().all())
        for r in records:
            session.expunge(r)
        return records
    return await list_records(session, BenefitService, skip, limit)
```

**Step 2: Update crud/__init__.py — add all new exports**

Add imports from `news`, `jobs`, `housing`, `benefits` modules to the facade.

**Step 3: Verify all CRUD modules import**

Run:
```bash
python -c "from backend.db.crud.news import list_articles; from backend.db.crud.jobs import list_jobs; from backend.db.crud.housing import list_housing; from backend.db.crud.benefits import list_benefits; print('OK')"
```

Expected: `OK`

**Step 4: Commit**

```
feat(db): add CRUD modules for news, jobs, housing, benefits
```

---

## Task 11: Generate Alembic Migration

**Step 1: Auto-generate migration**

Run from `backend/`:
```bash
cd backend && alembic revision --autogenerate -m "add news jobs housing benefits tables"
```

Expected: Creates a migration file in `backend/alembic/versions/` with all 7 tables (2 existing + 5 new).

**Step 2: Review the generated migration**

Read the generated file and verify it contains `create_table` for:
- `news_articles`, `news_comments`, `job_listings`, `housing_listings`, `benefit_services`
- Plus `citizen_profiles` and `admin_profiles` if this is the first migration

**Step 3: Run migration**

```bash
cd backend && alembic upgrade head
```

Expected: Tables created in PostgreSQL.

**Step 4: Verify tables exist**

```bash
python -c "
import asyncio
from backend.db.session import engine
async def check():
    async with engine.connect() as conn:
        result = await conn.run_sync(lambda c: c.execute(__import__('sqlalchemy').text('SELECT tablename FROM pg_tables WHERE schemaname=\\'public\\'')))
        print([r[0] for r in result])
asyncio.run(check())
"
```

**Step 5: Commit**

```
feat(db): add initial Alembic migration for all tables
```

---

## Task 12: Rewire Scrapers — News

**Files:**
- Modify: `backend/core/data_scraping/base.py`
- Modify: `backend/core/data_scraping/scrapers/news.py`

**Step 1: Add save_to_database to BaseScraper**

In `backend/core/data_scraping/base.py`, add an async method that subclasses override:

```python
async def save_to_database(self, records: list[dict]) -> int:
    """Override in subclasses to persist records to the database."""
    raise NotImplementedError(f"{self.name} has not implemented save_to_database")
```

**Step 2: Update BaseScraper.run() to call DB save**

Update the `run()` method to call `save_to_database()` instead of `save()`:

```python
def run(self) -> int:
    """Execute full pipeline: fetch -> process -> dedup -> save -> broadcast."""
    import asyncio

    logger.info("[%s] Starting scrape", self.name)

    raw_data = self.fetch()
    if not raw_data:
        logger.info("[%s] No data fetched", self.name)
        return 0

    processed = self.process(raw_data)
    if not processed:
        logger.info("[%s] No records after processing", self.name)
        return 0

    # Save to database
    try:
        asyncio.run(self.save_to_database(processed))
    except NotImplementedError:
        # Fallback to JSON if DB save not implemented
        existing = self.load_existing()
        merged = self.deduplicate(processed, existing)
        self.save(merged)

    self.broadcast(processed)
    logger.info("[%s] Complete: %d records", self.name, len(processed))
    return len(processed)
```

**Step 3: Implement save_to_database in NewsScraper**

In `backend/core/data_scraping/scrapers/news.py`, add:

```python
async def save_to_database(self, records: list[dict]) -> int:
    from backend.db.session import get_session
    from backend.db.crud.news import bulk_upsert_articles

    rows = [self._article_to_row(r) for r in records]
    async with get_session() as session:
        return await bulk_upsert_articles(session, rows)

def _article_to_row(self, article: dict) -> dict:
    """Convert scraper article dict to DB column dict."""
    from datetime import datetime, timezone
    scraped_raw = article.get("scrapedAt", "")
    try:
        scraped_at = datetime.fromisoformat(scraped_raw)
    except (ValueError, TypeError):
        scraped_at = datetime.now(timezone.utc)

    return {
        "id": article["id"],
        "title": article.get("title", ""),
        "excerpt": article.get("excerpt", ""),
        "body": article.get("body", ""),
        "source": article.get("source", ""),
        "source_url": article.get("sourceUrl", ""),
        "image_url": article.get("imageUrl"),
        "category": article.get("category", "general"),
        "published_at": article.get("publishedAt", ""),
        "scraped_at": scraped_at,
        "upvotes": article.get("upvotes", 0),
        "downvotes": article.get("downvotes", 0),
        "comment_count": article.get("commentCount", 0),
        "sentiment": article.get("sentiment"),
        "sentiment_score": article.get("sentimentScore"),
        "misinfo_risk": article.get("misinfoRisk"),
        "summary": article.get("summary"),
        "location": article.get("location"),
        "reaction_counts": article.get("reactionCounts"),
    }
```

**Step 4: Remove the JSON save() override from NewsScraper**

Delete the `save()` method and the `run()` override (keep `_run_comment_analysis` but call it after DB save).

Update the `run()` override:

```python
def run(self) -> int:
    """Override to chain comment analysis after news scrape."""
    count = super().run()
    if count > 0:
        self._run_comment_analysis()
    return count
```

**Step 5: Verify import chain**

Run:
```bash
python -c "from backend.core.data_scraping.scrapers.news import NewsScraper; print('OK')"
```

---

## Task 13: Rewire Scrapers — Jobs

**Files:**
- Modify: `backend/core/data_scraping/scrapers/jobs.py`

**Step 1: Add save_to_database to JobsScraper**

```python
async def save_to_database(self, records: list[dict]) -> int:
    """Persist GeoJSON features to job_listings table."""
    from backend.db.session import get_session
    from backend.db.crud.jobs import bulk_upsert_jobs

    rows = [self._feature_to_row(f) for f in records if f.get("properties")]
    async with get_session() as session:
        return await bulk_upsert_jobs(session, rows)

def _feature_to_row(self, feature: dict) -> dict:
    """Convert GeoJSON Feature to DB row dict."""
    from datetime import datetime, timezone
    props = feature.get("properties", {})
    coords = feature.get("geometry", {}).get("coordinates", [None, None])

    return {
        "id": props.get("id", ""),
        "title": props.get("title", ""),
        "company": props.get("company", ""),
        "source": props.get("source", ""),
        "address": props.get("address", ""),
        "lat": coords[1] if len(coords) > 1 else None,
        "lng": coords[0] if len(coords) > 0 else None,
        "url": props.get("url", ""),
        "scraped_at": datetime.now(timezone.utc),
        "properties": {
            k: v for k, v in props.items()
            if k not in ("id", "title", "company", "source", "address", "url")
        },
    }
```

**Step 2: Remove the JSON save() override from JobsScraper**

Delete the `save()` method that writes to JSON + JSONL.

---

## Task 14: Rewire Scrapers — Housing

**Files:**
- Modify: `backend/core/data_scraping/scrapers/housing.py`

**Step 1: Add save_to_database to HousingScraper**

```python
async def save_to_database(self, records: list[dict]) -> int:
    from backend.db.session import get_session
    from backend.db.crud.housing import bulk_upsert_housing

    rows = [self._feature_to_row(f) for f in records if f.get("properties")]
    async with get_session() as session:
        return await bulk_upsert_housing(session, rows)

def _feature_to_row(self, feature: dict) -> dict:
    from datetime import datetime, timezone
    props = feature.get("properties", {})
    coords = feature.get("geometry", {}).get("coordinates", [None, None])

    raw_price = props.get("price")
    price = None
    if raw_price is not None:
        try:
            price = int(str(raw_price).replace(",", "").replace("$", ""))
        except (ValueError, TypeError):
            pass

    return {
        "id": props.get("id", ""),
        "address": props.get("address", ""),
        "price": price,
        "lat": coords[1] if len(coords) > 1 else None,
        "lng": coords[0] if len(coords) > 0 else None,
        "scraped_at": datetime.now(timezone.utc),
        "properties": {
            k: v for k, v in props.items()
            if k not in ("id", "address", "price")
        },
    }
```

---

## Task 15: Rewire Scrapers — Benefits

**Files:**
- Modify: `backend/core/data_scraping/scrapers/benefits.py`

**Step 1: Add save_to_database to BenefitsScraper**

```python
async def save_to_database(self, records: list[dict]) -> int:
    from backend.db.session import get_session
    from backend.db.crud.benefits import bulk_upsert_benefits

    rows = [self._service_to_row(s) for s in records]
    async with get_session() as session:
        return await bulk_upsert_benefits(session, rows)

def _service_to_row(self, service: dict) -> dict:
    from datetime import datetime, timezone
    return {
        "id": service["id"],
        "category": service.get("category", ""),
        "title": service.get("title", ""),
        "provider": service.get("provider", ""),
        "description": service.get("description", ""),
        "url": service.get("url", ""),
        "phone": service.get("phone", ""),
        "scraped_at": datetime.now(timezone.utc),
        "details": {
            "eligibility": service.get("eligibility", []),
            "income_limits": service.get("income_limits", {}),
            "how_to_apply": service.get("how_to_apply", []),
            "documents_needed": service.get("documents_needed", []),
        },
    }
```

**Step 2: Update BenefitsScraper.run() — remove JSON merge logic**

Replace the `run()` and `save()` overrides. The base class `run()` now handles DB save, and dedup happens at the DB level via upsert.

**Step 3: Verify all scrapers import**

Run:
```bash
python -c "from backend.core.data_scraping.scrapers import NewsScraper, JobsScraper, HousingScraper, BenefitsScraper; print('OK')"
```

**Step 4: Commit**

```
refactor(scrapers): save to database instead of JSON files
```

---

## Task 16: API Endpoint — News

**Files:**
- Create: `backend/api/routers/news.py`
- Modify: `backend/api/main.py` (register router)

**Step 1: Create news router**

```python
"""News endpoints: list and detail for news articles."""

from fastapi import APIRouter, Query

from backend.db.session import get_session
from backend.db.crud.news import get_article_by_id, list_articles, count_articles

router = APIRouter(tags=["news"])


def _article_to_dict(article) -> dict:
    """Convert NewsArticle ORM object to frontend-compatible dict."""
    return {
        "id": article.id,
        "title": article.title,
        "excerpt": article.excerpt,
        "body": article.body,
        "source": article.source,
        "sourceUrl": article.source_url,
        "imageUrl": article.image_url,
        "category": article.category,
        "publishedAt": article.published_at,
        "scrapedAt": article.scraped_at.isoformat() if article.scraped_at else "",
        "upvotes": article.upvotes,
        "downvotes": article.downvotes,
        "commentCount": article.comment_count,
        "sentiment": article.sentiment,
        "sentimentScore": article.sentiment_score,
        "misinfoRisk": article.misinfo_risk,
        "summary": article.summary,
        "location": article.location,
        "reactionCounts": article.reaction_counts,
    }


@router.get("/news")
async def get_news(
    category: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    async with get_session() as session:
        articles = await list_articles(session, category=category, skip=skip, limit=limit)
        total = await count_articles(session, category=category)
    return {
        "totalArticles": total,
        "articles": [_article_to_dict(a) for a in articles],
    }


@router.get("/news/{article_id}")
async def get_news_detail(article_id: str) -> dict:
    async with get_session() as session:
        article = await get_article_by_id(session, article_id)
    if not article:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Article not found")
    return _article_to_dict(article)
```

**Step 2: Register in main.py**

Add to `backend/api/main.py`:
```python
from backend.api.routers import news
app.include_router(news.router, prefix="/api")
```

---

## Task 17: API Endpoint — Jobs

**Files:**
- Create: `backend/api/routers/jobs.py`
- Modify: `backend/api/main.py`

**Step 1: Create jobs router**

```python
"""Jobs endpoint: serve job listings as GeoJSON."""

from fastapi import APIRouter

from backend.db.session import get_session
from backend.db.crud.jobs import list_jobs, job_to_geojson_feature

router = APIRouter(tags=["jobs"])


@router.get("/jobs")
async def get_jobs() -> dict:
    async with get_session() as session:
        jobs = await list_jobs(session)
    features = [job_to_geojson_feature(j) for j in jobs]
    features = [f for f in features if f is not None]
    return {"type": "FeatureCollection", "features": features}
```

**Step 2: Register in main.py**

---

## Task 18: API Endpoint — Housing

**Files:**
- Create: `backend/api/routers/housing.py`
- Modify: `backend/api/main.py`

**Step 1: Create housing router**

```python
"""Housing endpoint: serve housing listings as GeoJSON."""

from fastapi import APIRouter

from backend.db.session import get_session
from backend.db.crud.housing import list_housing, housing_to_geojson_feature

router = APIRouter(tags=["housing"])


@router.get("/housing")
async def get_housing() -> dict:
    async with get_session() as session:
        listings = await list_housing(session)
    features = [housing_to_geojson_feature(l) for l in listings]
    features = [f for f in features if f is not None]
    return {"type": "FeatureCollection", "features": features}
```

**Step 2: Register in main.py**

---

## Task 19: API Endpoint — Benefits

**Files:**
- Create: `backend/api/routers/benefits.py`
- Modify: `backend/api/main.py`

**Step 1: Create benefits router**

```python
"""Benefits endpoint: serve government benefit services."""

from fastapi import APIRouter, Query

from backend.db.session import get_session
from backend.db.crud.benefits import list_benefits

router = APIRouter(tags=["benefits"])


def _benefit_to_dict(svc) -> dict:
    details = svc.details or {}
    return {
        "id": svc.id,
        "category": svc.category,
        "title": svc.title,
        "provider": svc.provider,
        "description": svc.description,
        "eligibility": details.get("eligibility", []),
        "how_to_apply": details.get("how_to_apply", []),
        "documents_needed": details.get("documents_needed", []),
        "income_limits": details.get("income_limits", {}),
        "url": svc.url,
        "phone": svc.phone,
        "scraped_at": svc.scraped_at.isoformat() if svc.scraped_at else "",
    }


@router.get("/benefits")
async def get_benefits(
    category: str | None = Query(None),
) -> dict:
    async with get_session() as session:
        services = await list_benefits(session, category=category)
    return {
        "total_services": len(services),
        "services": [_benefit_to_dict(s) for s in services],
    }
```

**Step 2: Register in main.py**

---

## Task 20: Rewire Comments Endpoint to DB

**Files:**
- Modify: `backend/api/routers/comments.py`

**Step 1: Replace JSON file ops with DB CRUD**

```python
"""Comments endpoints: serve and accept citizen comments."""

from datetime import datetime, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel

from backend.db.session import get_session
from backend.db.crud.news import create_comment, list_comments_by_article, list_all_comments

router = APIRouter(tags=["comments"])


class CommentPayload(BaseModel):
    id: str
    articleId: str
    citizenId: str
    citizenName: str
    avatarInitials: str
    avatarColor: str
    content: str
    createdAt: str


def _comment_to_dict(comment) -> dict:
    return {
        "id": comment.id,
        "articleId": comment.article_id,
        "citizenId": comment.citizen_id,
        "citizenName": comment.citizen_name,
        "avatarInitials": comment.avatar_initials,
        "avatarColor": comment.avatar_color,
        "content": comment.content,
        "createdAt": comment.created_at.isoformat() if comment.created_at else "",
    }


@router.get("/comments")
async def get_comments(article_id: str | None = Query(None)) -> dict:
    async with get_session() as session:
        if article_id:
            comments = await list_comments_by_article(session, article_id)
        else:
            comments = await list_all_comments(session)
    return {"comments": [_comment_to_dict(c) for c in comments]}


@router.post("/comments", status_code=201)
async def post_comment(payload: CommentPayload) -> dict:
    created_at = datetime.now(timezone.utc)
    try:
        created_at = datetime.fromisoformat(payload.createdAt)
    except (ValueError, TypeError):
        pass

    async with get_session() as session:
        await create_comment(
            session,
            id=payload.id,
            article_id=payload.articleId,
            citizen_id=payload.citizenId,
            citizen_name=payload.citizenName,
            avatar_initials=payload.avatarInitials,
            avatar_color=payload.avatarColor,
            content=payload.content,
            created_at=created_at,
        )
    return {"status": "ok", "id": payload.id}
```

**Step 2: Register all new routers in main.py — final state**

Add these imports and `include_router` calls to `backend/api/main.py`:

```python
from backend.api.routers import news, jobs, housing, benefits

app.include_router(news.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(housing.router, prefix="/api")
app.include_router(benefits.router, prefix="/api")
```

**Step 3: Verify server starts**

Run:
```bash
uvicorn backend.api.main:app --reload --port 8000
```

Hit `http://localhost:8000/health` — should return OK.
Hit `http://localhost:8000/api/news` — should return `{"totalArticles": 0, "articles": []}`.

**Step 4: Commit**

```
feat(api): add endpoints to serve news, jobs, housing, benefits from DB
```

---

## Task 21: Frontend — Rewire News Service

**Files:**
- Modify: `frontend/src/lib/newsService.ts`

**Step 1: Change fetchNewsArticles to use API**

Replace the static file fetch with API call:

```typescript
export async function fetchNewsArticles(): Promise<NewsArticle[]> {
  if (cached) return cached;

  const response = await fetch(`${API_BASE}/api/news?limit=200`);
  if (!response.ok) return [];

  const data: NewsFeedResponse = await response.json();
  const raw = data.articles ?? [];
  cached = deduplicateByTitle(raw);
  return cached;
}
```

Key change: `"/data/news_feed.json"` → `` `${API_BASE}/api/news?limit=200` ``

---

## Task 22: Frontend — Rewire Jobs Service

**Files:**
- Modify: `frontend/src/lib/jobService.ts`

**Step 1: Change fetchJobListings to use API**

```typescript
export async function fetchJobListings(): Promise<JobListing[]> {
  const response = await fetch(`${API_BASE}/api/jobs`);
  if (!response.ok) {
    console.error("Failed to fetch jobs:", response.status);
    return [];
  }

  const geojson: GeoJsonCollection = await response.json();
  return geojson.features.map(parseFeatureToJob);
}
```

Add `API_BASE` import:
```typescript
import { API_BASE } from "./apiConfig";
```

Key change: `"/data/jobs.geojson"` → `` `${API_BASE}/api/jobs` ``

---

## Task 23: Frontend — Rewire Gov Services

**Files:**
- Modify: `frontend/src/lib/govServices.ts`

**Step 1: Change fetchServiceGuides to use API**

```typescript
export async function fetchServiceGuides(): Promise<ServiceGuide[]> {
  if (cachedGuides) return cachedGuides;

  const response = await fetch(`${API_BASE}/api/benefits`);
  if (!response.ok) {
    console.error("Failed to fetch benefits:", response.status);
    return [];
  }

  const data: GovServicesData = await response.json();
  cachedGuides = data.services.map(parseRawGuide);
  return cachedGuides;
}
```

Add `API_BASE` import:
```typescript
import { API_BASE } from "./apiConfig";
```

Key change: `"/data/gov_services.json"` → `` `${API_BASE}/api/benefits` ``

---

## Task 24: Frontend — Rewire Housing (SSE already works, add initial fetch)

**Files:**
- Modify: `frontend/src/lib/useDataStream.ts`

Housing currently only loads via SSE. Add an initial fetch so data is available on page load:

**Step 1: Add initial housing fetch in useDataStream**

At the top of `useDataStream()`, add a one-time fetch before SSE connect:

```typescript
useEffect(() => {
  // Initial data load from API
  fetch(`${API_BASE}/api/housing`)
    .then((r) => r.ok ? r.json() : { features: [] })
    .then((geojson: { features: HousingGeoJsonFeature[] }) => {
      const listings = geojson.features.map(parseFeatureToHousingListing);
      dispatchRef.current({ type: "MERGE_HOUSING_LISTINGS", listings });
    })
    .catch(() => {});
}, []);
```

**Step 2: Commit**

```
refactor(frontend): fetch data from API endpoints instead of static files
```

---

## Task 25: Final Verification

**Step 1: Run backend**

```bash
uvicorn backend.api.main:app --reload --port 8000
```

**Step 2: Run frontend**

```bash
cd frontend && npm run dev
```

**Step 3: Verify endpoints return data**

```bash
curl http://localhost:8000/api/news
curl http://localhost:8000/api/jobs
curl http://localhost:8000/api/housing
curl http://localhost:8000/api/benefits
curl http://localhost:8000/api/comments
```

**Step 4: Verify frontend loads without errors**

Open browser, check network tab — all fetches should hit `/api/*` endpoints, not `/data/*.json`.

**Step 5: Create PR**

```
feat(db): full data layer build-out — models, CRUD, migrations, API, frontend wiring
```

---

## Commit Summary

| # | Message | Scope |
|---|---------|-------|
| 1 | `chore(db): initialize Alembic with async PostgreSQL` | Alembic init |
| 2 | `feat(db): add news, jobs, housing, benefits models` | 5 model files |
| 3 | `feat(db): add CRUD modules for news, jobs, housing, benefits` | 4 CRUD files |
| 4 | `feat(db): add initial Alembic migration for all tables` | Migration |
| 5 | `refactor(scrapers): save to database instead of JSON files` | 5 scraper files |
| 6 | `feat(api): add endpoints to serve news, jobs, housing, benefits from DB` | 5 router files + main.py |
| 7 | `refactor(frontend): fetch data from API endpoints instead of static files` | 4 service files |
