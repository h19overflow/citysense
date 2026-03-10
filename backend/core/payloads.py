"""Scraper payloads, search queries, and skill category definitions.

All data-heavy constants that drive the scraping pipelines live here,
keeping config.py focused on credentials, IDs, and file paths.
"""

from backend.config import DATASETS

# ---------------------------------------------------------------------------
# Job scraper payloads
# ---------------------------------------------------------------------------

# Multiple keywords per scraper = more diverse results discovered.
# Each keyword triggers a separate search on the job board.

_INDEED_KEYWORDS = [
    "jobs", "healthcare", "nursing", "warehouse", "customer service",
    "manufacturing", "retail", "CDL driver", "education", "government",
    "construction", "IT", "accounting", "administrative", "logistics",
]

_LINKEDIN_KEYWORDS = [
    "jobs", "healthcare", "engineering", "marketing", "finance",
    "technology", "education", "management", "sales", "operations",
    "human resources", "analyst", "project manager", "logistics",
]

_GLASSDOOR_KEYWORDS = [
    "jobs", "healthcare", "nursing", "warehouse", "customer service",
    "manufacturing", "technology", "government", "education",
]

JOB_SCRAPERS = [
    {
        "name": "Indeed",
        "dataset_id": DATASETS["indeed"],
        "payload": [
            {
                "country": "US",
                "domain": "indeed.com",
                "keyword_search": kw,
                "location": "Montgomery, AL",
            }
            for kw in _INDEED_KEYWORDS
        ],
        "params": {
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "100",
        },
    },
    {
        "name": "LinkedIn",
        "dataset_id": DATASETS["linkedin"],
        "payload": [
            {
                "keyword": kw,
                "location": "Montgomery, Alabama, United States",
                "country": "US",
            }
            for kw in _LINKEDIN_KEYWORDS
        ],
        "params": {
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "100",
        },
    },
    {
        "name": "Glassdoor",
        "dataset_id": DATASETS["glassdoor_jobs"],
        "payload": [
            {
                "keyword": kw,
                "location": "Montgomery, Alabama",
            }
            for kw in _GLASSDOOR_KEYWORDS
        ],
        "params": {
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "100",
        },
    },
]

# ---------------------------------------------------------------------------
# News queries (SERP API)
# ---------------------------------------------------------------------------

NEWS_QUERIES = [
    {"query": "Montgomery Alabama news today", "category": "general"},
    {"query": "Montgomery Alabama latest news", "category": "general"},
    {"query": "Montgomery AL breaking news", "category": "general"},
    {"query": "Montgomery Alabama development projects", "category": "development"},
    {"query": "Montgomery Alabama housing construction", "category": "development"},
    {"query": "Montgomery Alabama new business opening", "category": "development"},
    {"query": "Montgomery Alabama infrastructure investment", "category": "development"},
    {"query": "Montgomery Alabama real estate development", "category": "development"},
    {"query": "Montgomery Alabama city council government", "category": "government"},
    {"query": "Montgomery Alabama mayor city hall", "category": "government"},
    {"query": "Montgomery Alabama public policy budget", "category": "government"},
    {"query": "Montgomery Alabama zoning permits", "category": "government"},
    {"query": "Montgomery Alabama community events", "category": "events"},
    {"query": "Montgomery Alabama festivals concerts", "category": "events"},
    {"query": "Montgomery Alabama volunteer nonprofit", "category": "community"},
    {"query": "Montgomery Alabama crime safety police", "category": "community"},
    {"query": "Montgomery Alabama schools education", "category": "community"},
    {"query": "Montgomery Alabama parks recreation", "category": "community"},
    {"query": "Montgomery Alabama jobs hiring employers", "category": "general"},
    {"query": "Montgomery Alabama economy employment", "category": "general"},
    {"query": "Montgomery Alabama small business", "category": "development"},
    {"query": "Montgomery Alabama health hospital clinic", "category": "community"},
]

# ---------------------------------------------------------------------------
# Benefits scrape targets (Web Unlocker)
# ---------------------------------------------------------------------------

BENEFITS_TARGETS = [
    {
        "id": "svc-medicaid-al",
        "name": "Alabama Medicaid",
        "url": "https://medicaid.alabama.gov",
        "category": "healthcare",
    },
    {
        "id": "svc-snap-al",
        "name": "SNAP (Food Stamps)",
        "url": "https://dhr.alabama.gov/food-assistance/",
        "category": "food",
    },
    {
        "id": "svc-tanf-al",
        "name": "TANF",
        "url": "https://dhr.alabama.gov/temporary-assistance/",
        "category": "benefits",
    },
]

# ---------------------------------------------------------------------------
# Skill categories (job matching)
# ---------------------------------------------------------------------------

SKILL_CATEGORIES = {
    "education": [
        "high school", "ged", "bachelor", "associate", "master", "diploma",
        "degree", "college", "university", "certification", "licensed",
    ],
    "technical": [
        "cdl", "forklift", "hvac", "welding", "electrical", "plumbing",
        "mechanical", "cnc", "autocad", "microsoft office", "excel",
        "computer", "software", "programming", "python", "sql", "data entry",
    ],
    "healthcare": [
        "cna", "rn", "lpn", "nursing", "cpr", "first aid", "patient care",
        "medical", "phlebotomy", "emt", "pharmacy", "clinical",
    ],
    "soft_skills": [
        "communication", "teamwork", "leadership", "customer service",
        "problem solving", "time management", "detail oriented",
        "organizational", "multitask",
    ],
    "experience": [
        "1 year", "2 year", "3 year", "5 year", "experience required",
        "entry level", "no experience", "years of experience",
    ],
    "physical": [
        "lifting", "standing", "physical", "warehouse", "manual labor",
        "outdoors", "driving", "travel",
    ],
    "clearance": [
        "background check", "drug test", "drug screen", "security clearance",
        "fingerprint",
    ],
}
