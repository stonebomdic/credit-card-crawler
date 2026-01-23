from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class BankBase(BaseModel):
    name: str
    code: str
    website: Optional[str] = None
    logo_url: Optional[str] = None


class BankResponse(BankBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CreditCardBase(BaseModel):
    name: str
    card_type: Optional[str] = None
    annual_fee: Optional[int] = None
    annual_fee_waiver: Optional[str] = None
    image_url: Optional[str] = None
    apply_url: Optional[str] = None
    min_income: Optional[int] = None
    features: Optional[dict] = None
    base_reward_rate: Optional[float] = None


class CreditCardResponse(CreditCardBase):
    id: int
    bank_id: int
    bank: BankResponse
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreditCardListResponse(CreditCardBase):
    id: int
    bank_id: int
    bank_name: str

    class Config:
        from_attributes = True


class PromotionBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    reward_type: Optional[str] = None
    reward_rate: Optional[float] = None
    reward_limit: Optional[int] = None
    min_spend: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    terms: Optional[str] = None
    source_url: Optional[str] = None


class PromotionResponse(PromotionBase):
    id: int
    card_id: int

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    size: int
    pages: int
