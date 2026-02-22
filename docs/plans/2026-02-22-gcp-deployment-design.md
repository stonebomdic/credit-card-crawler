# GCP 部署設計文件

**日期：** 2026-02-22
**目標：** 將 deal-radar 部署至 GCP 免費方案，維持前端查詢與排程爬取

---

## 架構概覽

```
外部 IP:80
     │
  Nginx（靜態前端 + API 反向代理）
     ├── /          → /var/www/deal-radar（Next.js static export）
     └── /api/*     → localhost:8000（FastAPI + APScheduler）
                           │
                      SQLite（/app/data/credit_cards.db）
                      持久磁碟（30 GB）
```

## 元件規格

| 元件 | 方案 | 說明 |
|------|------|------|
| VM | e2-micro（us-central1）| GCP 永久免費，1 vCPU / 1 GB RAM |
| 磁碟 | 30 GB standard persistent disk | 永久免費，存 SQLite + logs |
| Swap | 2 GB swap file | 防止 Playwright Chromium OOM crash |
| 後端 | Docker 單容器（FastAPI + APScheduler）| 移除前端 Node.js 容器 |
| 前端 | Next.js static export → Nginx | 節省約 150 MB RAM |
| 反向代理 | Nginx | 統一 port 80，轉發 /api/* 至後端 |
| 網域 | 無，使用 GCP 靜態外部 IP | 直接以 IP 存取 |

## 排程調整

| Job | 原頻率 | 新頻率 | 理由 |
|-----|--------|--------|------|
| PChome flash deals | 每 1 小時 | 每 1 小時 | httpx 輕量，不變 |
| Momo flash deals | 每 1 小時 | **每 3 小時** | Playwright 重量，降低記憶體壓力 |
| 價格追蹤 | 每 30 分鐘 | 每 30 分鐘 | httpx 為主，不變 |
| 每日促銷爬取 | 02:00 | 02:00 | 不變 |
| 每週信用卡爬取 | 週日 03:00 | 週日 03:00 | 不變 |
| 清理過期優惠 | 04:00 | 04:00 | 不變 |
| 新優惠通知 | 06:00 | 06:00 | 不變 |
| 到期提醒通知 | 09:00 | 09:00 | 不變 |

## 記憶體策略

- 2 GB swap file 作為保底，防止 Playwright 啟動時 OOM
- Momo 爬取降為每 3 小時，減少 Chromium 高峰記憶體頻率
- 後端單一 Docker 容器，移除 Node.js 前端容器（節省 ~150 MB）

## 前端靜態匯出注意事項

- `next.config.js` 加入 `output: 'export'`
- 動態路由 `/cards/[id]` 需加 `generateStaticParams()` 預先生成頁面
- API 呼叫從前端直接打 `http://<VM_IP>/api/*`（Nginx 反向代理）
- 靜態檔案部署至 VM `/var/www/deal-radar/`，由 Nginx 服務

## 實作步驟摘要

1. **GCP VM 設定**：建立 e2-micro、靜態外部 IP、防火牆開放 port 80
2. **VM 初始化**：安裝 Docker、Nginx，建立 2 GB swap
3. **後端調整**：`docker-compose.yml` 移除 frontend service；`runner.py` Momo 頻率改為 3 小時
4. **前端靜態化**：`next.config.js` 加 `output: 'export'`，本機 build，上傳至 VM
5. **Nginx 設定**：靜態檔案 + `/api/*` 反向代理
6. **環境變數**：VM 上設定 `.env`
7. **啟動與驗證**：`docker compose up -d`，確認 health check 與前端頁面正常
