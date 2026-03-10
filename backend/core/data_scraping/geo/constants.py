"""Geographic constants for Montgomery, AL geocoding."""

MONTGOMERY_CENTER = (32.3668, -86.3000)

MONTGOMERY_BOUNDS = {
    "lat_min": 32.20,
    "lat_max": 32.55,
    "lng_min": -86.55,
    "lng_max": -86.10,
}

# Specific neighborhoods — matched first for precise geocoding
MONTGOMERY_NEIGHBORHOODS = [
    "Downtown", "Midtown", "Old Cloverdale", "Cloverdale",
    "Capitol Heights", "Garden District", "Highland Park",
    "Woodmere", "Dalraida", "Normandale", "Chisholm",
    "Arrowhead", "McGehee", "Hampstead", "Pike Road",
    "Prattville", "Wetumpka", "Millbrook", "Eastdale",
    "West Montgomery", "East Montgomery", "Carmichael",
    "Vaughn", "Catoma", "Old Town", "Maxwell", "Gunter",
]

# City-level keywords — triggers fallback to jittered city center
CITY_LEVEL_KEYWORDS = [
    "montgomery", "montgomery county", "montgomery al",
    "alabama state", "asu", "alabama state university",
    "montgomery public schools", "mps",
    "montgomery police", "montgomery fire",
    "river region", "capitol city",
    "alabama legislature", "alabama house", "alabama senate",
    "governor ivey", "gov. ivey", "kay ivey",
    "alabama department", "alabama state capitol",
    "alfa insurance", "hyundai motor manufacturing alabama",
]

# Known landmarks → geocode via SERP for precise placement
MONTGOMERY_LANDMARKS = [
    "Riverwalk", "Montgomery Whitewater", "Riverfront Park",
    "Alabama State Capitol", "Dexter Avenue", "Court Square",
    "Cramton Bowl", "ASU Stadium", "Garrett Coliseum",
    "Baptist Medical Center", "Jackson Hospital",
    "Montgomery Regional Airport", "Dannelly Field",
    "Eastdale Mall", "Montgomery Mall", "The Shoppes",
    "Troy University Montgomery", "AUM", "Faulkner University",
    "Maxwell Air Force Base", "Gunter Annex",
]

LOCATION_PATTERNS = [
    r"\b(\d{2,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Ave|Blvd|Rd|Dr|Ln|Way|Pkwy|Hwy))\b",
    r"\b((?:North|South|East|West)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b",
    r"\b(I-\d+|Interstate\s+\d+|US\s+\d+|Highway\s+\d+)\b",
]
