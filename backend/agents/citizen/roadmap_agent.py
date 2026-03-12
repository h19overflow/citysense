"""Personalized civic-service roadmap generation agent."""

from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from backend.agents.common.llm import build_llm
from backend.api.schemas.roadmap_schemas import (
    CitizenMeta,
    PersonalizedRoadmap,
    RoadmapDraft,
    RoadmapLocation,
    RoadmapStep,
)
from backend.config import PUBLIC_DATA
from backend.core.redis_client import cache

logger = logging.getLogger("roadmap_agent")
ROADMAP_CACHE_TTL = int(os.environ.get("ROADMAP_CACHE_TTL", "86400"))


def _gov_services_candidates() -> list[Path]:
    env_path = os.environ.get("GOV_SERVICES_PATH")
    candidates: list[Path] = []
    if env_path:
        candidates.append(Path(env_path))
    candidates.extend([
        PUBLIC_DATA / "gov_services.json",
        Path(__file__).resolve().parents[1] / "data" / "gov_services.json",
    ])
    return candidates


def _resolve_gov_services_path() -> Path:
    for path in _gov_services_candidates():
        if path.exists():
            return path
    searched = ", ".join(str(p) for p in _gov_services_candidates())
    raise FileNotFoundError(f"gov_services.json not found. Searched: {searched}")

SYSTEM_PROMPT = """You are CivicPath, an expert civic navigator for Montgomery, Alabama.
Your job is to turn government service documentation into a clear roadmap a resident can follow.

Rules:
1. Use only facts provided in the official service documentation.
2. Write in plain English with concrete steps.
3. If documentation is incomplete, make the first step tell the resident to contact the provider to confirm details.
4. Never return an empty roadmap.
5. Keep titles short and action-oriented.
6. Mention Montgomery-specific office details when available."""


@lru_cache(maxsize=1)
def _load_services() -> dict[str, dict[str, Any]]:
    services_path = _resolve_gov_services_path()
    with open(services_path, encoding="utf-8") as f:
        data = json.load(f)
    return {service["id"]: service for service in data["services"]}


def _get_service(service_id: str) -> dict[str, Any]:
    try:
        services = _load_services()
    except FileNotFoundError as exc:
        raise RuntimeError(str(exc)) from exc
    if service_id not in services:
        available = ", ".join(sorted(services.keys()))
        raise ValueError(f"Service '{service_id}' not found. Available: {available}")
    return services[service_id]


@lru_cache(maxsize=1)
def _build_chain():
    llm = build_llm(temperature=0.1, max_tokens=4096)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{prompt}"),
    ])
    return prompt | llm.with_structured_output(RoadmapDraft)


def _format_income_limits(limits: Any) -> list[str]:
    if isinstance(limits, dict):
        return [
            f"Household of {size}: ${amount:,.0f}/month"
            for size, amount in limits.items()
            if isinstance(amount, (int, float))
        ]
    if isinstance(limits, list):
        return [str(item) for item in limits if item]
    return []


def _format_guide_for_prompt(guide: dict[str, Any]) -> str:
    lines = [
        f"SERVICE: {guide['title']}",
        f"PROVIDER: {guide.get('provider') or 'N/A'}",
        f"DESCRIPTION: {guide.get('description') or 'N/A'}",
        f"ADDRESS: {guide.get('address') or 'N/A'}",
        f"PHONE: {guide.get('phone') or 'N/A'}",
        f"WEBSITE: {guide.get('url') or 'N/A'}",
        "",
        "ELIGIBILITY:",
    ]
    for item in guide.get("eligibility", []):
        lines.append(f"- {item}")
    lines.extend(["", "HOW TO APPLY:"])
    for idx, step in enumerate(guide.get("how_to_apply", []), start=1):
        lines.append(f"{idx}. {step}")
    lines.extend(["", "DOCUMENTS NEEDED:"])
    for doc in guide.get("documents_needed", []):
        lines.append(f"- {doc}")
    income_limits = _format_income_limits(guide.get("income_limits"))
    if income_limits:
        lines.extend(["", "INCOME LIMITS:"])
        for limit in income_limits:
            lines.append(f"- {limit}")
    return "\n".join(lines)


def _build_citizen_summary(citizen: CitizenMeta) -> str:
    civic = citizen.civic_data
    return "\n".join([
        f"Persona: {citizen.persona}",
        f"Tagline: {citizen.tagline}",
        f"Zip code: {civic.zip or 'Montgomery, AL'}",
        f"Household size: {civic.household_size or 'unknown'}",
        f"Monthly income: {civic.income if civic.income is not None else 'unknown'}",
        f"Income source: {civic.income_source or 'unknown'}",
        f"Housing type: {civic.housing_type or 'unknown'}",
        f"Monthly rent: {civic.monthly_rent if civic.monthly_rent is not None else 'unknown'}",
        f"Children: {civic.children if civic.children is not None else 0}",
        f"Children ages: {civic.children_ages or []}",
        f"Has vehicle: {civic.has_vehicle}",
        f"Primary transport: {civic.primary_transport or 'unknown'}",
        f"Veteran status: {civic.veteran_status}",
        f"Disability status: {civic.disability_status}",
        f"Citizenship status: {civic.citizenship_status or 'unknown'}",
        f"Health insurance: {civic.health_insurance or 'unknown'}",
        f"Goals: {'; '.join(citizen.goals[:2]) or 'none provided'}",
        f"Barriers: {'; '.join(citizen.barriers[:2]) or 'none provided'}",
    ])


def _build_prompt(citizen: CitizenMeta | None, guide: dict[str, Any]) -> str:
    guide_text = _format_guide_for_prompt(guide)
    if citizen is None:
        return (
            f"Convert this official service documentation into a practical step-by-step "
            f"roadmap for any Montgomery resident.\n\n"
            f"OFFICIAL SERVICE DOCUMENTATION\n{guide_text}\n\n"
            f"Requirements:\n"
            f"- Summarize who qualifies in eligibility_note.\n"
            f"- Provide a realistic total_estimated_time.\n"
            f"- Each step must explain what to do, which documents matter, whether it "
            f"can be done online, and where to go when in-person help is needed.\n"
            f"- If HOW TO APPLY is empty, begin with a contact-the-provider step "
            f"and then outline the safest next actions."
        )
    citizen_text = _build_citizen_summary(citizen)
    return (
        f"Transform this official service documentation into a personalized roadmap "
        f"for the resident below.\n\n"
        f"CITIZEN PROFILE\n{citizen_text}\n\n"
        f"OFFICIAL SERVICE DOCUMENTATION\n{guide_text}\n\n"
        f"Requirements:\n"
        f"- Explain why this resident appears eligible using their income, household, "
        f"housing, or other relevant profile details.\n"
        f"- Rewrite each step in plain English directly for this resident.\n"
        f"- Filter documents down to what matters most for that resident.\n"
        f"- If HOW TO APPLY is empty, begin with a contact-the-provider step "
        f"tailored to their situation."
    )


def _build_cache_key(service_id: str, citizen: CitizenMeta | None) -> str:
    if citizen is None:
        return f"roadmap:generic:{service_id}"
    citizen_hash = hashlib.md5(
        citizen.model_dump_json(by_alias=True).encode()
    ).hexdigest()
    return f"roadmap:personalized:{service_id}:{citizen_hash}"


def _build_fallback_steps(guide: dict[str, Any]) -> list[RoadmapStep]:
    address = guide.get("address")
    phone = guide.get("phone") or None
    location = None
    if address and address != "N/A \u2014 phone and web service":
        location = RoadmapLocation(
            name=guide.get("provider") or guide["title"],
            address=address,
            hours=str(guide.get("hours") or ""),
            phone=phone,
        )
    source_steps = guide.get("how_to_apply", [])
    if not source_steps:
        source_steps = [
            f"Contact {guide['title']} to confirm the latest eligibility rules and how to start.",
            "Gather your identification, income, and household documents before applying.",
            "Complete the application online or in person and track follow-up requests.",
        ]
    return [
        RoadmapStep(
            id=f"step-{idx}-{guide['id']}",
            step_number=idx,
            title=f"Step {idx}",
            action=action,
            documents=list(guide.get("documents_needed", []))[:4],
            location=location if idx == 1 else None,
            estimated_time="Varies",
            pro_tip=None,
            can_do_online=bool(guide.get("url")),
            online_url=guide.get("url"),
        )
        for idx, action in enumerate(source_steps, start=1)
    ]


def _build_roadmap_model(
    draft: RoadmapDraft,
    guide: dict[str, Any],
    citizen: CitizenMeta | None,
) -> PersonalizedRoadmap:
    draft_steps = draft.steps or []
    if not draft_steps:
        steps = _build_fallback_steps(guide)
    else:
        steps = [
            RoadmapStep(
                id=f"step-{idx}-{guide['id']}",
                step_number=step.step_number or idx,
                title=step.title or f"Step {idx}",
                action=step.action,
                documents=step.documents,
                location=step.location,
                estimated_time=step.estimated_time,
                pro_tip=step.pro_tip,
                can_do_online=step.can_do_online,
                online_url=step.online_url,
            )
            for idx, step in enumerate(draft_steps, start=1)
        ]
    citizen_id = citizen.id if citizen else "generic"
    now = datetime.now(timezone.utc).isoformat()
    return PersonalizedRoadmap(
        id=f"roadmap-{guide['id']}-{citizen_id}-{int(datetime.now(timezone.utc).timestamp())}",
        service_id=guide["id"],
        service_title=guide["title"],
        service_category=guide.get("category", ""),
        eligibility_note=draft.eligibility_note or "Review the official requirements before applying.",
        total_estimated_time=draft.total_estimated_time or "Varies",
        steps=steps,
        generated_at=now,
    )


def generate_personalized_roadmap(
    citizen: CitizenMeta | None,
    service_id: str,
) -> PersonalizedRoadmap:
    """Generate or fetch a cached civic-service roadmap."""
    cache_key = _build_cache_key(service_id, citizen)
    cached = cache.fetch(cache_key)
    if cached:
        try:
            logger.info("Roadmap cache hit for %s", cache_key)
            return PersonalizedRoadmap.model_validate(cached)
        except Exception as exc:
            logger.warning("Ignoring invalid cached roadmap for %s: %s", cache_key, exc)

    guide = _get_service(service_id)
    prompt = _build_prompt(citizen, guide)

    draft: RoadmapDraft
    try:
        draft = _build_chain().invoke({"prompt": prompt})
    except Exception as exc:
        logger.warning(
            "Roadmap LLM generation failed for %s; using fallback steps. Error: %s",
            service_id,
            exc,
        )
        draft = RoadmapDraft(
            eligibility_note="Auto-generated fallback roadmap. Confirm the latest requirements with the provider.",
            total_estimated_time="Varies",
            steps=[],
        )

    roadmap = _build_roadmap_model(draft, guide, citizen)

    try:
        cache.store(cache_key, roadmap.model_dump(by_alias=True), ttl=ROADMAP_CACHE_TTL)
    except Exception as exc:
        logger.warning("Roadmap cache write failed for %s: %s", cache_key, exc)

    return roadmap
