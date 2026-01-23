from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from loguru import logger

from src.api.router import api_router
from src.config import get_settings
from src.db.database import init_db
from src.scheduler.runner import start_scheduler

settings = get_settings()
scheduler: Optional[object] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global scheduler
    logger.info("Starting up...")
    await init_db()

    # 啟動排程器
    scheduler = start_scheduler()

    yield

    # 關閉排程器
    if scheduler:
        scheduler.shutdown()
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


@app.get("/api/admin/status")
async def admin_status():
    jobs = []
    if scheduler:
        for job in scheduler.get_jobs():
            jobs.append(
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run": str(job.next_run_time) if job.next_run_time else None,
                }
            )

    return {
        "scheduler_running": scheduler is not None and scheduler.running,
        "jobs": jobs,
    }
