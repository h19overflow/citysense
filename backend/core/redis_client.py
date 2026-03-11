"""Best-effort Redis cache for roadmap generation."""

import json
import logging
import os
from typing import Any

import redis

logger = logging.getLogger("redis_cache")


class RedisCache:
    """Singleton Redis client that fails open when Redis is unavailable."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._client = None
            cls._instance._init_client()
        return cls._instance

    def _init_client(self) -> None:
        url = os.environ.get("REDIS_URL")
        if not url:
            logger.info("REDIS_URL not set; roadmap caching disabled.")
            self._client = None
            return

        try:
            self._client = redis.from_url(url, decode_responses=True)
            self._client.ping()
            logger.info("Connected to Redis successfully.")
        except redis.RedisError as exc:
            logger.warning("Failed to connect to Redis: %s", exc)
            self._client = None

    def is_available(self) -> bool:
        if not self._client:
            self._init_client()
        if not self._client:
            return False
        try:
            return bool(self._client.ping())
        except redis.RedisError:
            return False

    def fetch(self, key: str) -> dict[str, Any] | None:
        if not self.is_available():
            return None
        try:
            data = self._client.get(key)
            if data:
                return json.loads(data)
        except (redis.RedisError, json.JSONDecodeError) as exc:
            logger.warning("Redis fetch failed for %s: %s", key, exc)
        return None

    def store(self, key: str, value: Any, ttl: int = 86400) -> None:
        if not self.is_available():
            return
        try:
            payload = value if isinstance(value, str) else json.dumps(value)
            self._client.setex(key, ttl, payload)
        except (redis.RedisError, TypeError) as exc:
            logger.warning("Redis store failed for %s: %s", key, exc)

    def delete(self, key: str) -> None:
        if not self.is_available():
            return
        try:
            self._client.delete(key)
        except redis.RedisError as exc:
            logger.warning("Redis delete failed for %s: %s", key, exc)

    def publish(self, channel: str, message: str) -> None:
        """Publish a message to a Redis pub/sub channel."""
        if not self.is_available():
            return
        try:
            self._client.publish(channel, message)
        except redis.RedisError as exc:
            logger.warning("Redis publish failed for %s: %s", channel, exc)


cache = RedisCache()
