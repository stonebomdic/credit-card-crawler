# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies (including dev tools)
pip install -e ".[dev]"

# Install Playwright browsers (required for crawlers and Momo tracker)
playwright install chromium

# Run all tests
python3 -m pytest tests/ -v

# Run a single test file
python3 -m pytest tests/test_models.py -v

# Run a specific test
python3 -m pytest tests/test_models.py::test_create_bank -v

# Lint (ruff may not be on PATH — always use python3 -m ruff)
python3 -m ruff check src/ tests/
python3 -m ruff check --fix src/ tests/
python3 -m ruff format src/ tests/
```

## CLI Commands

```bash
# Initialize database
python3 -m src.cli init

# Seed bank data
python3 -m src.cli seed

# Run crawler (all banks or specific)
python3 -m src.cli crawl
python3 -m src.cli crawl --bank ctbc

# Start API server (port 8000)
python3 -m src.cli serve
```

Supported bank codes: `ctbc` (中國信託), `esun` (玉山銀行), `sinopac` (永豐銀行), `cathay` (國泰世華), `fubon` (富邦銀行), `taishin` (台新銀行), `firstbank` (第一銀行), `hncb` (華南銀行), `megabank` (兆豐銀行), `ubot` (聯邦銀行)

## Frontend Commands

```bash
# Install frontend dependencies (requires Node.js 20+)
cd frontend && npm install

# Start frontend dev server (port 3000, proxies API to localhost:8000)
npm run dev --prefix frontend

# Build frontend (must use Node.js 20+; on this machine: ~/.nvm/versions/node/v24.6.0/bin/node)
npm run build --prefix frontend
```

## Docker Commands

```bash
docker-compose up --build                                           # development
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up  # production
```

The entrypoint script (`scripts/entrypoint.sh`) auto-runs `init` and `seed` on first launch.

---

## Architecture Overview

### Dual Database Session Pattern

The codebase uses **two different SQLAlchemy session patterns**:

1. **Async sessions** (`AsyncSession`) — FastAPI API endpoints via `get_db()` dependency in `src/db/database.py`
2. **Sync sessions** (`Session`) — Crawlers, scheduler jobs, tracker utils, and the recommendation engine. Created by replacing `+aiosqlite` with empty string in the database URL.

The recommend API endpoint (`src/api/recommend.py`) is a notable case: the route handler is async but internally creates a sync session because `RecommendationEngine` uses sync ORM queries.

**API tests** that hit the database must override `get_db` with an in-memory async SQLite. See `tests/test_products_api.py` for the pattern using `app.dependency_overrides[get_db]`.

### Crawler System (`src/crawlers/`)

All 10 bank crawlers in `src/crawlers/banks/` inherit from `BaseCrawler` (`src/crawlers/base.py`) and implement `fetch_cards()` and `fetch_promotions()`. The base class provides upsert logic that deduplicates by composite keys.

**Two crawler types:**
- 9 web crawlers (esun, cathay, sinopac, fubon, taishin, firstbank, hncb, megabank, ubot) — Playwright + `playwright-stealth`. Use `Stealth().apply_stealth_sync(page)` (not the deprecated `stealth_sync` function).
- 1 API crawler (ctbc) — fetches JSON via `httpx`, no browser needed.

**Shared utilities** (`src/crawlers/utils.py`) — `extract_common_features(text)` and `extract_promotions_from_text()` are used by all web crawlers.

To add a new bank crawler: create `src/crawlers/banks/<code>.py`, set `bank_name`/`bank_code`/`base_url`, implement both methods using shared utils, then register in `src/crawlers/banks/__init__.py` and `src/cli.py`.

### Tracker System (`src/trackers/`)

Mirrors the crawler system but for e-commerce price tracking. All trackers inherit from `BaseTracker` (`src/trackers/base.py`) and implement four methods: `search_products()`, `fetch_product_by_url()`, `fetch_price()`, `fetch_flash_deals()`.

**Two tracker types:**
- `PChomeTracker` (`platforms/pchome.py`) — uses `httpx` against PChome's public JSON API. No browser needed.
- `MomoTracker` (`platforms/momo.py`) — uses Playwright + stealth.

**Shared utilities** (`src/trackers/utils.py`):
- `get_tracker(platform)` — factory returning the correct tracker instance
- `check_price_and_snapshot(session, product)` — fetches current price, stores `PriceHistory`, returns `(snapshot, is_price_drop, is_target_reached)`
- `refresh_flash_deals(session, platform)` — fetches and upserts `FlashDeal` records

To add a new platform tracker: create `src/trackers/platforms/<name>.py`, implement `BaseTracker`, register in `get_tracker()` in `src/trackers/utils.py`.

### Key Data Conventions

- `lounge_access` is the canonical feature key (not `lounge`). `scoring.py` has a backward-compat fallback.
- `CreditCard.features` is a JSON column — a flat dict of booleans/strings populated by `extract_common_features()`.
- `Promotion` has `reward_type` ("cashback"/"miles"/"points"), `reward_limit` (int), and `min_spend` (int).
- `TrackedProduct.product_id` stores the platform's native ID (PChome path segment or Momo `i_code`).
- `PriceHistory` records every price check snapshot; deduplication is not applied — all snapshots are kept.

### Recommendation Engine (`src/recommender/`)

Weighted scoring: reward (40%), feature (25%), promotion (15%), annual_fee_roi (20%).

- `scoring.py` — individual calculators. Also contains `calculate_shopping_reward(card, platform, amount, promotions)` which maps platform → promotion category (`pchome`/`momo` → `online_shopping`) and returns `{reward_amount, best_rate, reason}`.
- `engine.py` — orchestrates filtering, scoring, ranking, and reason generation.
- `estimate_monthly_reward()` is shared between `calculate_reward_score()` and `calculate_annual_fee_roi()`.

### API Endpoints

Defined across `src/api/cards.py`, `src/api/recommend.py`, `src/api/products.py`, mounted via `src/api/router.py`:

**Cards & banks:**
- `GET /api/banks`, `GET /api/banks/{bank_id}`
- `GET /api/cards?page=&size=&bank_id=&card_type=`, `GET /api/cards/{card_id}`
- `GET /api/cards/{card_id}/promotions`
- `POST /api/recommend`

**Product tracking (src/api/products.py):**
- `GET /api/products` — active tracked products
- `POST /api/products` — add by `url` (direct) or `keyword` (triggers tracker search)
- `DELETE /api/products/{id}` — soft-delete (`is_active=False`)
- `GET /api/products/{id}/history` — price history sorted ascending
- `GET /api/flash-deals?platform=` — flash deals sorted by `discount_rate`

**Other:**
- `GET /health`, `GET /api/admin/status` (requires `X-Admin-Key` header in production)

### Scheduler (`src/scheduler/`)

Job implementations live in `jobs.py` (all use sync sessions); `runner.py` sets up APScheduler triggers and calls into them.

| Schedule | Job |
|----------|-----|
| Daily 02:00 | Promotion crawl |
| Weekly Sun 03:00 | Card info crawl |
| Daily 04:00 | Cleanup expired promotions |
| Daily 06:00 | Notify new promotions |
| Daily 09:00 | Notify expiring promotions (3-day warning) |
| Every 30 min | `run_price_tracking()` — fetch prices for all active `TrackedProduct`, trigger notifications on drop |
| Every 1 hour | `run_flash_deals_refresh()` — refresh PChome + Momo flash deals |

`run_price_tracking()` calls `_get_top_cards_for_shopping()` to include Top 3 best-cashback cards in the price-drop notification.

### Notifications (`src/notifications/`)

Supports Telegram and Discord. `NotificationDispatcher` deduplicates via `NotificationLog` (unique on type+reference_id+channel).

`NotificationType` enum values: `new_promotion`, `expiring_promotion`, `new_card`, `price_drop`, `target_price_reached`, `flash_deal_new`.

`formatter.py` key functions:
- `format_new_promotions()`, `format_expiring_promotions()`, `format_new_cards()` — for credit card notifications
- `format_price_drop_alert(product, snapshot, top_cards, is_target_reached)` — for price tracking, includes Top 3 best-cashback cards

### Frontend (`frontend/`)

Next.js (App Router). Pages: `/` (home), `/cards` (listing), `/recommend` (wizard), `/track` (product tracking), `/deals` (flash deals). Navbar defined in `frontend/src/app/layout.tsx`. Design system: Outfit + Noto Sans TC, glassmorphism, Tailwind CSS v4. Price history chart uses `recharts`.

### Configuration

Settings loaded from `.env` via pydantic-settings (`src/config.py`). Key settings: `ENVIRONMENT`, `DATABASE_URL`, `CORS_ORIGINS`, `ADMIN_API_KEY`, `NOTIFICATION_ENABLED`, `TELEGRAM_BOT_TOKEN`, `DISCORD_WEBHOOK_URL`.

### Ruff Configuration

Line length 100, target Python 3.9+, rules: E, F, I, N, W. Two pre-existing errors that are excluded from our responsibility: `E741` in `ctbc.py` and `F841` in `sinopac.py`.
