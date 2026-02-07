import pytest
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


def test_parse_card_level():
    crawler = CtbcCrawler.__new__(CtbcCrawler)

    assert crawler._parse_card_level(["御璽/鈦金/晶緻卡"]) == "御璽卡"
    assert crawler._parse_card_level(["白金卡"]) == "白金卡"
    assert crawler._parse_card_level(["無限/世界/極致卡"]) == "無限卡"
    assert crawler._parse_card_level(["其他"]) == "白金卡"


def test_detect_category():
    from src.crawlers.utils import detect_promotion_category

    assert detect_promotion_category("餐飲優惠") == "dining"
    assert detect_promotion_category("網購回饋 蝦皮滿額折") == "online_shopping"
    assert detect_promotion_category("加油優惠") == "transport"
    assert detect_promotion_category("一般優惠") == "others"


def test_parse_card_json():
    crawler = CtbcCrawler.__new__(CtbcCrawler)
    crawler.base_url = "https://www.ctbcbank.com"

    card_json = {
        "cardName": "LINE Pay 御璽卡",
        "cardLevel": ["御璽/鈦金/晶緻卡"],
        "cardType": ["聯名卡"],
        "rewardType": ["LINE POINTS"],
        "extraFunction": [],
        "cardFeature": ["最高 3% 回饋"],
        "annualFee": "免年費",
        "cardImg": ["/content/dam/card.jpg"],
        "introLink": "/personal/credit-card/linepay",
    }

    result = crawler._parse_card_json(card_json)

    assert result["name"] == "LINE Pay 御璽卡"
    assert result["card_type"] == "御璽卡"
    assert result["image_url"] == "https://www.ctbcbank.com/content/dam/card.jpg"


def test_crawler_creates_bank(db_session):
    crawler = CtbcCrawler(db_session)
    bank = crawler.bank

    assert bank.name == "中國信託"
    assert bank.code == "ctbc"
