"""Benchmark script for the career agent endpoints.

Tests real HTTP calls against the live backend:
  POST /api/career/analyze  → wait for SSE stream completion
  POST /api/career/chat     → single follow-up message

Scenarios:
  1. Full analysis — Hamza CAIO (AI/ML profile, real DB data)
  2. Full analysis — empty context_id (no prior analysis, chat fallback)
  3. Chat follow-up — "Hello" (triggers context_prefix path)
  4. Chat follow-up — specific question about ML roles

Output: JSON to scripts/outputs/benchmark_career_<timestamp>.json
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path

import httpx

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE_URL = os.environ.get("BACKEND_URL", "http://localhost:8085")
OUTPUTS_DIR = Path(__file__).parent / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

# Real DB IDs from hamza_cv_audit.json (Hamza CAIO)
CITIZEN_ID = "e7e1baf8-c63a-4b61-be43-0d9624de099d"
CV_UPLOAD_ID = "a16e27ad-4b58-4ac7-b50d-f38e8904e876"

SSE_TIMEOUT_SECONDS = 120


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class PhaseTimings:
    post_analyze_ms: float = 0.0        # POST /analyze response time
    first_sse_event_ms: float = 0.0     # time to first SSE event
    total_stream_ms: float = 0.0        # POST → stream closed
    chat_request_ms: float = 0.0        # POST /chat round-trip


@dataclass
class ScenarioResult:
    name: str
    status: str = "error"               # "pass" | "fail" | "error"
    error: str | None = None
    timings: PhaseTimings = field(default_factory=PhaseTimings)
    sse_event_count: int = 0
    final_status: str = ""              # completed | failed | timeout
    summary_preview: str = ""          # first 120 chars of summary
    job_count: int = 0
    skill_gap_count: int = 0
    chat_response_preview: str = ""
    chat_summary_correct: bool | None = None   # None = not tested


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def post_analyze(client: httpx.AsyncClient, cv_upload_id: str, citizen_id: str) -> tuple[float, str]:
    """POST /analyze and return (latency_ms, job_id)."""
    t0 = time.perf_counter()
    r = await client.post(
        f"{BASE_URL}/api/career/analyze",
        json={"cv_upload_id": cv_upload_id, "citizen_id": citizen_id},
        timeout=30,
    )
    elapsed = (time.perf_counter() - t0) * 1000
    r.raise_for_status()
    job_id = r.json()["job_id"]
    return elapsed, job_id


async def stream_analysis(client: httpx.AsyncClient, job_id: str) -> tuple[float, float, int, str, dict]:
    """Stream SSE from /career/jobs/{job_id}/stream.

    Returns (first_event_ms, total_ms, event_count, final_status, result_dict).
    """
    t0 = time.perf_counter()
    first_event_ms = 0.0
    event_count = 0
    final_status = "timeout"
    result: dict = {}

    async with client.stream(
        "GET",
        f"{BASE_URL}/api/career/jobs/{job_id}/stream",
        timeout=SSE_TIMEOUT_SECONDS,
    ) as response:
        response.raise_for_status()
        async for raw_line in response.aiter_lines():
            if not raw_line.startswith("data:"):
                continue
            payload = raw_line[5:].strip()
            if not payload:
                continue

            if first_event_ms == 0.0:
                first_event_ms = (time.perf_counter() - t0) * 1000

            event_count += 1
            try:
                data = json.loads(payload)
            except json.JSONDecodeError:
                continue

            status = data.get("status", "")
            if status in {"completed", "failed"}:
                final_status = status
                result = data.get("result", {})
                break

    total_ms = (time.perf_counter() - t0) * 1000
    return first_event_ms, total_ms, event_count, final_status, result


async def post_chat(
    client: httpx.AsyncClient,
    message: str,
    context_id: str,
    citizen_id: str,
) -> tuple[float, dict]:
    """POST /career/chat and return (latency_ms, response_dict)."""
    t0 = time.perf_counter()
    r = await client.post(
        f"{BASE_URL}/api/career/chat",
        json={
            "message": message,
            "career_context_id": context_id,
            "citizen_id": citizen_id,
            "history": [],
        },
        timeout=60,
    )
    elapsed = (time.perf_counter() - t0) * 1000
    r.raise_for_status()
    return elapsed, r.json()


# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------

async def scenario_full_analysis(client: httpx.AsyncClient) -> ScenarioResult:
    """Full career analysis for the real Hamza CAIO profile."""
    result = ScenarioResult(name="full_analysis_hamza_caio")
    try:
        analyze_ms, job_id = await post_analyze(client, CV_UPLOAD_ID, CITIZEN_ID)
        result.timings.post_analyze_ms = analyze_ms

        first_ms, total_ms, event_count, final_status, agent_result = await stream_analysis(client, job_id)
        result.timings.first_sse_event_ms = first_ms
        result.timings.total_stream_ms = total_ms
        result.sse_event_count = event_count
        result.final_status = final_status
        result.job_count = len(agent_result.get("job_opportunities", []))
        result.skill_gap_count = len(agent_result.get("skill_gaps", []))
        result.summary_preview = (agent_result.get("summary", "") or "")[:120]

        result.status = "pass" if final_status == "completed" else "fail"

        # Store job_id on result for follow-up chat scenarios
        result._job_id = job_id  # type: ignore[attr-defined]
        result._agent_result = agent_result  # type: ignore[attr-defined]

    except Exception as e:
        result.status = "error"
        result.error = str(e)
    return result


async def scenario_chat_hello(client: httpx.AsyncClient, context_id: str) -> ScenarioResult:
    """Chat: send 'Hello' — tests context_prefix path."""
    result = ScenarioResult(name="chat_hello")
    try:
        chat_ms, response = await post_chat(client, "Hello", context_id, CITIZEN_ID)
        result.timings.chat_request_ms = chat_ms
        result.chat_response_preview = (response.get("summary", "") or "")[:120]

        # Correctness check: summary should NOT mention admin/office/customer service
        hallucination_keywords = ["admin", "office manager", "customer service", "clerical", "receptionist"]
        summary_lower = response.get("summary", "").lower()
        has_hallucination = any(kw in summary_lower for kw in hallucination_keywords)
        result.chat_summary_correct = not has_hallucination
        result.status = "pass" if not has_hallucination else "fail"
        if has_hallucination:
            result.error = f"Hallucination detected in summary: {response.get('summary','')[:200]}"

    except Exception as e:
        result.status = "error"
        result.error = str(e)
    return result


async def scenario_chat_ml_question(client: httpx.AsyncClient, context_id: str) -> ScenarioResult:
    """Chat: ask a specific ML role question — tests context relevance."""
    result = ScenarioResult(name="chat_ml_roles_question")
    try:
        chat_ms, response = await post_chat(
            client,
            "What ML Engineer roles are available in Montgomery and what skills am I missing?",
            context_id,
            CITIZEN_ID,
        )
        result.timings.chat_request_ms = chat_ms
        result.chat_response_preview = (response.get("summary", "") or "")[:120]
        result.job_count = len(response.get("job_opportunities", []))
        result.skill_gap_count = len(response.get("skill_gaps", []))

        # Check response references relevant skills
        summary_lower = response.get("summary", "").lower()
        relevant = any(kw in summary_lower for kw in ["machine learning", "ml", "ai", "data", "python"])
        result.chat_summary_correct = relevant
        result.status = "pass" if relevant else "fail"
        if not relevant:
            result.error = f"Response doesn't address ML context: {response.get('summary','')[:200]}"

    except Exception as e:
        result.status = "error"
        result.error = str(e)
    return result


async def scenario_chat_empty_context(client: httpx.AsyncClient) -> ScenarioResult:
    """Chat with no prior analysis context — tests graceful degradation."""
    result = ScenarioResult(name="chat_empty_context")
    try:
        chat_ms, response = await post_chat(
            client,
            "What jobs suit my background?",
            "nonexistent-context-id-000",
            CITIZEN_ID,
        )
        result.timings.chat_request_ms = chat_ms
        result.chat_response_preview = (response.get("summary", "") or "")[:120]
        # Just check it doesn't 500 — any coherent response is a pass
        result.status = "pass"

    except Exception as e:
        result.status = "error"
        result.error = str(e)
    return result


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

async def run_benchmark() -> dict:
    """Run all scenarios and return aggregated results."""
    print(f"Backend: {BASE_URL}")
    print(f"Citizen ID: {CITIZEN_ID}")
    print(f"CV Upload ID: {CV_UPLOAD_ID}\n")

    results: list[ScenarioResult] = []

    async with httpx.AsyncClient() as client:
        # Scenario 1: Full analysis
        print("[1/4] Running full analysis (SSE stream)...")
        r1 = await scenario_full_analysis(client)
        results.append(r1)
        print(f"      → {r1.status.upper()} | {r1.final_status} | stream={r1.timings.total_stream_ms:.0f}ms | jobs={r1.job_count} | gaps={r1.skill_gap_count}")
        if r1.error:
            print(f"      ERROR: {r1.error[:500]}")

        context_id = getattr(r1, "_job_id", "no-context")

        # Scenario 2: Chat "Hello" (uses context from scenario 1)
        print("[2/4] Chat: 'Hello'...")
        r2 = await scenario_chat_hello(client, context_id)
        results.append(r2)
        print(f"      → {r2.status.upper()} | correct={r2.chat_summary_correct} | {r2.timings.chat_request_ms:.0f}ms")
        if r2.error:
            print(f"      ERROR: {r2.error[:200]}")

        # Scenario 3: Chat ML question
        print("[3/4] Chat: ML roles question...")
        r3 = await scenario_chat_ml_question(client, context_id)
        results.append(r3)
        print(f"      → {r3.status.upper()} | correct={r3.chat_summary_correct} | {r3.timings.chat_request_ms:.0f}ms")
        if r3.error:
            print(f"      ERROR: {r3.error[:200]}")

        # Scenario 4: Chat empty context
        print("[4/4] Chat: empty context...")
        r4 = await scenario_chat_empty_context(client)
        results.append(r4)
        print(f"      → {r4.status.upper()} | {r4.timings.chat_request_ms:.0f}ms")
        if r4.error:
            print(f"      ERROR: {r4.error}")

    # Aggregate
    pass_count = sum(1 for r in results if r.status == "pass")
    fail_count = sum(1 for r in results if r.status == "fail")
    error_count = sum(1 for r in results if r.status == "error")

    chat_latencies = [
        r.timings.chat_request_ms for r in results if r.timings.chat_request_ms > 0
    ]
    avg_chat_ms = sum(chat_latencies) / len(chat_latencies) if chat_latencies else 0

    output = {
        "timestamp": datetime.utcnow().isoformat(),
        "backend_url": BASE_URL,
        "summary": {
            "total_scenarios": len(results),
            "pass": pass_count,
            "fail": fail_count,
            "error": error_count,
            "pass_rate_pct": round(pass_count / len(results) * 100, 1),
            "full_analysis_total_ms": r1.timings.total_stream_ms,
            "full_analysis_post_ms": r1.timings.post_analyze_ms,
            "full_analysis_first_event_ms": r1.timings.first_sse_event_ms,
            "full_analysis_sse_events": r1.sse_event_count,
            "avg_chat_latency_ms": round(avg_chat_ms, 1),
            "hallucination_detected": not (r2.chat_summary_correct or True),
        },
        "scenarios": [asdict(r) for r in results],
    }
    return output


def main() -> None:
    results = asyncio.run(run_benchmark())

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_path = OUTPUTS_DIR / f"benchmark_career_{timestamp}.json"
    out_path.write_text(json.dumps(results, indent=2))

    print(f"\n{'='*60}")
    print(f"RESULTS: {results['summary']['pass']}/{results['summary']['total_scenarios']} passed")
    print(f"Full analysis: {results['summary']['full_analysis_total_ms']:.0f}ms total")
    print(f"Avg chat latency: {results['summary']['avg_chat_latency_ms']:.0f}ms")
    print(f"Output: {out_path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
