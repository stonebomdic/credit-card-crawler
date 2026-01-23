from fastapi import APIRouter

from src.api.cards import router as cards_router

api_router = APIRouter()
api_router.include_router(cards_router)
