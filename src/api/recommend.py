from typing import Dict, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db

router = APIRouter(prefix="/api", tags=["recommend"])


class RecommendRequestSchema(BaseModel):
    spending_habits: Dict[str, float]
    monthly_amount: int
    preferences: List[str] = []
    limit: int = 5


class CardRecommendationSchema(BaseModel):
    rank: int
    card_id: int
    card_name: str
    bank_name: str
    score: float
    estimated_monthly_reward: float
    reasons: List[str]


class RecommendResponseSchema(BaseModel):
    recommendations: List[CardRecommendationSchema]


@router.post("/recommend", response_model=RecommendResponseSchema)
async def get_recommendations(
    request: RecommendRequestSchema,
    db: AsyncSession = Depends(get_db),
):
    # 暫時回傳空結果，因為 RecommendationEngine 需要同步 session
    # 實際整合會在後續任務處理
    return RecommendResponseSchema(recommendations=[])
