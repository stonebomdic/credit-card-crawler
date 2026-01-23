from datetime import datetime

from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.config import get_settings
from src.crawlers.banks import CtbcCrawler

settings = get_settings()

# 同步版本的資料庫連線（給排程使用）
sync_database_url = settings.database_url.replace("+aiosqlite", "")


def get_sync_session() -> Session:
    engine = create_engine(sync_database_url)
    return Session(engine)


def run_daily_promotion_crawl():
    """每日優惠爬取任務"""
    logger.info(f"Starting daily promotion crawl at {datetime.now()}")

    with get_sync_session() as session:
        crawlers = [
            CtbcCrawler(session),
            # 之後加入更多銀行爬蟲
        ]

        for crawler in crawlers:
            try:
                result = crawler.run()
                logger.info(f"Completed: {result}")
            except Exception as e:
                logger.error(f"Error crawling {crawler.bank_name}: {e}")

    logger.info("Daily promotion crawl completed")


def run_weekly_card_crawl():
    """每週信用卡資訊爬取任務"""
    logger.info(f"Starting weekly card crawl at {datetime.now()}")

    with get_sync_session() as session:
        crawlers = [
            CtbcCrawler(session),
        ]

        for crawler in crawlers:
            try:
                cards = crawler.fetch_cards()
                logger.info(f"Fetched {len(cards)} cards from {crawler.bank_name}")
            except Exception as e:
                logger.error(f"Error crawling {crawler.bank_name}: {e}")

    logger.info("Weekly card crawl completed")


def cleanup_expired_promotions():
    """清理過期優惠"""
    from src.models import Promotion

    logger.info("Cleaning up expired promotions")

    with get_sync_session() as session:
        today = datetime.now().date()
        expired = session.query(Promotion).filter(Promotion.end_date < today).all()

        for promo in expired:
            session.delete(promo)

        session.commit()
        logger.info(f"Deleted {len(expired)} expired promotions")
