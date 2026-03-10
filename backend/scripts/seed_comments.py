"""Seed realistic citizen comments on news articles using Gemini.

Reads news_feed.json, picks articles that lack comments, asks Gemini to
generate 2-4 realistic resident comments per article, then writes them
to exported_comments.json (merging with any existing comments).

Usage:
    python -m backend.scripts.seed_comments
    python -m backend.scripts.seed_comments --count 20   # seed 20 articles
"""

import asyncio
import json
import random
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from backend.config import OUTPUT_FILES, REPO_ROOT

COMMENTS_PATH = REPO_ROOT / "backend" / "data" / "exported_comments.json"
MODEL_NAME = "gemini-3.1-flash-lite-preview"

CITIZENS = [
    {"id": "citizen-1", "name": "Marcus Johnson", "initials": "MJ", "color": "#3b82f6"},
    {"id": "citizen-2", "name": "Angela Davis", "initials": "AD", "color": "#ef4444"},
    {"id": "citizen-3", "name": "Robert Williams", "initials": "RW", "color": "#22c55e"},
    {"id": "citizen-4", "name": "Lisa Thompson", "initials": "LT", "color": "#a855f7"},
    {"id": "citizen-5", "name": "David Chen", "initials": "DC", "color": "#f59e0b"},
    {"id": "citizen-6", "name": "Patricia Brown", "initials": "PB", "color": "#06b6d4"},
    {"id": "citizen-7", "name": "James Wilson", "initials": "JW", "color": "#84cc16"},
    {"id": "citizen-8", "name": "Maria Garcia", "initials": "MG", "color": "#f43f5e"},
    {"id": "citizen-9", "name": "Thomas Mitchell", "initials": "TM", "color": "#8b5cf6"},
    {"id": "citizen-10", "name": "Sarah Jenkins", "initials": "SJ", "color": "#ec4899"},
]

SEED_PROMPT = """\
You are generating realistic comments from Montgomery, Alabama residents \
reacting to a local news article. Each comment should sound like a real \
person — casual tone, varied perspectives, some supportive, some critical, \
some just sharing personal experience. Keep each comment 1-3 sentences. \
Reference specific Montgomery neighborhoods, streets, or landmarks when natural. \
Do NOT use hashtags or emojis. Vary the sentiment — not all positive or all negative."""


class GeneratedComment(BaseModel):
    content: str = Field(description="The comment text, 1-3 sentences")
    sentiment: str = Field(description="positive, neutral, or negative")


class GeneratedComments(BaseModel):
    comments: list[GeneratedComment] = Field(min_length=2, max_length=4)


def load_articles() -> list[dict]:
    path = OUTPUT_FILES["news"]
    if not path.exists():
        return []
    return json.loads(path.read_text()).get("articles", [])


def load_existing_comments() -> list[dict]:
    if not COMMENTS_PATH.exists():
        return []
    try:
        return json.loads(COMMENTS_PATH.read_text()).get("comments", [])
    except (json.JSONDecodeError, KeyError):
        return []


def save_comments(comments: list[dict]) -> None:
    COMMENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    COMMENTS_PATH.write_text(
        json.dumps({"comments": comments}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def build_chain():
    llm = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0.9, max_output_tokens=2048)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SEED_PROMPT),
        ("human",
         "Article title: {title}\n"
         "Article excerpt: {excerpt}\n"
         "Category: {category}\n"
         "Sentiment: {sentiment}\n\n"
         "Generate 2-4 realistic resident comments."),
    ])
    return prompt | llm.with_structured_output(GeneratedComments)


def pick_random_citizen(exclude: set[str]) -> dict:
    available = [c for c in CITIZENS if c["id"] not in exclude]
    if not available:
        available = CITIZENS
    return random.choice(available)


def build_comment_dict(
    article_id: str, citizen: dict, content: str, base_time: datetime, offset_minutes: int,
) -> dict:
    return {
        "id": f"seed-{article_id[:6]}-{random.randint(1000, 9999)}",
        "articleId": article_id,
        "citizenId": citizen["id"],
        "citizenName": citizen["name"],
        "avatarInitials": citizen["initials"],
        "avatarColor": citizen["color"],
        "content": content,
        "createdAt": (base_time + timedelta(minutes=offset_minutes)).isoformat(),
    }


async def seed_article_comments(chain, article: dict) -> list[dict]:
    try:
        result: GeneratedComments = await chain.ainvoke({
            "title": article["title"],
            "excerpt": article.get("excerpt", ""),
            "category": article.get("category", "general"),
            "sentiment": article.get("sentiment", "neutral"),
        })
    except Exception as e:
        print(f"  Failed: {article['title'][:50]}... — {e}")
        return []

    base_time = datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48))
    used_citizens: set[str] = set()
    comments = []

    for i, gen in enumerate(result.comments):
        citizen = pick_random_citizen(used_citizens)
        used_citizens.add(citizen["id"])
        comment = build_comment_dict(
            article["id"], citizen, gen.content, base_time, offset_minutes=i * random.randint(5, 30),
        )
        comments.append(comment)

    return comments


async def main(target_count: int = 30) -> None:
    articles = load_articles()
    existing_comments = load_existing_comments()
    commented_ids = {c["articleId"] for c in existing_comments}

    # Pick articles that don't have comments yet
    candidates = [a for a in articles if a["id"] not in commented_ids]
    random.shuffle(candidates)
    to_seed = candidates[:target_count]

    if not to_seed:
        print("All articles already have comments. Nothing to seed.")
        return

    print(f"Seeding comments for {len(to_seed)} articles...")
    chain = build_chain()
    all_new_comments: list[dict] = []

    for i, article in enumerate(to_seed, 1):
        print(f"  [{i}/{len(to_seed)}] {article['title'][:60]}...")
        new_comments = await seed_article_comments(chain, article)
        all_new_comments.extend(new_comments)
        print(f"    → {len(new_comments)} comments generated")

    merged = existing_comments + all_new_comments
    save_comments(merged)
    print(f"\nDone! Added {len(all_new_comments)} comments across {len(to_seed)} articles.")
    print(f"Total comments now: {len(merged)}")


if __name__ == "__main__":
    count = 30
    if "--count" in sys.argv:
        idx = sys.argv.index("--count")
        count = int(sys.argv[idx + 1])
    asyncio.run(main(count))
