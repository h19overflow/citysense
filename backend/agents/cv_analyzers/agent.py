"""CV page analysis agent.

Uses the shared LLM factory with CV-specific config to extract
structured data from individual CV pages via structured output.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate

from backend.agents.common.llm import build_llm
from backend.core.cv_pipeline.schemas import PageAnalysis

from .config import (
    CV_ANALYSIS_MAX_TOKENS,
    CV_ANALYSIS_MODEL,
    CV_ANALYSIS_TEMPERATURE,
)
from .prompts import CV_PAGE_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)


def build_cv_analyzer_chain():
    """Build a LangChain chain for CV page analysis with structured output."""
    llm = build_llm(
        model=CV_ANALYSIS_MODEL,
        temperature=CV_ANALYSIS_TEMPERATURE,
        max_tokens=CV_ANALYSIS_MAX_TOKENS,
    )
    prompt = ChatPromptTemplate.from_messages([
        ("human", CV_PAGE_ANALYSIS_PROMPT),
    ])
    return prompt | llm.with_structured_output(PageAnalysis)


async def analyze_cv_page(page_content: str) -> PageAnalysis:
    """Analyze a single CV page and return structured extraction.

    Args:
        page_content: Raw text content of a single CV page.

    Returns:
        PageAnalysis with extracted experience, skills, tools, etc.
    """
    chain = build_cv_analyzer_chain()
    result: PageAnalysis = await chain.ainvoke({
        "page_content": page_content,
    })
    result.raw_text = page_content
    logger.info(
        "Extracted %d skills, %d experience entries from page",
        len(result.skills),
        len(result.experience),
    )
    return result
