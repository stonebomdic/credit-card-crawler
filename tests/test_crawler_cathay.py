import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.crawlers.banks.cathay import CathayCrawler
from src.db.database import Base


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    Base.metadata.drop_all(engine)


def test_crawler_creates_bank(db_session):
    crawler = CathayCrawler(db_session)
    bank = crawler.bank
    assert bank.name == "國泰世華"
    assert bank.code == "cathay"


def test_detect_card_type():
    crawler = CathayCrawler.__new__(CathayCrawler)
    assert crawler._detect_card_type("CUBE 卡", "") == "白金卡"
    assert crawler._detect_card_type("世界卡", "") == "世界卡"
    assert crawler._detect_card_type("御璽卡", "") == "御璽卡"


def test_extract_annual_fee():
    crawler = CathayCrawler.__new__(CathayCrawler)
    assert crawler._extract_annual_fee("年費：NT$2,000元") == 2000
    assert crawler._extract_annual_fee("免年費") == 0


def test_extract_reward_rate():
    crawler = CathayCrawler.__new__(CathayCrawler)
    assert crawler._extract_reward_rate("最高 3.5% 回饋") == 3.5
    assert crawler._extract_reward_rate("一般消費 1.2% 現金回饋") == 1.2


def test_detect_category():
    from src.crawlers.utils import detect_promotion_category

    assert detect_promotion_category("餐飲優惠 8 折") == "dining"
    assert detect_promotion_category("網購滿千折百") == "online_shopping"
    assert detect_promotion_category("一般消費") == "others"
