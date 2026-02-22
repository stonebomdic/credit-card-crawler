#!/usr/bin/env bash
# GCP e2-micro VM 初始化腳本（首次執行一次）
# 使用：bash scripts/gcp-vm-setup.sh
set -euo pipefail

echo "=== [1/5] 更新套件 ==="
sudo apt-get update && sudo apt-get upgrade -y

echo "=== [2/5] 安裝 Docker ==="
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

echo "=== [3/5] 安裝 Nginx ==="
sudo apt-get install -y nginx
sudo systemctl enable nginx

echo "=== [4/5] 建立 2GB swap ==="
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    echo "Swap 已建立並設為永久"
else
    echo "Swap 已存在，略過"
fi

echo "=== [5/5] 建立應用目錄 ==="
sudo mkdir -p /var/www/deal-radar
sudo chown "$USER:$USER" /var/www/deal-radar
mkdir -p ~/deal-radar

echo ""
echo "=== 完成！請重新登入以套用 docker 群組設定 ==="
echo "下一步："
echo "  1. 重新登入 VM"
echo "  2. git clone 或 git pull 專案到 ~/deal-radar"
echo "  3. 執行 bash scripts/gcp-deploy.sh 部署應用"
