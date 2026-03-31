"""One-time script to upload all agent prompts to Langfuse.

Run this once to seed Langfuse with the initial prompt versions.
After this, prompts can be edited in the Langfuse UI and agents
will pick up changes automatically via the prompt registry.

Usage:
    python -m backend.scripts.upload_prompts_to_langfuse

WHAT THIS SCRIPT DOES
─────────────────────
1. Connects to Langfuse using env vars
2. For each agent prompt, calls create_prompt() with:
   - name: a stable identifier (e.g., "mayor-chat")
   - prompt: the full prompt text
   - labels: ["production"] — marks this as the live version
3. If a prompt with the same name exists, Langfuse creates a new VERSION
   (not a duplicate) and applies the "production" label to it.

LANGFUSE VARIABLE SYNTAX
─────────────────────────
Langfuse uses {{double_braces}} for template variables, while
LangChain uses {single_braces}. The prompt registry handles this
conversion automatically via .get_langchain_prompt().

We upload prompts with LangChain-style {single_braces} and Langfuse
stores them as-is. The registry's .get_langchain_prompt() returns
them unchanged since they're already in the right format.
"""

import sys
import logging

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


# ── Prompt definitions ──
# Each entry: (langfuse_name, prompt_text, type)
# "text" type = plain string prompt, "chat" type = list of messages
PROMPTS_TO_UPLOAD = []


def _register(name: str, prompt: str) -> None:
    """Register a prompt for upload."""
    PROMPTS_TO_UPLOAD.append((name, prompt))


def _collect_all_prompts() -> None:
    """Import and register all prompts from agent modules."""
    # ── Mayor prompts ──
    from backend.agents.mayor.prompt import MAYOR_CHAT_PROMPT, BATCH_ANALYSIS_PROMPT
    _register("mayor-chat", MAYOR_CHAT_PROMPT)
    _register("comment-analysis", BATCH_ANALYSIS_PROMPT)

    # ── Citizen prompt ──
    from backend.agents.citizen.prompt import CITIZEN_CHAT_PROMPT
    _register("citizen-chat", CITIZEN_CHAT_PROMPT)

    # ── Career prompt ──
    from backend.agents.career.prompt import CAREER_AGENT_PROMPT
    _register("career-chat", CAREER_AGENT_PROMPT)

    # ── CV analysis prompts ──
    from backend.agents.citizen.cv_analyzers.prompts import CV_PAGE_ANALYSIS_PROMPT
    _register("cv-page-analysis", CV_PAGE_ANALYSIS_PROMPT)

    from backend.agents.citizen.cv_analyzers.synthesizer import _SYNTHESIZER_PROMPT
    _register("cv-role-synthesis", _SYNTHESIZER_PROMPT)

    # ── Roadmap prompt ──
    from backend.agents.citizen.roadmap_agent import SYSTEM_PROMPT as ROADMAP_PROMPT
    _register("civic-roadmap", ROADMAP_PROMPT)

    # ── Growth prompts ──
    from backend.agents.growth.prompts import (
        STRATEGIST_PROMPT,
        CRAWL_AGENT_PROMPT,
        ANALYSIS_PRELIMINARY_PROMPT,
        ANALYSIS_FINAL_PROMPT,
    )
    _register("growth-strategist", STRATEGIST_PROMPT)
    _register("growth-crawl", CRAWL_AGENT_PROMPT)
    _register("growth-analysis-preliminary", ANALYSIS_PRELIMINARY_PROMPT)
    _register("growth-analysis-final", ANALYSIS_FINAL_PROMPT)

    # ── Skill agent prompt ──
    from backend.agents.growth.skill_agent_prompt import SKILL_AGENT_SYSTEM_PROMPT
    _register("growth-skill", SKILL_AGENT_SYSTEM_PROMPT)


def upload_all_prompts() -> None:
    """Upload all registered prompts to Langfuse."""
    from backend.agents.common.monitoring.langfuse_client import get_langfuse

    client = get_langfuse()
    if client is None:
        logger.error("Langfuse not configured. Set env vars and try again.")
        sys.exit(1)

    _collect_all_prompts()
    logger.info("Uploading %d prompts to Langfuse...\n", len(PROMPTS_TO_UPLOAD))

    success_count = 0
    for name, prompt_text in PROMPTS_TO_UPLOAD:
        try:
            client.create_prompt(
                name=name,
                type="text",
                prompt=prompt_text,
                labels=["production"],
            )
            logger.info("  [OK] %s", name)
            success_count += 1
        except Exception as exc:
            logger.error("  [FAIL] %s — %s", name, exc)

    logger.info(
        "\nDone: %d/%d prompts uploaded successfully.",
        success_count, len(PROMPTS_TO_UPLOAD),
    )


if __name__ == "__main__":
    upload_all_prompts()
