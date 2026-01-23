from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.schemas import (
    BankResponse,
    CreditCardListResponse,
    CreditCardResponse,
    PaginatedResponse,
    PromotionResponse,
)
from src.db.database import get_db
from src.models import Bank, CreditCard, Promotion

router = APIRouter(prefix="/api", tags=["cards"])


@router.get("/banks", response_model=list[BankResponse])
async def list_banks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bank))
    banks = result.scalars().all()
    return banks


@router.get("/banks/{bank_id}", response_model=BankResponse)
async def get_bank(bank_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bank).where(Bank.id == bank_id))
    bank = result.scalar_one_or_none()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")
    return bank


@router.get("/cards")
async def list_cards(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    bank_id: Optional[int] = None,
    card_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(CreditCard).options(selectinload(CreditCard.bank))

    if bank_id:
        query = query.where(CreditCard.bank_id == bank_id)
    if card_type:
        query = query.where(CreditCard.card_type == card_type)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    cards = result.scalars().all()

    items = [
        CreditCardListResponse(
            id=card.id,
            bank_id=card.bank_id,
            bank_name=card.bank.name,
            name=card.name,
            card_type=card.card_type,
            annual_fee=card.annual_fee,
            annual_fee_waiver=card.annual_fee_waiver,
            image_url=card.image_url,
            apply_url=card.apply_url,
            min_income=card.min_income,
            features=card.features,
            base_reward_rate=card.base_reward_rate,
        )
        for card in cards
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size if total else 0,
    )


@router.get("/cards/{card_id}", response_model=CreditCardResponse)
async def get_card(card_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CreditCard)
        .options(selectinload(CreditCard.bank))
        .where(CreditCard.id == card_id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.get("/cards/{card_id}/promotions", response_model=list[PromotionResponse])
async def get_card_promotions(card_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Promotion).where(Promotion.card_id == card_id))
    promotions = result.scalars().all()
    return promotions
