from __future__ import annotations

from typing import Dict, List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base
from src.models.base import TimestampMixin

if TYPE_CHECKING:
    from src.models.bank import Bank
    from src.models.promotion import Promotion


class CreditCard(Base, TimestampMixin):
    __tablename__ = "credit_cards"

    id: Mapped[int] = mapped_column(primary_key=True)
    bank_id: Mapped[int] = mapped_column(ForeignKey("banks.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    card_type: Mapped[Optional[str]] = mapped_column(String(50))
    annual_fee: Mapped[Optional[int]] = mapped_column(Integer)
    annual_fee_waiver: Mapped[Optional[str]] = mapped_column(String(255))
    image_url: Mapped[Optional[str]] = mapped_column(String(255))
    apply_url: Mapped[Optional[str]] = mapped_column(String(255))
    min_income: Mapped[Optional[int]] = mapped_column(Integer)
    features: Mapped[Optional[Dict]] = mapped_column(JSON)
    base_reward_rate: Mapped[Optional[float]] = mapped_column(Float)

    bank: Mapped["Bank"] = relationship(back_populates="cards")
    promotions: Mapped[List["Promotion"]] = relationship(back_populates="card")

    def __repr__(self) -> str:
        return f"<CreditCard {self.name}>"
