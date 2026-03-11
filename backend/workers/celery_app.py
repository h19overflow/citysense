"""Celery application factory.

Configures the Celery instance with Redis as both broker and result backend.
All task modules are auto-discovered from backend.workers.tasks.

Usage:
    celery -A backend.workers.celery_app worker --loglevel=info
"""

import os

from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6380/0")

app = Celery(
    "citysense_workers",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

app.autodiscover_tasks(["backend.workers.tasks"])
