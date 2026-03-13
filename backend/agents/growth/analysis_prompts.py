"""Prompt assembly helpers for the two-stage analysis agent."""

from typing import Any


def build_preliminary_prompt(
    cv_data: dict[str, Any],
    intake_data: dict[str, Any],
    crawl_signals: dict[str, Any],
) -> str:
    """Assemble preliminary analysis prompt from all available signal."""
    skills = ", ".join(cv_data.get("skills", []) or [])
    tools = ", ".join(cv_data.get("tools", []) or [])
    roles = ", ".join(cv_data.get("roles", []) or [])
    education = str(cv_data.get("education", "Not provided"))
    experience = str(cv_data.get("experience", "Not provided"))

    signals = "\n".join(
        f"- {s}" for s in crawl_signals.get("all_signals", [])[:30]
    ) or "No external signals available"

    return (
        f"CV DATA\n"
        f"Skills: {skills or 'Not specified'}\n"
        f"Tools: {tools or 'Not specified'}\n"
        f"Roles: {roles or 'Not specified'}\n"
        f"Education: {education}\n"
        f"Experience: {experience}\n\n"
        f"INTAKE FORM\n"
        f"Career goal: {intake_data.get('career_goal', 'Not specified')}\n"
        f"Timeline: {intake_data.get('target_timeline', 'Not specified')}\n"
        f"Learning style: {intake_data.get('learning_style', 'Not specified')}\n"
        f"Frustrations: {intake_data.get('current_frustrations', 'Not specified')}\n\n"
        f"CRAWL SIGNALS\n{signals}"
    )


def build_final_prompt(
    cv_data: dict[str, Any],
    intake_data: dict[str, Any],
    crawl_signals: dict[str, Any],
    gap_answers: dict[str, Any],
    previous_analysis: dict[str, Any],
) -> str:
    """Assemble final prompt adding gap answers and previous version for diff."""
    base = build_preliminary_prompt(cv_data, intake_data, crawl_signals)

    answers_text = "\n".join(
        f"Q({qid}): {answer}" for qid, answer in gap_answers.items()
    ) or "No gap answers provided"

    prev_paths = (
        f"fill_gap target: {previous_analysis.get('path_fill_gap', {}).get('target_role', 'N/A')}\n"
        f"multidisciplinary target: {previous_analysis.get('path_multidisciplinary', {}).get('target_role', 'N/A')}\n"
        f"pivot target: {previous_analysis.get('path_pivot', {}).get('target_role', 'N/A')}"
    )

    return (
        f"{base}\n\n"
        f"GAP QUESTION ANSWERS\n{answers_text}\n\n"
        f"PREVIOUS PRELIMINARY ROADMAP\n{prev_paths}\n"
        f"Write a diff_summary explaining what changed from preliminary to final."
    )
