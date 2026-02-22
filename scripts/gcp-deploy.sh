#!/usr/bin/env bash
# 部署或更新 deal-radar（在 VM 上執行）
# 使用：cd ~/deal-radar && bash scripts/gcp-deploy.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATIC_DIR="/var/www/deal-radar"

echo "=== [1/4] 拉取最新程式碼 ==="
cd "$APP_DIR"
git pull origin main

echo "=== [2/4] 設定 Nginx ==="
sudo cp nginx/deal-radar.conf /etc/nginx/sites-available/deal-radar
sudo ln -sf /etc/nginx/sites-available/deal-radar /etc/nginx/sites-enabled/deal-radar
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "=== [3/4] 啟動後端容器 ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.gcp.yml up -d --build

echo "=== [4/4] 等待後端健康 ==="
echo "等待 API 就緒..."
for i in $(seq 1 12); do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "API 就緒！"
        break
    fi
    echo "  等待中... ($i/12)"
    sleep 5
done

echo ""
echo "=== 部署完成 ==="
echo "靜態前端請從本機上傳："
echo "  scp -r frontend/out/* USER@VM_IP:$STATIC_DIR/"
