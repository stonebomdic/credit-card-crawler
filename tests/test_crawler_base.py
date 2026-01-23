import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.crawlers.base import BaseCrawler
from src.db.database import Base


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
