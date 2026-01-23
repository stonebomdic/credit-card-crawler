from typing import List, Optional

from bs4 import BeautifulSoup
from loguru import logger

from src.crawlers.base import BaseCrawler
from src.crawlers.utils import fetch_page
from src.models import CreditCard, Promotion


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

    def _parse_card_item(self, item: BeautifulSoup) -> Optional[dict]:
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

    def _detect_card_type(self, name: str) -> Optional[str]:
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
                    card = (
                        self.db.query(CreditCard)
                        .filter_by(bank_id=self.bank.id)
                        .first()
                    )
                    if card:
                        promotion = self.save_promotion(card, promo_data)
                        promotions.append(promotion)
            except Exception as e:
                logger.warning(f"Error parsing promotion: {e}")
                continue

        return promotions

    def _parse_promotion_item(self, item: BeautifulSoup) -> Optional[dict]:
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

    def _detect_category(self, title: str, description: Optional[str]) -> Optional[str]:
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
