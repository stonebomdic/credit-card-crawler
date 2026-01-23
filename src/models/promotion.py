from __future__ import annotations

from datetime import date
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, ForeignKey, Text, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base
from src.models.base import TimestampMixin

if TYPE_CHECKING:
    from src.models.card import CreditCard


class Promotion(Base, TimestampMixin):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(primary_key=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("credit_cards.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(50))
    reward_type: Mapped[Optional[str]] = mapped_column(String(50))
    reward_rate: Mapped[Optional[float]] = mapped_column(Float)
    reward_limit: Mapped[Optional[int]] = mapped_column(Integer)
    min_spend: Mapped[Optional[int]] = mapped_column(Integer)
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    terms: Mapped[Optional[str]] = mapped_column(Text)
    source_url: Mapped[Optional[str]] = mapped_column(String(255))

    card: Mapped["CreditCard"] = relationship(back_populates="promotions")

    def __repr__(self) -> str:
        return f"<Promotion {self.title}>"
