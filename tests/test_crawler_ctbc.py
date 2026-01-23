import pytest
from bs4 import BeautifulSoup
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.crawlers.banks.ctbc import CtbcCrawler
from src.db.database import Base


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
