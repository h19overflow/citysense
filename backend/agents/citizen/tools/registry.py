"""LangChain tool registry for the citizen agent.

Uses web search (SERP) for service lookups and map tools for UI commands.
"""

from langchain_core.tools import tool

from backend.agents.citizen.tools import map_command_tools
from backend.agents.common import web_search


@tool
def search_montgomery(query: str) -> str:
    """Search for information about a service, place, or program in Montgomery AL.

    The query is automatically scoped to Montgomery Alabama.
    Use this for: service details, hours, phone numbers, programs offered,
    what to bring, eligibility, and any civic service question.

    Examples: "Newtown Community Center", "WIC office hours",
    "free childcare programs", "Medicaid application".
    """
    return web_search.search_montgomery_web(query)


@tool
def filter_map_category(category: str) -> str:
    """Show a service category on the map. Only use when user asks to see the map.

    Categories: health, childcare, education, community, safety,
    libraries, parks, police.
    """
    return map_command_tools.filter_map_category(category)


@tool
def zoom_to_location(lat: float, lng: float, label: str) -> str:
    """Zoom the map to a specific location. Only use when user asks."""
    return map_command_tools.zoom_to_location(lat, lng, label)


CITIZEN_TOOLS = [
    search_montgomery,
    filter_map_category,
    zoom_to_location,
]
