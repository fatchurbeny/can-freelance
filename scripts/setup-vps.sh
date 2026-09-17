#!/usr/bin/env bash

set -e

echo "========================================================"
echo "🚀 CAN-FREELANCE — VPS AUTO SETUP & DEPLOYMENT SCRIPT"
echo "========================================================"

# 1. Update system & install Docker
echo "📦 [1/5] Updating packages and installing Docker..."
sudo apt-get update -y
sudo apt-get install -y curl git ufw debian-keyring debian-archive-keyring apt-transport-https

if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
fi

# 2. Install Caddy Server for Auto-HTTPS
echo "🔒 [2/5] Installing Caddy Server for SSL (HTTPS)..."
if ! command -v caddy &> /dev/null; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt-get update -y
    sudo apt-get install -y caddy
fi

# 3. Configure Firewall
echo "🛡️ [3/5] Configuring Firewall (UFW)..."
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
echo "y" | sudo ufw enable || true

# 4. Environment Check
if [ ! -f .env ]; then
    echo "📝 [4/5] .env file not found. Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️ NOTE: Please edit .env if you need to update Notion or Google OAuth keys."
fi

# 5. Build and Launch Containers
echo "🚢 [5/5] Building Docker Containers & Starting Application..."
docker compose up --build -d

echo "⏳ Waiting 10 seconds for PostgreSQL to initialize..."
sleep 10

echo "🗄️ Running Prisma Database Push..."
docker compose exec web npx prisma db push

echo "========================================================"
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "========================================================"
echo "Aplikasi telah berjalan di port 3002 lokal VPS."
echo "========================================================"
