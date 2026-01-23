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
