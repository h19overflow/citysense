"""CV role synthesizer agent.

After all CV pages are aggregated into a CVAnalysisResult, this agent
receives the full profile and infers the candidate's matched job roles.
Roles are inferred only from: formal job titles in experience, explicit
targeting statements in the summary, and domain fit from skills/tools.
Project names are never treated as roles.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable
from pydantic import BaseModel, Field

from backend.agents.common.llm import build_llm
from backend.core.cv_pipeline.schemas import CVAnalysisResult

from .config import CV_ANALYSIS_MODEL, CV_ANALYSIS_TEMPERATURE

logger = logging.getLogger(__name__)

_SYNTHESIZER_PROMPT = """\
You are a career expert. Given the structured CV profile below, identify
the 2-5 most accurate job roles this candidate matches.

RULES:
- Source roles ONLY from: (1) formal job titles held in experience entries,
  (2) explicit targeting phrases in the summary (e.g. "Seeking X role"),
  (3) industry-standard titles that directly match their skills/tools combination.
- NEVER use project names, company names, tool names, or section headings as roles.
- A project called "Student Helper" is NOT a role. "Machine Learning Engineer" is.
- Return concise, industry-standard titles only (e.g. "Data Scientist", not "data science specialist").
- If no roles can be confidently inferred, return an empty list.

CV PROFILE:
Experience titles: {experience_titles}
Projects: {project_names}
Skills: {skills}
Tools: {tools}
Education: {education}
Summary: {summary}
"""


class _RoleList(BaseModel):
    """Structured output for the synthesizer."""

    roles: list[str] = Field(
        default_factory=list,
        description="Inferred job roles for this candidate",
    )


def build_synthesizer_chain() -> Runnable:
    """Build the role synthesizer LangChain chain."""
    llm = build_llm(model=CV_ANALYSIS_MODEL, temperature=CV_ANALYSIS_TEMPERATURE)
    prompt = ChatPromptTemplate.from_messages([("human", _SYNTHESIZER_PROMPT)])
    return prompt | llm.with_structured_output(_RoleList)


def _format_education_entries(cv: CVAnalysisResult) -> str:
    """Format education entries into a readable string."""
    if not cv.education:
        return "None"
    return ", ".join(f"{e.degree} from {e.institution}" for e in cv.education)


async def synthesize_cv_roles(cv: CVAnalysisResult) -> list[str]:
    """Infer matched job roles from the complete aggregated CV profile.

    Args:
        cv: Fully aggregated CV analysis result across all pages.

    Returns:
        List of industry-standard job role titles.
    """
    experience_titles = ", ".join(e.role for e in cv.experience) or "None"
    project_names = ", ".join(p.name for p in cv.projects) or "None"
    skills = ", ".join(cv.skills) or "None"
    tools = ", ".join(cv.tools) or "None"
    education = _format_education_entries(cv)
    summary = cv.summary or "None"

    chain = build_synthesizer_chain()
    result: _RoleList = await chain.ainvoke({
        "experience_titles": experience_titles,
        "project_names": project_names,
        "skills": skills,
        "tools": tools,
        "education": education,
        "summary": summary,
    })

    logger.info("Synthesized %d roles from CV profile", len(result.roles))
    return result.roles
