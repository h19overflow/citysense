"""Two-stage Analysis Agent — preliminary and final roadmap generation."""

import logging
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

from backend.agents.common.llm import build_llm
from backend.agents.common.monitoring import build_langfuse_config
from backend.agents.growth.analysis_prompts import build_final_prompt, build_preliminary_prompt
from backend.agents.growth.prompts import ANALYSIS_FINAL_PROMPT, ANALYSIS_PRELIMINARY_PROMPT
from backend.agents.growth.schemas import RoadmapAnalysisResult

logger = logging.getLogger(__name__)


def build_analysis_chain(system_prompt: str) -> Runnable:
    """Build a structured-output chain for the analysis agent."""
    llm = build_llm(
        model="gemini-3.1-flash-lite-preview",
        temperature=0.3,
        max_tokens=8192,
    )
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    return prompt_template | llm.with_structured_output(RoadmapAnalysisResult)


async def run_preliminary_analysis(
    cv_data: dict[str, Any],
    intake_data: dict[str, Any],
    crawl_signals: dict[str, Any],
) -> dict[str, Any]:
    """Run the preliminary analysis stage from CV + intake + crawl data."""
    chain = build_analysis_chain(ANALYSIS_PRELIMINARY_PROMPT)
    prompt = build_preliminary_prompt(cv_data, intake_data, crawl_signals)

    # ── Langfuse tracing: preliminary analysis trace ──
    config = build_langfuse_config(agent_name="growth-analysis-preliminary")
    try:
        result: RoadmapAnalysisResult = await chain.ainvoke({"input": prompt}, config=config)
        return result.model_dump()
    except (ValueError, RuntimeError) as exc:
        logger.error(
            "Preliminary analysis failed: %s",
            exc,
            extra={"operation": "run_preliminary_analysis"},
        )
        return _build_error_analysis("preliminary", str(exc))


async def run_final_analysis(
    cv_data: dict[str, Any],
    intake_data: dict[str, Any],
    crawl_signals: dict[str, Any],
    gap_answers: dict[str, Any],
    previous_analysis: dict[str, Any],
) -> dict[str, Any]:
    """Run the final analysis stage incorporating gap answers and previous version."""
    chain = build_analysis_chain(ANALYSIS_FINAL_PROMPT)
    prompt = build_final_prompt(
        cv_data, intake_data, crawl_signals, gap_answers, previous_analysis
    )

    # ── Langfuse tracing: final analysis trace ──
    config = build_langfuse_config(agent_name="growth-analysis-final")
    try:
        result: RoadmapAnalysisResult = await chain.ainvoke({"input": prompt}, config=config)
        return result.model_dump()
    except (ValueError, RuntimeError) as exc:
        logger.error(
            "Final analysis failed: %s",
            exc,
            extra={"operation": "run_final_analysis"},
        )
        return _build_error_analysis("final", str(exc))


def _build_error_analysis(stage: str, error: str) -> dict[str, Any]:
    """Return a graceful error dict matching RoadmapAnalysisResult shape."""
    empty_path = {
        "title": "Analysis unavailable",
        "rationale": f"Analysis failed: {error}",
        "timeline_estimate": "Unknown",
        "target_role": "Unknown",
        "unfair_advantage": "Unknown",
        "skill_steps": [],
    }
    return {
        "stage": stage,
        "confidence_scores": {"fill_gap": 0, "multidisciplinary": 0, "pivot": 0},
        "gap_questions": [],
        "path_fill_gap": empty_path,
        "path_multidisciplinary": empty_path,
        "path_pivot": empty_path,
        "diff_summary": "",
    }
