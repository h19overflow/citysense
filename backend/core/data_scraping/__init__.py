"""Data scraping package — Strategy pattern scrapers with shared base class.

Usage:
    from backend.core.data_scraping import BaseScraper
    from backend.core.data_scraping.scrapers import JobsScraper, NewsScraper
    from backend.core.data_scraping.scheduler import start_scheduled_scraping
"""

from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.scheduler import start_scheduled_scraping
