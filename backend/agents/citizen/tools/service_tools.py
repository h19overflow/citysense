"""Unified service lookup for the citizen agent.

Single search_all() function searches both civic and gov data
by name, category, and keyword in one call.
"""

from backend.agents.citizen.tools.service_data import (
    MAX_SEARCH_RESULTS,
    format_civic_service_details,
    format_gov_service_details,
    load_civic_features,
    load_gov_services,
    match_civic_category,
    match_civic_keyword,
)


def search_all(query: str) -> str:
    """Search both civic and gov services with a single query string.

    Matches against category, name, keyword, and tags.
    Returns detailed info for the best matches.
    """
    term = query.strip().lower()
    civic_matches = _search_civic(term)
    gov_matches = _search_gov(term)

    if not civic_matches and not gov_matches:
        return f"No services found for '{query}'."

    lines: list[str] = []

    for props in civic_matches[:MAX_SEARCH_RESULTS]:
        lines.append(format_civic_service_details(props))

    for service in gov_matches[:MAX_SEARCH_RESULTS]:
        lines.append(format_gov_service_details(service))

    header = f"Found {len(civic_matches) + len(gov_matches)} result(s) for '{query}':\n"
    return header + "\n---\n".join(lines)


def _search_civic(term: str) -> list[dict]:
    """Search civic_services.geojson by category and name/keyword."""
    features = load_civic_features()
    matches = []
    for f in features:
        props = f["properties"]
        if match_civic_category(props, term) or match_civic_keyword(props, term):
            matches.append(props)
    return matches


def _search_gov(term: str) -> list[dict]:
    """Search gov_services.json by title, category, and tags."""
    services = load_gov_services()
    matches = []
    for s in services:
        searchable = " ".join([
            s.get("title", ""),
            s.get("category", ""),
            " ".join(s.get("tags", [])),
        ]).lower()
        if term in searchable:
            matches.append(s)
    return matches
