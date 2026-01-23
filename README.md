# Credit Card Crawler

台灣信用卡資訊爬蟲與推薦系統

## 功能

- 爬取台灣主要銀行信用卡資訊
- 信用卡優惠活動查詢
- 根據消費習慣推薦最適合的信用卡

## 安裝

```bash
# 建立虛擬環境
python -m venv .venv
source .venv/bin/activate  # macOS/Linux

# 安裝依賴
pip install -e ".[dev]"

# 安裝 Playwright 瀏覽器
playwright install chromium
```

## 執行

```bash
# 啟動 API 服務
uvicorn src.main:app --reload

# 執行爬蟲
python -m src.crawlers.run
```

## API 文件

啟動服務後，訪問 http://localhost:8000/docs 查看 API 文件。
