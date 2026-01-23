import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.db.database import Base
from src.models import Bank, CreditCard, Promotion
from src.recommender.engine import RecommendationEngine, RecommendRequest
from src.recommender.scoring import (
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
