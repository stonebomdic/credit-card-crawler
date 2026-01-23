import random
import time
from typing import Optional

import requests
from bs4 import BeautifulSoup
from loguru import logger

from src.config import get_settings

settings = get_settings()

USER_AGENTS = [
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
    ),
]


def get_random_headers() -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    }


def random_delay():
    delay = random.uniform(settings.crawler_delay_min, settings.crawler_delay_max)
    time.sleep(delay)


def fetch_page(url: str, retries: Optional[int] = None) -> Optional[BeautifulSoup]:
    if retries is None:
        retries = settings.crawler_max_retries

    for attempt in range(retries):
        try:
            random_delay()
            response = requests.get(url, headers=get_random_headers(), timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.text, "lxml")
        except requests.RequestException as e:
            logger.warning(f"Attempt {attempt + 1}/{retries} failed for {url}: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)

    logger.error(f"Failed to fetch {url} after {retries} attempts")
    return None
