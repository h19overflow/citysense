"""Tool for computing skill gaps between CV and target roles."""

from langchain_core.tools import tool


COMMON_ROLE_SKILLS: dict[str, list[str]] = {
    "data scientist": ["Python", "Machine Learning", "Statistics", "SQL", "TensorFlow"],
    "data analyst": ["SQL", "Excel", "Python", "Tableau", "Data Visualization"],
    "software engineer": ["Python", "Git", "Docker", "REST APIs", "Testing"],
    "project manager": ["PMP", "Agile", "Jira", "Risk Management", "Stakeholder Management"],
    "accountant": ["QuickBooks", "Excel", "GAAP", "Tax Preparation", "Financial Reporting"],
    "nurse": ["Patient Care", "EMR", "Clinical Assessment", "IV Therapy", "HIPAA"],
}


@tool
def compute_skill_gaps(current_skills: str, target_role: str) -> str:
    """Identify skill gaps between a citizen's current skills and a target role.

    Args:
        current_skills: Comma-separated list of skills the citizen already has.
        target_role: The role to compare against (e.g. "Data Scientist").

    Returns a ranked list of missing skills with importance levels.
    """
    current = {s.strip().lower() for s in current_skills.split(",")}
    role_key = target_role.strip().lower()

    required = COMMON_ROLE_SKILLS.get(role_key, [])
    if not required:
        return (
            f"No predefined skill map for '{target_role}'. "
            "Use search_upskill_resources to find what employers require."
        )

    missing = [skill for skill in required if skill.lower() not in current]
    if not missing:
        return f"You already have all core skills for {target_role}!"

    lines = [f"Skill gaps for {target_role} ({len(missing)} gaps):"]
    for i, skill in enumerate(missing):
        importance = "critical" if i < 2 else "high" if i < 4 else "medium"
        lines.append(f"- {skill} [{importance}]")
    return "\n".join(lines)
