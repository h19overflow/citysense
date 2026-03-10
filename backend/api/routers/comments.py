"""Comments endpoints: serve and accept citizen comments."""

import json
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["comments"])

COMMENTS_PATH = Path(__file__).parent.parent.parent / "data" / "exported_comments.json"


class CommentPayload(BaseModel):
    id: str
    articleId: str
    citizenId: str
    citizenName: str
    avatarInitials: str
    avatarColor: str
    content: str
    createdAt: str


def _load_comments() -> list[dict]:
    """Load existing comments from the JSON file."""
    if not COMMENTS_PATH.exists():
        return []
    try:
        data = json.loads(COMMENTS_PATH.read_text(encoding="utf-8"))
        return data.get("comments", [])
    except (json.JSONDecodeError, KeyError):
        return []


def _save_comments(comments: list[dict]) -> None:
    """Persist comments list back to the JSON file."""
    COMMENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    COMMENTS_PATH.write_text(
        json.dumps({"comments": comments}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


@router.get("/comments")
async def get_comments() -> dict:
    """Return all seed comments from exported_comments.json."""
    return {"comments": _load_comments()}


@router.post("/comments", status_code=201)
async def post_comment(payload: CommentPayload) -> dict:
    """Append a new citizen comment to exported_comments.json."""
    comments = _load_comments()
    comments.append(payload.model_dump())
    _save_comments(comments)
    return {"status": "ok", "id": payload.id}
