# Credit Card Crawler

台灣信用卡資訊爬蟲與推薦系統

## 功能

- 爬取台灣主要銀行信用卡資訊（目前支援中國信託）
- 信用卡優惠活動查詢
- 根據消費習慣推薦最適合的信用卡
- RESTful API 提供資料查詢
- 排程自動更新信用卡資料

## 安裝

### 環境需求

- Python 3.9+
- pip

### 安裝步驟

```bash
# 建立虛擬環境
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate  # Windows

# 安裝依賴
pip install -e ".[dev]"

# 安裝 Playwright 瀏覽器（爬蟲需要）
playwright install chromium
```

## CLI 使用說明

本專案提供命令列工具進行各項操作：

```bash
python -m src.cli <command>
```

### 可用指令

#### init - 初始化資料庫

```bash
python -m src.cli init
```

建立資料庫表格結構。首次使用前必須執行。

#### seed - 匯入種子資料

```bash
python -m src.cli seed
```

匯入預設的銀行資料。

#### crawl - 執行爬蟲

```bash
# 執行所有銀行爬蟲
python -m src.cli crawl

# 指定銀行
python -m src.cli crawl --bank ctbc
python -m src.cli crawl -b ctbc
```

目前支援的銀行代碼：
- `ctbc` - 中國信託

#### serve - 啟動 API 服務

```bash
python -m src.cli serve
```

啟動 FastAPI 服務，預設監聽 `http://localhost:8000`

## API 端點

啟動服務後，可訪問 http://localhost:8000/docs 查看完整的 Swagger API 文件。

### 主要端點

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/health` | 健康檢查 |
| GET | `/api/banks` | 取得所有銀行列表 |
| GET | `/api/banks/{bank_id}` | 取得單一銀行資訊 |
| GET | `/api/cards` | 取得信用卡列表（支援分頁、篩選） |
| GET | `/api/cards/{card_id}` | 取得單一信用卡詳情 |
| GET | `/api/cards/{card_id}/promotions` | 取得信用卡優惠活動 |
| POST | `/api/recommend` | 取得信用卡推薦 |

### 查詢參數

`GET /api/cards` 支援以下查詢參數：
- `page` - 頁碼（預設 1）
- `size` - 每頁筆數（預設 20，最大 100）
- `bank_id` - 篩選特定銀行
- `card_type` - 篩選卡片類型（visa, mastercard, jcb）

### 推薦 API 範例

```bash
curl -X POST http://localhost:8000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "spending_habits": {
      "dining": 0.3,
      "shopping": 0.4,
      "travel": 0.2,
      "other": 0.1
    },
    "monthly_amount": 30000,
    "preferences": ["no_annual_fee", "high_reward"],
    "limit": 5
  }'
```

## 專案結構

```
credit-card-crawler/
├── src/
│   ├── api/                 # FastAPI 路由與 schemas
│   │   ├── cards.py         # 信用卡相關 API
│   │   ├── recommend.py     # 推薦 API
│   │   ├── router.py        # 路由整合
│   │   └── schemas.py       # Pydantic schemas
│   ├── crawlers/            # 爬蟲模組
│   │   ├── banks/           # 各銀行爬蟲實作
│   │   │   └── ctbc.py      # 中國信託爬蟲
│   │   ├── base.py          # 爬蟲基類
│   │   └── utils.py         # 爬蟲工具函式
│   ├── db/                  # 資料庫模組
│   │   ├── database.py      # 資料庫連線設定
│   │   └── seed.py          # 種子資料
│   ├── models/              # ORM 模型
│   │   ├── bank.py          # 銀行模型
│   │   ├── card.py          # 信用卡模型
│   │   └── promotion.py     # 優惠活動模型
│   ├── recommender/         # 推薦引擎
│   │   ├── engine.py        # 推薦邏輯
│   │   └── scoring.py       # 評分函式
│   ├── scheduler/           # 排程系統
│   │   ├── jobs.py          # 排程任務
│   │   └── runner.py        # 排程執行器
│   ├── cli.py               # CLI 入口
│   ├── config.py            # 設定檔
│   └── main.py              # FastAPI 應用程式入口
├── tests/                   # 測試檔案
│   ├── test_api.py
│   ├── test_crawler_base.py
│   ├── test_crawler_ctbc.py
│   ├── test_models.py
│   └── test_recommender.py
├── pyproject.toml           # 專案設定與依賴
└── README.md
```

## 開發

### 執行測試

```bash
pytest tests/ -v
```

### 程式碼檢查

```bash
ruff check src/ tests/
```

### 格式化程式碼

```bash
ruff format src/ tests/
```

## 環境變數

可透過環境變數或 `.env` 檔案設定：

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `DATABASE_URL` | 資料庫連線字串 | `sqlite+aiosqlite:///./data/credit_cards.db` |
| `API_HOST` | API 監聽位址 | `0.0.0.0` |
| `API_PORT` | API 監聽埠號 | `8000` |
| `DEBUG` | 除錯模式 | `false` |

## License

MIT
