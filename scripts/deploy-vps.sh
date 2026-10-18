#!/usr/bin/env bash

# ==============================================================================
# CAN-FREELANCE — ONE-COMMAND PRODUCTION DEPLOYMENT TO BIZNET GIO VPS
# ==============================================================================
# Menjamin zero-downtime, integritas .env VPS tidak tertimpa,
# dan sinkronisasi static chunk Nginx secara otomatis.
# ==============================================================================

set -e

# Muat SSH key otomatis dari macOS Keychain jika tersedia
ssh-add --apple-load-keychain 2>/dev/null || true

VPS_USER="fatchurbeny"
VPS_HOST="103.89.5.148"
REMOTE_APP_DIR="/www/wwwroot/can-freelance-app"
ARCHIVE_NAME="can-freelance-release.tar.gz"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15"

echo "🚀 [1/5] Memulai kompilasi Next.js 16 Standalone Production Build..."
npm run build

echo "📦 [2/5] Menyiapkan paket rilis dan static chunks..."
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# Pack standalone release TANPA .env dev lokal dan graph.json (Knowledge Graph hanya untuk lokal)
tar -czf "$ARCHIVE_NAME" --exclude='.env' --exclude='./.env' --exclude='./graph.json' -C .next/standalone .
echo "✅ Paket rilis siap: $ARCHIVE_NAME ($(du -h "$ARCHIVE_NAME" | cut -f1))"

echo "📤 [3/5] Mengunggah paket rilis ke VPS Biznet GIO ($VPS_HOST)..."
scp $SSH_OPTS "$ARCHIVE_NAME" "$VPS_USER@$VPS_HOST:$REMOTE_APP_DIR/"

echo "⚙️ [4/5] Mengekstrak rilis, menyinkronkan aset Nginx, dan me-reload PM2 di VPS..."
ssh $SSH_OPTS "$VPS_USER@$VPS_HOST" bash -c "'
  set -e
  cd $REMOTE_APP_DIR
  
  # 1. Ekstrak kode baru ke folder standalone (TIDAK menyentuh .env produksi)
  tar -xzf $ARCHIVE_NAME --exclude=.env --exclude=./.env -C .next/standalone/
  
  # 2. Sinkronkan static chunks ke jalur pembacaan Nginx untuk mencegah error Failed to load chunk
  mkdir -p .next/static
  cp -rf .next/standalone/.next/static/* .next/static/
  chmod -R 755 .next/static
  mkdir -p public
  cp -rf .next/standalone/public/* public/ 2>/dev/null || true
  chmod -R 755 public
  
  # 2b. Persistent uploads directory di dalam $REMOTE_APP_DIR/storage/uploads
  mkdir -p storage/uploads
  chmod -R 777 storage/uploads 2>/dev/null || true
  mkdir -p public/uploads
  mkdir -p .next/standalone/public/uploads
  # Link persistent uploads to public folders
  cp -rn public/uploads/* storage/uploads/ 2>/dev/null || true
  rm -rf public/uploads .next/standalone/public/uploads
  ln -sfn $REMOTE_APP_DIR/storage/uploads public/uploads
  ln -sfn $REMOTE_APP_DIR/storage/uploads .next/standalone/public/uploads

  # 3. Hapus archive temporary di server
  rm -f $ARCHIVE_NAME
  
  # 4. Zero-downtime reload via PM2
  pm2 reload can-freelance --update-env
  pm2 save
'"

echo "🧹 [5/5] Membersihkan arsip lokal dan menjalankan Healthcheck..."
rm -f "$ARCHIVE_NAME"

# Uji loopback di server: tanpa cookie, /production harus 307 ke /can-freelance/login dan API harus 401.
# Gerbang login mati (200, atau 307 ke tempat lain) = deploy gagal.
HEALTH=$(ssh $SSH_OPTS "$VPS_USER@$VPS_HOST" bash -s <<'REMOTE'
CODE=000
for _ in 1 2 3 4 5 6 7 8 9 10; do
  HEADERS=$(curl -s -o /dev/null -D - --max-time 10 http://127.0.0.1:3002/can-freelance/production | tr -d '\r' || true)
  CODE=$(printf '%s\n' "$HEADERS" | sed -n 's/^HTTP\/[0-9.]* \([0-9]*\).*/\1/p' | tail -1)
  CODE=${CODE:-000}
  [ "$CODE" != "000" ] && [ "$CODE" != "502" ] && break
  sleep 2
done
LOCATION=$(printf '%s\n' "$HEADERS" | sed -n 's/^[Ll]ocation: *//p' | tail -1)
API=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3002/can-freelance/api/notion/databases || true)
echo "$CODE|$LOCATION|$API"
REMOTE
)
IFS='|' read -r PAGE_CODE PAGE_LOCATION API_STATUS <<< "$HEALTH"

if [ "$PAGE_CODE" = "307" ] && [[ "$PAGE_LOCATION" =~ ^(https?://[^/]+)?/can-freelance/login([?#].*)?$ ]] && [ "$API_STATUS" = "401" ]; then
  echo "=============================================================================="
  echo "🎉 DEPLOYMENT SUKSES! Gerbang login aktif (/production → 307 $PAGE_LOCATION, API → 401) di:"
  echo "👉 https://portal.fatchurbeny.com/can-freelance"
  echo "=============================================================================="
else
  echo "❌ GERBANG LOGIN TIDAK AKTIF: /can-freelance/production tanpa sesi → HTTP $PAGE_CODE ${PAGE_LOCATION:+(Location: $PAGE_LOCATION)}, API → HTTP $API_STATUS"
  echo "   Harus 307 ke /can-freelance/login dan API 401. Periksa AUTH_MODE/SESSION_SECRET yang terbaca PM2 dan: pm2 logs can-freelance"
  exit 1
fi
