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
