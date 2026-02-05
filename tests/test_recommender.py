import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.db.database import Base
from src.models import Bank, CreditCard, Promotion
from src.recommender.engine import RecommendationEngine, RecommendRequest
from src.recommender.scoring import (
    calculate_annual_fee_roi,
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


def test_annual_fee_roi_free_card():
    """Free cards should get a score of 80."""
    card = CreditCard(name="Free Card", annual_fee=0, base_reward_rate=1.0)
    score = calculate_annual_fee_roi(
        card=card,
        monthly_amount=30000,
        spending_habits={"dining": 0.5, "others": 0.5},
        promotions=[],
    )
    assert score == 80.0


def test_annual_fee_roi_none_fee_card():
    """Cards with annual_fee=None should also get 80."""
    card = CreditCard(name="No Fee Info", annual_fee=None, base_reward_rate=1.0)
    score = calculate_annual_fee_roi(
        card=card,
        monthly_amount=30000,
        spending_habits={"dining": 0.5, "others": 0.5},
        promotions=[],
    )
    assert score == 80.0


def test_annual_fee_roi_high_reward_covers_fee():
    """Card with 3% base rate, 2000 annual fee, spending 50000/month."""
    card = CreditCard(name="Premium Card", annual_fee=2000, base_reward_rate=3.0)
    score = calculate_annual_fee_roi(
        card=card,
        monthly_amount=50000,
        spending_habits={"dining": 1.0},
        promotions=[],
    )
    # ROI = (1500*12 - 2000) / (50000*12) * 100 = 16000/600000 * 100 = 2.667
    # score = min(2.667 / 0.05 * 100, 100) = min(53.33, 100) = 53.33
    assert score == 53.33


def test_annual_fee_roi_fee_exceeds_reward():
    """Card where annual fee exceeds annual reward should score 0."""
    card = CreditCard(name="Expensive Card", annual_fee=5000, base_reward_rate=0.5)
    score = calculate_annual_fee_roi(
        card=card,
        monthly_amount=10000,
        spending_habits={"others": 1.0},
        promotions=[],
    )
    # Monthly reward = 10000 * 0.5% = 50, annual = 600
    # ROI = (600 - 5000) / 120000 * 100 = -3.67
    # Negative => score = 0
    assert score == 0.0


def test_annual_fee_roi_with_promotion():
    """Promotions should boost the estimated reward used in ROI calculation."""
    card = CreditCard(name="Promo Card", annual_fee=1000, base_reward_rate=1.0)
    promo = Promotion(title="Dining Promo", category="dining", reward_rate=5.0)
    score = calculate_annual_fee_roi(
        card=card,
        monthly_amount=20000,
        spending_habits={"dining": 0.5, "others": 0.5},
        promotions=[promo],
    )
    # dining: 10000 * 5% = 500, others: 10000 * 1% = 100 => monthly = 600
    # ROI = (600*12 - 1000) / (20000*12) * 100 = 6200/240000 * 100 = 2.583
    # score = min(2.583 / 0.05 * 100, 100) = min(51.67, 100) = 51.67
    assert score == 51.67


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
