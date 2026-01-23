# Credit Card Crawler 實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立台灣信用卡資訊爬蟲系統，提供信用卡查詢、優惠搜尋和個人化推薦功能。

**Architecture:** 模組化單體架構，分為 crawlers（爬蟲）、models（資料模型）、api（REST API）、recommender（推薦引擎）四大模組。使用 SQLite 儲存資料，FastAPI 提供 API，APScheduler 管理排程。

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy, BeautifulSoup4, Playwright, APScheduler, SQLite

---

## Phase 1: 專案基礎架構

### Task 1: 初始化專案結構

**Files:**
- Create: `pyproject.toml`
- Create: `src/__init__.py`
- Create: `src/config.py`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`

**Step 1: 建立 pyproject.toml**

```toml
[project]
name = "credit-card-crawler"
version = "0.1.0"
description = "台灣信用卡資訊爬蟲與推薦系統"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "sqlalchemy>=2.0.0",
    "aiosqlite>=0.19.0",
    "requests>=2.31.0",
    "beautifulsoup4>=4.12.0",
    "lxml>=5.0.0",
    "playwright>=1.41.0",
    "apscheduler>=3.10.0",
    "python-dotenv>=1.0.0",
    "loguru>=0.7.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.26.0",
    "ruff>=0.1.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

**Step 2: 建立 .gitignore**

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
dist/
*.egg-info/
.eggs/

# Virtual environments
.venv/
venv/
ENV/

# IDE
.idea/
.vscode/
*.swp
*.swo

# Environment
.env
.env.local

# Database
data/*.db

# Logs
logs/
*.log

# Testing
.pytest_cache/
.coverage
htmlcov/

# Playwright
.playwright/
```

**Step 3: 建立 .env.example**

```
# Database
DATABASE_URL=sqlite+aiosqlite:///./data/credit_cards.db

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# Crawler
CRAWLER_DELAY_MIN=2
CRAWLER_DELAY_MAX=5
CRAWLER_MAX_RETRIES=3
```

**Step 4: 建立 src/__init__.py**

```python
"""Credit Card Crawler - 台灣信用卡資訊爬蟲與推薦系統"""

__version__ = "0.1.0"
```

**Step 5: 建立 src/config.py**

```python
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./data/credit_cards.db"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True

    # Crawler
    crawler_delay_min: int = 2
    crawler_delay_max: int = 5
    crawler_max_retries: int = 3

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Step 6: 建立基本 README.md**

```markdown
# Credit Card Crawler

台灣信用卡資訊爬蟲與推薦系統

## 功能

- 爬取台灣主要銀行信用卡資訊
- 信用卡優惠活動查詢
- 根據消費習慣推薦最適合的信用卡

## 安裝

\`\`\`bash
# 建立虛擬環境
python -m venv .venv
source .venv/bin/activate  # macOS/Linux

# 安裝依賴
pip install -e ".[dev]"

# 安裝 Playwright 瀏覽器
playwright install chromium
\`\`\`

## 執行

\`\`\`bash
# 啟動 API 服務
uvicorn src.main:app --reload

# 執行爬蟲
python -m src.crawlers.run
\`\`\`

## API 文件

啟動服務後，訪問 http://localhost:8000/docs 查看 API 文件。
```

**Step 7: 建立目錄結構**

```bash
mkdir -p src/crawlers/banks src/models src/api src/recommender src/db tests data logs
touch src/crawlers/__init__.py src/crawlers/banks/__init__.py
touch src/models/__init__.py src/api/__init__.py src/recommender/__init__.py src/db/__init__.py
touch tests/__init__.py
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize project structure with pyproject.toml and config"
```

---

### Task 2: 設定資料庫與 ORM

**Files:**
- Create: `src/db/database.py`
- Create: `src/models/base.py`
- Create: `src/models/bank.py`
- Create: `src/models/card.py`
- Create: `src/models/promotion.py`
- Test: `tests/test_models.py`

**Step 1: 建立 src/db/database.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from src.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

**Step 2: 建立 src/models/base.py**

```python
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
```

**Step 3: 建立 src/models/bank.py**

```python
from typing import List, TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base
from src.models.base import TimestampMixin

if TYPE_CHECKING:
    from src.models.card import CreditCard


class Bank(Base, TimestampMixin):
    __tablename__ = "banks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    website: Mapped[str | None] = mapped_column(String(255))
    logo_url: Mapped[str | None] = mapped_column(String(255))

    cards: Mapped[List["CreditCard"]] = relationship(back_populates="bank")

    def __repr__(self) -> str:
        return f"<Bank {self.name}>"
```

**Step 4: 建立 src/models/card.py**

```python
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base
from src.models.base import TimestampMixin

if TYPE_CHECKING:
    from src.models.bank import Bank
    from src.models.promotion import Promotion


class CreditCard(Base, TimestampMixin):
    __tablename__ = "credit_cards"

    id: Mapped[int] = mapped_column(primary_key=True)
    bank_id: Mapped[int] = mapped_column(ForeignKey("banks.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    card_type: Mapped[str | None] = mapped_column(String(50))
    annual_fee: Mapped[int | None] = mapped_column(Integer)
    annual_fee_waiver: Mapped[str | None] = mapped_column(String(255))
    image_url: Mapped[str | None] = mapped_column(String(255))
    apply_url: Mapped[str | None] = mapped_column(String(255))
    min_income: Mapped[int | None] = mapped_column(Integer)
    features: Mapped[dict | None] = mapped_column(JSON)
    base_reward_rate: Mapped[float | None] = mapped_column(Float)

    bank: Mapped["Bank"] = relationship(back_populates="cards")
    promotions: Mapped[List["Promotion"]] = relationship(back_populates="card")

    def __repr__(self) -> str:
        return f"<CreditCard {self.name}>"
```

**Step 5: 建立 src/models/promotion.py**

```python
from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, Float, ForeignKey, Text, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base
from src.models.base import TimestampMixin

if TYPE_CHECKING:
    from src.models.card import CreditCard


class Promotion(Base, TimestampMixin):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(primary_key=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("credit_cards.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(50))
    reward_type: Mapped[str | None] = mapped_column(String(50))
    reward_rate: Mapped[float | None] = mapped_column(Float)
    reward_limit: Mapped[int | None] = mapped_column(Integer)
    min_spend: Mapped[int | None] = mapped_column(Integer)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    terms: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(255))

    card: Mapped["CreditCard"] = relationship(back_populates="promotions")

    def __repr__(self) -> str:
        return f"<Promotion {self.title}>"
```

**Step 6: 更新 src/models/__init__.py**

```python
from src.models.bank import Bank
from src.models.card import CreditCard
from src.models.promotion import Promotion

__all__ = ["Bank", "CreditCard", "Promotion"]
```

**Step 7: 建立測試 tests/test_models.py**

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.db.database import Base
from src.models import Bank, CreditCard, Promotion


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    Base.metadata.drop_all(engine)


def test_create_bank(db_session):
    bank = Bank(name="中國信託", code="ctbc", website="https://www.ctbcbank.com")
    db_session.add(bank)
    db_session.commit()

    assert bank.id is not None
    assert bank.name == "中國信託"
    assert bank.code == "ctbc"


def test_create_credit_card(db_session):
    bank = Bank(name="中國信託", code="ctbc")
    db_session.add(bank)
    db_session.commit()

    card = CreditCard(
        bank_id=bank.id,
        name="LINE Pay 卡",
        card_type="御璽卡",
        annual_fee=0,
        base_reward_rate=1.0,
    )
    db_session.add(card)
    db_session.commit()

    assert card.id is not None
    assert card.bank.name == "中國信託"


def test_create_promotion(db_session):
    bank = Bank(name="中國信託", code="ctbc")
    db_session.add(bank)
    db_session.commit()

    card = CreditCard(bank_id=bank.id, name="LINE Pay 卡")
    db_session.add(card)
    db_session.commit()

    promotion = Promotion(
        card_id=card.id,
        title="網購 3% 回饋",
        category="online_shopping",
        reward_type="cashback",
        reward_rate=3.0,
    )
    db_session.add(promotion)
    db_session.commit()

    assert promotion.id is not None
    assert promotion.card.name == "LINE Pay 卡"
```

**Step 8: 執行測試確認通過**

```bash
pip install -e ".[dev]"
pytest tests/test_models.py -v
```

Expected: 3 tests PASSED

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add database models for Bank, CreditCard, and Promotion"
```

---

## Phase 2: 爬蟲模組

### Task 3: 建立爬蟲基類

**Files:**
- Create: `src/crawlers/base.py`
- Create: `src/crawlers/utils.py`
- Test: `tests/test_crawler_base.py`

**Step 1: 建立 src/crawlers/utils.py**

```python
import random
import time
from typing import Optional
from loguru import logger
import requests
from bs4 import BeautifulSoup

from src.config import get_settings

settings = get_settings()

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
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


def fetch_page(url: str, retries: int = None) -> Optional[BeautifulSoup]:
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
```

**Step 2: 建立 src/crawlers/base.py**

```python
from abc import ABC, abstractmethod
from typing import List, Optional
from loguru import logger
from sqlalchemy.orm import Session

from src.models import Bank, CreditCard, Promotion
from src.crawlers.utils import fetch_page


class BaseCrawler(ABC):
    bank_name: str
    bank_code: str
    base_url: str

    def __init__(self, db_session: Session):
        self.db = db_session
        self._bank: Optional[Bank] = None

    @property
    def bank(self) -> Bank:
        if self._bank is None:
            self._bank = self.db.query(Bank).filter_by(code=self.bank_code).first()
            if self._bank is None:
                self._bank = Bank(
                    name=self.bank_name,
                    code=self.bank_code,
                    website=self.base_url,
                )
                self.db.add(self._bank)
                self.db.commit()
        return self._bank

    @abstractmethod
    def fetch_cards(self) -> List[CreditCard]:
        """爬取所有信用卡資訊"""
        pass

    @abstractmethod
    def fetch_promotions(self) -> List[Promotion]:
        """爬取所有優惠活動"""
        pass

    def run(self) -> dict:
        """執行爬蟲"""
        logger.info(f"Starting crawler for {self.bank_name}")

        cards = self.fetch_cards()
        logger.info(f"Fetched {len(cards)} cards from {self.bank_name}")

        promotions = self.fetch_promotions()
        logger.info(f"Fetched {len(promotions)} promotions from {self.bank_name}")

        return {
            "bank": self.bank_name,
            "cards_count": len(cards),
            "promotions_count": len(promotions),
        }

    def save_card(self, card_data: dict) -> CreditCard:
        """儲存或更新信用卡"""
        card = (
            self.db.query(CreditCard)
            .filter_by(bank_id=self.bank.id, name=card_data["name"])
            .first()
        )

        if card:
            for key, value in card_data.items():
                if key != "name":
                    setattr(card, key, value)
        else:
            card = CreditCard(bank_id=self.bank.id, **card_data)
            self.db.add(card)

        self.db.commit()
        return card

    def save_promotion(self, card: CreditCard, promo_data: dict) -> Promotion:
        """儲存或更新優惠活動"""
        promotion = (
            self.db.query(Promotion)
            .filter_by(card_id=card.id, title=promo_data["title"])
            .first()
        )

        if promotion:
            for key, value in promo_data.items():
                if key != "title":
                    setattr(promotion, key, value)
        else:
            promotion = Promotion(card_id=card.id, **promo_data)
            self.db.add(promotion)

        self.db.commit()
        return promotion
```

**Step 3: 建立測試 tests/test_crawler_base.py**

```python
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.db.database import Base
from src.models import Bank, CreditCard
from src.crawlers.base import BaseCrawler


class MockCrawler(BaseCrawler):
    bank_name = "測試銀行"
    bank_code = "test"
    base_url = "https://test.bank.com"

    def fetch_cards(self):
        return [self.save_card({"name": "測試卡", "annual_fee": 0})]

    def fetch_promotions(self):
        return []


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    Base.metadata.drop_all(engine)


def test_crawler_creates_bank(db_session):
    crawler = MockCrawler(db_session)
    bank = crawler.bank

    assert bank.name == "測試銀行"
    assert bank.code == "test"


def test_crawler_saves_card(db_session):
    crawler = MockCrawler(db_session)
    cards = crawler.fetch_cards()

    assert len(cards) == 1
    assert cards[0].name == "測試卡"
    assert cards[0].bank.code == "test"


def test_crawler_run(db_session):
    crawler = MockCrawler(db_session)
    result = crawler.run()

    assert result["bank"] == "測試銀行"
    assert result["cards_count"] == 1
    assert result["promotions_count"] == 0
```

**Step 4: 執行測試**

```bash
pytest tests/test_crawler_base.py -v
```

Expected: 3 tests PASSED

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add base crawler class with utils"
```

---

### Task 4: 實作第一個銀行爬蟲（中國信託）

**Files:**
- Create: `src/crawlers/banks/ctbc.py`
- Test: `tests/test_crawler_ctbc.py`

**Step 1: 建立 src/crawlers/banks/ctbc.py**

```python
from typing import List
from datetime import datetime
from bs4 import BeautifulSoup
from loguru import logger

from src.models import CreditCard, Promotion
from src.crawlers.base import BaseCrawler
from src.crawlers.utils import fetch_page


class CtbcCrawler(BaseCrawler):
    bank_name = "中國信託"
    bank_code = "ctbc"
    base_url = "https://www.ctbcbank.com"

    cards_url = "https://www.ctbcbank.com/content/dam/minisite/long/card/creditcard/cardlist/index.html"
    promotions_url = "https://www.ctbcbank.com/content/ctbcbank/tw/zh-tw/personal/credit-card/privilege.html"

    def fetch_cards(self) -> List[CreditCard]:
        cards = []
        soup = fetch_page(self.cards_url)

        if not soup:
            logger.error(f"Failed to fetch cards from {self.bank_name}")
            return cards

        # 解析信用卡列表
        # 注意：實際選擇器需要根據網站結構調整
        card_items = soup.select(".card-item, .product-card, [data-card]")

        for item in card_items:
            try:
                card_data = self._parse_card_item(item)
                if card_data:
                    card = self.save_card(card_data)
                    cards.append(card)
            except Exception as e:
                logger.warning(f"Error parsing card: {e}")
                continue

        return cards

    def _parse_card_item(self, item: BeautifulSoup) -> dict | None:
        """解析單張卡片資訊"""
        name_elem = item.select_one(".card-name, .title, h3, h4")
        if not name_elem:
            return None

        name = name_elem.get_text(strip=True)
        if not name:
            return None

        image_elem = item.select_one("img")
        image_url = image_elem.get("src") if image_elem else None

        link_elem = item.select_one("a")
        apply_url = link_elem.get("href") if link_elem else None

        return {
            "name": name,
            "image_url": image_url,
            "apply_url": apply_url,
            "card_type": self._detect_card_type(name),
        }

    def _detect_card_type(self, name: str) -> str | None:
        """根據卡名判斷卡片等級"""
        type_keywords = {
            "無限卡": "無限卡",
            "極緻卡": "極緻卡",
            "御璽卡": "御璽卡",
            "白金卡": "白金卡",
            "鈦金卡": "鈦金卡",
            "晶緻卡": "晶緻卡",
        }
        for keyword, card_type in type_keywords.items():
            if keyword in name:
                return card_type
        return None

    def fetch_promotions(self) -> List[Promotion]:
        promotions = []
        soup = fetch_page(self.promotions_url)

        if not soup:
            logger.error(f"Failed to fetch promotions from {self.bank_name}")
            return promotions

        # 解析優惠列表
        promo_items = soup.select(".promo-item, .privilege-item, .offer-card")

        for item in promo_items:
            try:
                promo_data = self._parse_promotion_item(item)
                if promo_data:
                    # 需要關聯到特定卡片，這裡先取第一張卡
                    card = self.db.query(CreditCard).filter_by(bank_id=self.bank.id).first()
                    if card:
                        promotion = self.save_promotion(card, promo_data)
                        promotions.append(promotion)
            except Exception as e:
                logger.warning(f"Error parsing promotion: {e}")
                continue

        return promotions

    def _parse_promotion_item(self, item: BeautifulSoup) -> dict | None:
        """解析單一優惠資訊"""
        title_elem = item.select_one(".title, h3, h4, .promo-title")
        if not title_elem:
            return None

        title = title_elem.get_text(strip=True)
        if not title:
            return None

        desc_elem = item.select_one(".desc, .description, p")
        description = desc_elem.get_text(strip=True) if desc_elem else None

        link_elem = item.select_one("a")
        source_url = link_elem.get("href") if link_elem else None

        return {
            "title": title,
            "description": description,
            "source_url": source_url,
            "category": self._detect_category(title, description),
        }

    def _detect_category(self, title: str, description: str | None) -> str | None:
        """根據標題和描述判斷優惠類別"""
        text = f"{title} {description or ''}"
        category_keywords = {
            "dining": ["餐飲", "美食", "餐廳", "吃"],
            "online_shopping": ["網購", "線上", "電商", "蝦皮", "momo"],
            "transport": ["交通", "加油", "高鐵", "台鐵", "捷運"],
            "overseas": ["海外", "國外", "出國", "日本", "韓國"],
            "convenience_store": ["超商", "7-11", "全家", "萊爾富"],
            "department_store": ["百貨", "週年慶", "SOGO", "新光"],
        }
        for category, keywords in category_keywords.items():
            if any(kw in text for kw in keywords):
                return category
        return "others"
```

**Step 2: 更新 src/crawlers/banks/__init__.py**

```python
from src.crawlers.banks.ctbc import CtbcCrawler

__all__ = ["CtbcCrawler"]
```

**Step 3: 建立測試 tests/test_crawler_ctbc.py**

```python
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from bs4 import BeautifulSoup

from src.db.database import Base
from src.crawlers.banks.ctbc import CtbcCrawler


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    Base.metadata.drop_all(engine)


def test_detect_card_type():
    crawler = CtbcCrawler.__new__(CtbcCrawler)

    assert crawler._detect_card_type("LINE Pay 御璽卡") == "御璽卡"
    assert crawler._detect_card_type("現金回饋白金卡") == "白金卡"
    assert crawler._detect_card_type("商旅無限卡") == "無限卡"
    assert crawler._detect_card_type("普通卡") is None


def test_detect_category():
    crawler = CtbcCrawler.__new__(CtbcCrawler)

    assert crawler._detect_category("餐飲優惠", None) == "dining"
    assert crawler._detect_category("網購回饋", "蝦皮滿額折") == "online_shopping"
    assert crawler._detect_category("加油優惠", None) == "transport"
    assert crawler._detect_category("一般優惠", None) == "others"


def test_parse_card_item():
    crawler = CtbcCrawler.__new__(CtbcCrawler)
    html = """
    <div class="card-item">
        <h3 class="card-name">LINE Pay 御璽卡</h3>
        <img src="https://example.com/card.jpg">
        <a href="https://example.com/apply">申請</a>
    </div>
    """
    soup = BeautifulSoup(html, "lxml")
    item = soup.select_one(".card-item")

    result = crawler._parse_card_item(item)

    assert result["name"] == "LINE Pay 御璽卡"
    assert result["card_type"] == "御璽卡"
    assert result["image_url"] == "https://example.com/card.jpg"


def test_crawler_creates_bank(db_session):
    crawler = CtbcCrawler(db_session)
    bank = crawler.bank

    assert bank.name == "中國信託"
    assert bank.code == "ctbc"
```

**Step 4: 執行測試**

```bash
pytest tests/test_crawler_ctbc.py -v
```

Expected: 4 tests PASSED

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add CTBC bank crawler implementation"
```

---

## Phase 3: API 模組

### Task 5: 建立 FastAPI 應用程式

**Files:**
- Create: `src/main.py`
- Create: `src/api/router.py`
- Create: `src/api/schemas.py`
- Create: `src/api/cards.py`
- Test: `tests/test_api.py`

**Step 1: 建立 src/api/schemas.py**

```python
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel


class BankBase(BaseModel):
    name: str
    code: str
    website: Optional[str] = None
    logo_url: Optional[str] = None


class BankResponse(BankBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CreditCardBase(BaseModel):
    name: str
    card_type: Optional[str] = None
    annual_fee: Optional[int] = None
    annual_fee_waiver: Optional[str] = None
    image_url: Optional[str] = None
    apply_url: Optional[str] = None
    min_income: Optional[int] = None
    features: Optional[dict] = None
    base_reward_rate: Optional[float] = None


class CreditCardResponse(CreditCardBase):
    id: int
    bank_id: int
    bank: BankResponse
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreditCardListResponse(CreditCardBase):
    id: int
    bank_id: int
    bank_name: str

    class Config:
        from_attributes = True


class PromotionBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    reward_type: Optional[str] = None
    reward_rate: Optional[float] = None
    reward_limit: Optional[int] = None
    min_spend: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    terms: Optional[str] = None
    source_url: Optional[str] = None


class PromotionResponse(PromotionBase):
    id: int
    card_id: int

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    size: int
    pages: int
```

**Step 2: 建立 src/api/cards.py**

```python
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.database import get_db
from src.models import Bank, CreditCard, Promotion
from src.api.schemas import (
    BankResponse,
    CreditCardResponse,
    CreditCardListResponse,
    PromotionResponse,
    PaginatedResponse,
)

router = APIRouter(prefix="/api", tags=["cards"])


@router.get("/banks", response_model=list[BankResponse])
async def list_banks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bank))
    banks = result.scalars().all()
    return banks


@router.get("/banks/{bank_id}", response_model=BankResponse)
async def get_bank(bank_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bank).where(Bank.id == bank_id))
    bank = result.scalar_one_or_none()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")
    return bank


@router.get("/cards")
async def list_cards(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    bank_id: Optional[int] = None,
    card_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(CreditCard).options(selectinload(CreditCard.bank))

    if bank_id:
        query = query.where(CreditCard.bank_id == bank_id)
    if card_type:
        query = query.where(CreditCard.card_type == card_type)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    cards = result.scalars().all()

    items = [
        CreditCardListResponse(
            id=card.id,
            bank_id=card.bank_id,
            bank_name=card.bank.name,
            name=card.name,
            card_type=card.card_type,
            annual_fee=card.annual_fee,
            annual_fee_waiver=card.annual_fee_waiver,
            image_url=card.image_url,
            apply_url=card.apply_url,
            min_income=card.min_income,
            features=card.features,
            base_reward_rate=card.base_reward_rate,
        )
        for card in cards
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/cards/{card_id}", response_model=CreditCardResponse)
async def get_card(card_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CreditCard)
        .options(selectinload(CreditCard.bank))
        .where(CreditCard.id == card_id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.get("/cards/{card_id}/promotions", response_model=list[PromotionResponse])
async def get_card_promotions(card_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Promotion).where(Promotion.card_id == card_id)
    )
    promotions = result.scalars().all()
    return promotions
```

**Step 3: 建立 src/api/router.py**

```python
from fastapi import APIRouter

from src.api.cards import router as cards_router

api_router = APIRouter()
api_router.include_router(cards_router)
```

**Step 4: 建立 src/main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger

from src.config import get_settings
from src.db.database import init_db
from src.api.router import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    await init_db()
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Credit Card Crawler API",
    description="台灣信用卡資訊查詢與推薦 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

**Step 5: 建立測試 tests/test_api.py**

```python
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.main import app
from src.db.database import Base, get_db
from src.models import Bank, CreditCard


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        # Add test data
        bank = Bank(name="測試銀行", code="test")
        session.add(bank)
        session.commit()

        card = CreditCard(
            bank_id=bank.id,
            name="測試卡",
            card_type="御璽卡",
            annual_fee=0,
        )
        session.add(card)
        session.commit()

        yield session
    Base.metadata.drop_all(engine)


@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
```

**Step 6: 執行測試**

```bash
pytest tests/test_api.py -v
```

Expected: 1 test PASSED

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add FastAPI application with cards API endpoints"
```

---

## Phase 4: 推薦引擎

### Task 6: 實作推薦引擎

**Files:**
- Create: `src/recommender/engine.py`
- Create: `src/recommender/scoring.py`
- Create: `src/api/recommend.py`
- Test: `tests/test_recommender.py`

**Step 1: 建立 src/recommender/scoring.py**

```python
from dataclasses import dataclass
from typing import Dict, List

from src.models import CreditCard, Promotion


@dataclass
class ScoringWeights:
    reward: float = 0.5
    feature: float = 0.3
    promotion: float = 0.2


def calculate_reward_score(
    card: CreditCard,
    spending_habits: Dict[str, float],
    monthly_amount: int,
    promotions: List[Promotion],
) -> float:
    """計算回饋分數"""
    total_reward = 0.0

    base_rate = card.base_reward_rate or 0.0

    for category, ratio in spending_habits.items():
        category_spend = monthly_amount * ratio

        # 找該類別最佳優惠
        best_rate = base_rate
        for promo in promotions:
            if promo.category == category and promo.reward_rate:
                if promo.reward_rate > best_rate:
                    best_rate = promo.reward_rate

        category_reward = category_spend * (best_rate / 100)
        total_reward += category_reward

    # 正規化到 0-100
    max_possible = monthly_amount * 0.05  # 假設最高 5% 回饋
    score = min((total_reward / max_possible) * 100, 100) if max_possible > 0 else 0

    return round(score, 2)


def calculate_feature_score(
    card: CreditCard,
    preferences: List[str],
) -> float:
    """計算權益分數"""
    if not preferences:
        return 50.0

    features = card.features or {}
    matched = 0

    preference_mapping = {
        "no_annual_fee": lambda c: c.annual_fee == 0 or c.annual_fee is None,
        "airport_pickup": lambda c: features.get("airport_pickup", False),
        "lounge_access": lambda c: features.get("lounge_access", False),
        "cashback": lambda c: features.get("reward_type") == "cashback",
        "miles": lambda c: features.get("reward_type") == "miles",
    }

    for pref in preferences:
        if pref in preference_mapping:
            if preference_mapping[pref](card):
                matched += 1

    score = (matched / len(preferences)) * 100
    return round(score, 2)


def calculate_promotion_score(promotions: List[Promotion]) -> float:
    """計算優惠分數"""
    if not promotions:
        return 0.0

    # 根據優惠數量和品質計算分數
    score = min(len(promotions) * 10, 100)
    return round(score, 2)


def calculate_total_score(
    card: CreditCard,
    spending_habits: Dict[str, float],
    monthly_amount: int,
    preferences: List[str],
    promotions: List[Promotion],
    weights: ScoringWeights = None,
) -> Dict:
    """計算總分"""
    if weights is None:
        weights = ScoringWeights()

    reward_score = calculate_reward_score(card, spending_habits, monthly_amount, promotions)
    feature_score = calculate_feature_score(card, preferences)
    promotion_score = calculate_promotion_score(promotions)

    total = (
        reward_score * weights.reward
        + feature_score * weights.feature
        + promotion_score * weights.promotion
    )

    return {
        "total": round(total, 2),
        "reward_score": reward_score,
        "feature_score": feature_score,
        "promotion_score": promotion_score,
    }
```

**Step 2: 建立 src/recommender/engine.py**

```python
from typing import Dict, List, Optional
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import select

from src.models import CreditCard, Promotion
from src.recommender.scoring import calculate_total_score, ScoringWeights


@dataclass
class RecommendRequest:
    spending_habits: Dict[str, float]
    monthly_amount: int
    preferences: List[str]
    limit: int = 5


@dataclass
class CardRecommendation:
    card: CreditCard
    score: float
    reward_score: float
    feature_score: float
    promotion_score: float
    estimated_monthly_reward: float
    reasons: List[str]


class RecommendationEngine:
    def __init__(self, db_session: Session):
        self.db = db_session

    def recommend(self, request: RecommendRequest) -> List[CardRecommendation]:
        # 取得所有信用卡
        cards = self.db.query(CreditCard).all()

        # 篩選
        filtered_cards = self._filter_cards(cards, request)

        # 評分
        scored_cards = []
        for card in filtered_cards:
            promotions = (
                self.db.query(Promotion).filter_by(card_id=card.id).all()
            )

            scores = calculate_total_score(
                card=card,
                spending_habits=request.spending_habits,
                monthly_amount=request.monthly_amount,
                preferences=request.preferences,
                promotions=promotions,
            )

            estimated_reward = self._estimate_monthly_reward(
                card, request.spending_habits, request.monthly_amount, promotions
            )

            reasons = self._generate_reasons(card, request, scores, promotions)

            scored_cards.append(
                CardRecommendation(
                    card=card,
                    score=scores["total"],
                    reward_score=scores["reward_score"],
                    feature_score=scores["feature_score"],
                    promotion_score=scores["promotion_score"],
                    estimated_monthly_reward=estimated_reward,
                    reasons=reasons,
                )
            )

        # 排序並返回 Top N
        scored_cards.sort(key=lambda x: x.score, reverse=True)
        return scored_cards[: request.limit]

    def _filter_cards(
        self, cards: List[CreditCard], request: RecommendRequest
    ) -> List[CreditCard]:
        """篩選符合條件的信用卡"""
        filtered = []

        for card in cards:
            # 如果要求免年費，過濾掉有年費的卡
            if "no_annual_fee" in request.preferences:
                if card.annual_fee and card.annual_fee > 0:
                    continue
            filtered.append(card)

        return filtered

    def _estimate_monthly_reward(
        self,
        card: CreditCard,
        spending_habits: Dict[str, float],
        monthly_amount: int,
        promotions: List[Promotion],
    ) -> float:
        """估算每月回饋金額"""
        total_reward = 0.0
        base_rate = card.base_reward_rate or 0.0

        for category, ratio in spending_habits.items():
            category_spend = monthly_amount * ratio

            best_rate = base_rate
            for promo in promotions:
                if promo.category == category and promo.reward_rate:
                    if promo.reward_rate > best_rate:
                        best_rate = promo.reward_rate

            total_reward += category_spend * (best_rate / 100)

        return round(total_reward, 0)

    def _generate_reasons(
        self,
        card: CreditCard,
        request: RecommendRequest,
        scores: Dict,
        promotions: List[Promotion],
    ) -> List[str]:
        """產生推薦理由"""
        reasons = []

        # 回饋相關
        if scores["reward_score"] > 70:
            top_category = max(request.spending_habits, key=request.spending_habits.get)
            category_names = {
                "dining": "餐飲",
                "online_shopping": "網購",
                "transport": "交通",
                "overseas": "海外",
            }
            cat_name = category_names.get(top_category, top_category)
            reasons.append(f"{cat_name}回饋符合您的消費習慣")

        # 年費相關
        if card.annual_fee == 0 or card.annual_fee is None:
            reasons.append("免年費")

        # 優惠相關
        if promotions:
            reasons.append(f"目前有 {len(promotions)} 個優惠活動")

        return reasons[:3]  # 最多 3 個理由
```

**Step 3: 建立 src/api/recommend.py**

```python
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db

router = APIRouter(prefix="/api", tags=["recommend"])


class RecommendRequestSchema(BaseModel):
    spending_habits: Dict[str, float]
    monthly_amount: int
    preferences: List[str] = []
    limit: int = 5


class CardRecommendationSchema(BaseModel):
    rank: int
    card_id: int
    card_name: str
    bank_name: str
    score: float
    estimated_monthly_reward: float
    reasons: List[str]


class RecommendResponseSchema(BaseModel):
    recommendations: List[CardRecommendationSchema]


@router.post("/recommend", response_model=RecommendResponseSchema)
async def get_recommendations(
    request: RecommendRequestSchema,
    db: AsyncSession = Depends(get_db),
):
    # 這裡需要改為 async 版本的 engine
    # 暫時回傳空結果，Task 7 會完善
    return RecommendResponseSchema(recommendations=[])
```

**Step 4: 更新 src/api/router.py**

```python
from fastapi import APIRouter

from src.api.cards import router as cards_router
from src.api.recommend import router as recommend_router

api_router = APIRouter()
api_router.include_router(cards_router)
api_router.include_router(recommend_router)
```

**Step 5: 建立測試 tests/test_recommender.py**

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.db.database import Base
from src.models import Bank, CreditCard, Promotion
from src.recommender.engine import RecommendationEngine, RecommendRequest
from src.recommender.scoring import (
    calculate_reward_score,
    calculate_feature_score,
    calculate_promotion_score,
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        # Add test data
        bank = Bank(name="測試銀行", code="test")
        session.add(bank)
        session.commit()

        card1 = CreditCard(
            bank_id=bank.id,
            name="高回饋卡",
            annual_fee=0,
            base_reward_rate=2.0,
        )
        card2 = CreditCard(
            bank_id=bank.id,
            name="年費卡",
            annual_fee=2000,
            base_reward_rate=3.0,
        )
        session.add_all([card1, card2])
        session.commit()

        promo = Promotion(
            card_id=card1.id,
            title="網購優惠",
            category="online_shopping",
            reward_rate=5.0,
        )
        session.add(promo)
        session.commit()

        yield session
    Base.metadata.drop_all(engine)


def test_calculate_feature_score_no_annual_fee():
    card = CreditCard(name="測試", annual_fee=0)
    score = calculate_feature_score(card, ["no_annual_fee"])
    assert score == 100.0


def test_calculate_feature_score_with_annual_fee():
    card = CreditCard(name="測試", annual_fee=2000)
    score = calculate_feature_score(card, ["no_annual_fee"])
    assert score == 0.0


def test_calculate_promotion_score():
    promos = [Promotion(title="優惠1"), Promotion(title="優惠2")]
    score = calculate_promotion_score(promos)
    assert score == 20.0


def test_recommendation_engine(db_session):
    engine = RecommendationEngine(db_session)

    request = RecommendRequest(
        spending_habits={"online_shopping": 0.5, "dining": 0.3, "others": 0.2},
        monthly_amount=30000,
        preferences=["no_annual_fee"],
        limit=5,
    )

    recommendations = engine.recommend(request)

    assert len(recommendations) == 1  # 年費卡被過濾掉
    assert recommendations[0].card.name == "高回饋卡"
```

**Step 6: 執行測試**

```bash
pytest tests/test_recommender.py -v
```

Expected: 4 tests PASSED

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add recommendation engine with scoring system"
```

---

## Phase 5: 排程任務

### Task 7: 建立排程系統

**Files:**
- Create: `src/scheduler/jobs.py`
- Create: `src/scheduler/runner.py`
- Modify: `src/main.py`

**Step 1: 建立 src/scheduler/__init__.py**

```python
"""Scheduler module for periodic crawling tasks."""
```

**Step 2: 建立 src/scheduler/jobs.py**

```python
from datetime import datetime
from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.config import get_settings
from src.crawlers.banks import CtbcCrawler

settings = get_settings()

# 同步版本的資料庫連線（給排程使用）
sync_database_url = settings.database_url.replace("+aiosqlite", "")


def get_sync_session() -> Session:
    engine = create_engine(sync_database_url)
    return Session(engine)


def run_daily_promotion_crawl():
    """每日優惠爬取任務"""
    logger.info(f"Starting daily promotion crawl at {datetime.now()}")

    with get_sync_session() as session:
        crawlers = [
            CtbcCrawler(session),
            # 之後加入更多銀行爬蟲
        ]

        for crawler in crawlers:
            try:
                result = crawler.run()
                logger.info(f"Completed: {result}")
            except Exception as e:
                logger.error(f"Error crawling {crawler.bank_name}: {e}")

    logger.info("Daily promotion crawl completed")


def run_weekly_card_crawl():
    """每週信用卡資訊爬取任務"""
    logger.info(f"Starting weekly card crawl at {datetime.now()}")

    with get_sync_session() as session:
        crawlers = [
            CtbcCrawler(session),
        ]

        for crawler in crawlers:
            try:
                cards = crawler.fetch_cards()
                logger.info(f"Fetched {len(cards)} cards from {crawler.bank_name}")
            except Exception as e:
                logger.error(f"Error crawling {crawler.bank_name}: {e}")

    logger.info("Weekly card crawl completed")


def cleanup_expired_promotions():
    """清理過期優惠"""
    from src.models import Promotion

    logger.info("Cleaning up expired promotions")

    with get_sync_session() as session:
        today = datetime.now().date()
        expired = (
            session.query(Promotion)
            .filter(Promotion.end_date < today)
            .all()
        )

        for promo in expired:
            session.delete(promo)

        session.commit()
        logger.info(f"Deleted {len(expired)} expired promotions")
```

**Step 3: 建立 src/scheduler/runner.py**

```python
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger

from src.scheduler.jobs import (
    run_daily_promotion_crawl,
    run_weekly_card_crawl,
    cleanup_expired_promotions,
)


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()

    # 每日凌晨 2:00 執行優惠爬取
    scheduler.add_job(
        run_daily_promotion_crawl,
        CronTrigger(hour=2, minute=0),
        id="daily_promotion_crawl",
        name="Daily Promotion Crawl",
    )

    # 每週日凌晨 3:00 執行信用卡資訊爬取
    scheduler.add_job(
        run_weekly_card_crawl,
        CronTrigger(day_of_week="sun", hour=3, minute=0),
        id="weekly_card_crawl",
        name="Weekly Card Crawl",
    )

    # 每日凌晨 4:00 清理過期優惠
    scheduler.add_job(
        cleanup_expired_promotions,
        CronTrigger(hour=4, minute=0),
        id="cleanup_expired",
        name="Cleanup Expired Promotions",
    )

    logger.info("Scheduler configured with jobs")
    return scheduler


def start_scheduler():
    scheduler = create_scheduler()
    scheduler.start()
    logger.info("Scheduler started")
    return scheduler
```

**Step 4: 更新 src/main.py 加入排程**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger

from src.config import get_settings
from src.db.database import init_db
from src.api.router import api_router
from src.scheduler.runner import start_scheduler

settings = get_settings()
scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global scheduler
    logger.info("Starting up...")
    await init_db()

    # 啟動排程器
    scheduler = start_scheduler()

    yield

    # 關閉排程器
    if scheduler:
        scheduler.shutdown()
    logger.info("Shutting down...")


app = FastAPI(
    title="Credit Card Crawler API",
    description="台灣信用卡資訊查詢與推薦 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/admin/status")
async def admin_status():
    jobs = []
    if scheduler:
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": str(job.next_run_time) if job.next_run_time else None,
            })

    return {
        "scheduler_running": scheduler is not None and scheduler.running,
        "jobs": jobs,
    }
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add scheduler for periodic crawling tasks"
```

---

## Phase 6: 整合與完善

### Task 8: 建立 CLI 入口

**Files:**
- Create: `src/cli.py`
- Modify: `pyproject.toml`

**Step 1: 建立 src/cli.py**

```python
import argparse
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from loguru import logger

from src.config import get_settings
from src.db.database import Base
from src.crawlers.banks import CtbcCrawler

settings = get_settings()
sync_database_url = settings.database_url.replace("+aiosqlite", "")


def init_database():
    """初始化資料庫"""
    engine = create_engine(sync_database_url)
    Base.metadata.create_all(engine)
    logger.info("Database initialized")


def run_crawler(bank: str = None):
    """執行爬蟲"""
    engine = create_engine(sync_database_url)

    crawlers = {
        "ctbc": CtbcCrawler,
    }

    with Session(engine) as session:
        if bank:
            if bank not in crawlers:
                logger.error(f"Unknown bank: {bank}. Available: {list(crawlers.keys())}")
                return
            crawler = crawlers[bank](session)
            result = crawler.run()
            logger.info(f"Result: {result}")
        else:
            for name, crawler_cls in crawlers.items():
                logger.info(f"Running crawler for {name}")
                crawler = crawler_cls(session)
                result = crawler.run()
                logger.info(f"Result: {result}")


def main():
    parser = argparse.ArgumentParser(description="Credit Card Crawler CLI")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # init command
    subparsers.add_parser("init", help="Initialize database")

    # crawl command
    crawl_parser = subparsers.add_parser("crawl", help="Run crawler")
    crawl_parser.add_argument("--bank", "-b", help="Bank code (e.g., ctbc)")

    # serve command
    subparsers.add_parser("serve", help="Start API server")

    args = parser.parse_args()

    if args.command == "init":
        init_database()
    elif args.command == "crawl":
        run_crawler(args.bank)
    elif args.command == "serve":
        import uvicorn
        uvicorn.run(
            "src.main:app",
            host=settings.api_host,
            port=settings.api_port,
            reload=settings.debug,
        )
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
```

**Step 2: 更新 pyproject.toml 加入 CLI 入口**

在 `[project]` 區塊後加入：

```toml
[project.scripts]
credit-card-crawler = "src.cli:main"
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add CLI for database init, crawling, and serving"
```

---

### Task 9: 加入種子資料

**Files:**
- Create: `src/db/seed.py`

**Step 1: 建立 src/db/seed.py**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from loguru import logger

from src.config import get_settings
from src.db.database import Base
from src.models import Bank

settings = get_settings()
sync_database_url = settings.database_url.replace("+aiosqlite", "")

BANKS = [
    {"name": "中國信託", "code": "ctbc", "website": "https://www.ctbcbank.com"},
    {"name": "國泰世華", "code": "cathay", "website": "https://www.cathaybk.com.tw"},
    {"name": "玉山銀行", "code": "esun", "website": "https://www.esunbank.com.tw"},
    {"name": "台新銀行", "code": "taishin", "website": "https://www.taishinbank.com.tw"},
    {"name": "富邦銀行", "code": "fubon", "website": "https://www.fubon.com"},
    {"name": "永豐銀行", "code": "sinopac", "website": "https://www.sinopac.com"},
    {"name": "聯邦銀行", "code": "ubot", "website": "https://www.ubot.com.tw"},
    {"name": "第一銀行", "code": "firstbank", "website": "https://www.firstbank.com.tw"},
    {"name": "華南銀行", "code": "hncb", "website": "https://www.hncb.com.tw"},
    {"name": "兆豐銀行", "code": "megabank", "website": "https://www.megabank.com.tw"},
]


def seed_banks():
    """建立銀行種子資料"""
    engine = create_engine(sync_database_url)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        for bank_data in BANKS:
            existing = session.query(Bank).filter_by(code=bank_data["code"]).first()
            if not existing:
                bank = Bank(**bank_data)
                session.add(bank)
                logger.info(f"Added bank: {bank_data['name']}")
            else:
                logger.info(f"Bank already exists: {bank_data['name']}")

        session.commit()

    logger.info("Seed completed")


if __name__ == "__main__":
    seed_banks()
```

**Step 2: 更新 src/cli.py 加入 seed 命令**

在 subparsers 區塊加入：

```python
# seed command
subparsers.add_parser("seed", help="Seed initial bank data")
```

在 args.command 判斷加入：

```python
elif args.command == "seed":
    from src.db.seed import seed_banks
    seed_banks()
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add seed data for banks"
```

---

### Task 10: 完善文件與最終測試

**Step 1: 更新 README.md**

更新為更完整的使用說明。

**Step 2: 執行完整測試**

```bash
pytest tests/ -v
```

Expected: All tests PASSED

**Step 3: 測試 CLI 功能**

```bash
# 安裝專案
pip install -e ".[dev]"

# 初始化資料庫
credit-card-crawler init

# 建立種子資料
credit-card-crawler seed

# 啟動服務
credit-card-crawler serve
```

**Step 4: 最終 Commit**

```bash
git add -A
git commit -m "docs: update README and finalize project setup"
```

---

## 下一步擴展

完成上述任務後，可以繼續：

1. **加入更多銀行爬蟲** - 參考 CtbcCrawler 實作其他銀行
2. **優化推薦算法** - 加入機器學習模型
3. **建立前端介面** - 使用 React/Vue 建立 Web UI
4. **加入通知功能** - 優惠到期提醒、新優惠通知
5. **部署** - Docker 容器化、雲端部署
