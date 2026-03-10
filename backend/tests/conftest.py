"""Shared pytest fixtures for backend tests."""

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def test_client() -> Generator[TestClient, None, None]:
    """Return a TestClient for the FastAPI app with no WEBHOOK_SECRET set."""
    os.environ.pop("WEBHOOK_SECRET", None)

    # Import after env is set so WEBHOOK_SECRET is read fresh
    from backend.api.main import app

    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


@pytest.fixture()
def authenticated_client() -> Generator[TestClient, None, None]:
    """Return a TestClient with WEBHOOK_SECRET='test-secret' active."""
    os.environ["WEBHOOK_SECRET"] = "test-secret"

    # Reload deps so the module-level WEBHOOK_SECRET is refreshed
    import importlib
    import backend.config as config_module
    import backend.api.deps as deps_module

    importlib.reload(config_module)
    importlib.reload(deps_module)

    from backend.api.main import app

    with TestClient(app, raise_server_exceptions=False) as client:
        yield client

    os.environ.pop("WEBHOOK_SECRET", None)
    importlib.reload(config_module)
    importlib.reload(deps_module)
