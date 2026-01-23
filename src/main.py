from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

from src.api.router import api_router
from src.config import get_settings
from src.db.database import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    await init_db()
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Credit Card Crawler API",
    description="台灣信用卡資訊查詢與推薦 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
