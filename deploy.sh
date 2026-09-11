#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=========================================="
echo "🚀 Deploying Company Connect to VPS..."
echo "=========================================="

# 1. Pull latest code (if using git)
if [ -d ".git" ]; then
  echo "📥 Pulling latest git changes..."
  git pull origin main || git pull
fi

# 2. Install root/frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# 3. Build frontend for production
echo "🔨 Building frontend (Vite)..."
npm run build

# 4. Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install --production
cd ..

# 5. Create logs directory for PM2 if not exists
mkdir -p server/logs

# 6. Start / Reload PM2 Backend (Port 5009)
echo "⚡ Starting/Reloading PM2 backend process on port 5009..."
if pm2 describe company-connect-server > /dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --env production
else
  pm2 start ecosystem.config.cjs --env production
fi

# 7. Save PM2 state so it restarts on system reboot
pm2 save

echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "🌐 Subdomain: https://portal.gemshine.tech"
echo "🔌 Backend running on: http://127.0.0.1:5009"
echo "=========================================="
