from src.crawlers.utils import (
    detect_promotion_category,
    detect_reward_type,
    extract_common_features,
    extract_min_spend,
    extract_reward_limit,
)

# ── detect_promotion_category 新類別測試 ──


def test_detect_category_streaming_chinese():
    assert detect_promotion_category("串流平台最高 10% 回饋") == "streaming"


def test_detect_category_streaming_netflix():
    assert detect_promotion_category("Netflix 訂閱享 5% 回饋") == "streaming"


def test_detect_category_streaming_spotify():
    assert detect_promotion_category("Spotify 消費回饋加碼") == "streaming"


def test_detect_category_new_cardholder():
    assert detect_promotion_category("新戶首刷禮最高 500 元") == "new_cardholder"


def test_detect_category_first_swipe():
    assert detect_promotion_category("首刷滿 3000 送行李箱") == "new_cardholder"


def test_detect_category_installment():
    assert detect_promotion_category("12 期零利率優惠") == "installment"


def test_detect_category_installment_zero():
    assert detect_promotion_category("分期 0利率 消費滿額") == "installment"


def test_detect_category_existing_dining():
    """既有的餐飲類別仍正常運作"""
    assert detect_promotion_category("餐飲消費最高 5% 回饋") == "dining"


def test_detect_category_others():
    """無法分類的歸入 others"""
    assert detect_promotion_category("一般消費回饋") == "others"


# ── detect_reward_type 測試 ──


def test_detect_reward_type_cashback():
    assert detect_reward_type("現金回饋 3%") == "cashback"


def test_detect_reward_type_cashback_credit():
    assert detect_reward_type("刷卡金回饋 500 元") == "cashback"


def test_detect_reward_type_miles():
    assert detect_reward_type("每消費 30 元累積 1 哩程") == "miles"


def test_detect_reward_type_miles_airline():
    assert detect_reward_type("航空里程累積加碼") == "miles"


def test_detect_reward_type_points_default():
    assert detect_reward_type("紅利點數 10 倍送") == "points"


def test_detect_reward_type_empty():
    assert detect_reward_type("") == "points"


# ── extract_reward_limit 測試 ──


def test_extract_reward_limit_basic():
    assert extract_reward_limit("每月回饋上限 500 元") == 500


def test_extract_reward_limit_nt():
    assert extract_reward_limit("上限 NT$1,000 元") == 1000


def test_extract_reward_limit_max():
    assert extract_reward_limit("最高回饋 2,000 元") == 2000


def test_extract_reward_limit_none():
    assert extract_reward_limit("無上限回饋") is None


def test_extract_reward_limit_empty():
    assert extract_reward_limit("") is None


# ── extract_min_spend 測試 ──


def test_extract_min_spend_basic():
    assert extract_min_spend("消費滿 3,000 元享回饋") == 3000


def test_extract_min_spend_nt():
    assert extract_min_spend("單筆滿 NT$5000 即享優惠") == 5000


def test_extract_min_spend_swipe():
    assert extract_min_spend("刷卡滿 10,000 元以上") == 10000


def test_extract_min_spend_none():
    assert extract_min_spend("所有消費皆享回饋") is None


def test_extract_min_spend_empty():
    assert extract_min_spend("") is None


# ── extract_common_features 整合測試 ──


def test_extract_common_features_cashback():
    text = "現金回饋最高 5%，行動支付加碼"
    features = extract_common_features(text)
    assert features["reward_type"] == "cashback"
    assert features.get("mobile_pay") is True


def test_extract_common_features_miles():
    text = "每消費 30 元累積 1 哩程，機場接送、貴賓室"
    features = extract_common_features(text)
    assert features["reward_type"] == "miles"
    assert features.get("mileage") is True
    assert features.get("airport_transfer") is True
    assert features.get("lounge_access") is True


def test_extract_common_features_streaming():
    text = "Netflix、Spotify 消費享 10% 回饋"
    features = extract_common_features(text)
    assert features.get("streaming") is True


def test_extract_common_features_new_cardholder():
    text = "新戶首刷禮最高 500 元刷卡金"
    features = extract_common_features(text)
    assert features.get("new_cardholder_bonus") is True
    assert features["reward_type"] == "cashback"


def test_extract_common_features_installment():
    text = "分期零利率，網購消費回饋加碼"
    features = extract_common_features(text)
    assert features.get("installment") is True
    assert features.get("online_shopping") is True


def test_extract_common_features_lounge_access_key():
    """確認使用 lounge_access 而非 lounge"""
    text = "機場貴賓室免費使用"
    features = extract_common_features(text)
    assert "lounge_access" in features
    assert "lounge" not in features


def test_extract_common_features_empty():
    features = extract_common_features("")
    assert features == {}


def test_extract_common_features_travel_insurance():
    text = "旅遊保險最高 2000 萬，海外消費回饋加碼"
    features = extract_common_features(text)
    assert features.get("travel_insurance") is True
    assert features.get("overseas") is True


def test_extract_common_features_dining():
    text = "指定餐廳消費享 5% 回饋"
    features = extract_common_features(text)
    assert features.get("dining") is True
