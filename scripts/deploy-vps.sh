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
# Port SSH bisa diganti bila jaringan memblokir 22, mis. VPS_SSH_PORT=2222 npm run deploy:vps
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15 -o Port=${VPS_SSH_PORT:-22}"

# Sisa paket dari deploy yang terputus ikut ter-trace ke .next/standalone (build men-trace seluruh proyek): hapus dulu.
rm -f "$ARCHIVE_NAME"

echo "🚀 [1/5] Memulai kompilasi Next.js 16 Standalone Production Build..."
npm run build

echo "📦 [2/5] Menyiapkan paket rilis dan static chunks..."
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# Pack standalone release TANPA .env dev lokal dan graph.json (Knowledge Graph hanya untuk lokal)
# --no-mac-metadata (cegah file AppleDouble ._*) hanya ada di bsdtar macOS; GNU tar di Linux menolaknya.
TAR_MAC_OPTS=()
if tar --help 2>&1 | grep -q -- '--no-mac-metadata'; then TAR_MAC_OPTS=(--no-mac-metadata); fi
tar --no-xattrs ${TAR_MAC_OPTS[@]+"${TAR_MAC_OPTS[@]}"} -czf "$ARCHIVE_NAME" --exclude='.env' --exclude='./.env' --exclude='./graph.json' --exclude="./$ARCHIVE_NAME" -C .next/standalone .
echo "✅ Paket rilis siap: $ARCHIVE_NAME ($(du -h "$ARCHIVE_NAME" | cut -f1))"

echo "📤 [3/5] Mengunggah paket rilis ke VPS Biznet GIO ($VPS_HOST)..."
scp $SSH_OPTS "$ARCHIVE_NAME" "$VPS_USER@$VPS_HOST:$REMOTE_APP_DIR/"

echo "⚙️ [4/5] Mengekstrak rilis ke folder baru, menukar folder, menyinkronkan aset Nginx, dan me-reload PM2 di VPS..."
# Rilis diekstrak ke folder bersih lalu ditukar, jadi file build lama tidak menumpuk
# (sebelumnya tar -x di atas folder lama: ±5.700 file/68 MB menumpuk, dibersihkan 2026-11-25).
# Satu rilis sebelumnya disimpan di .next/standalone.prev untuk rollback cepat.
ssh $SSH_OPTS "$VPS_USER@$VPS_HOST" bash -s -- "$REMOTE_APP_DIR" "$ARCHIVE_NAME" <<'REMOTE'
set -euo pipefail
APP=$1
ARCHIVE=$2
cd "$APP"
CUR=.next/standalone
NEW=.next/standalone.new
PREV=.next/standalone.prev

# 1. Ekstrak rilis ke folder baru (tanpa .env dev lokal)
rm -rf "$NEW"
mkdir -p "$NEW"
tar -xzf "$ARCHIVE" --exclude=.env --exclude=./.env -C "$NEW"

# 2. Bawa .env produksi (dan cadangan .env.*) dari folder yang sedang jalan
for f in "$CUR"/.env "$CUR"/.env.*; do
  [ -f "$f" ] && cp -p "$f" "$NEW"/
done
[ -f "$NEW/.env" ] || { echo "❌ .env produksi tidak ada di $APP/$CUR, rilis dibatalkan"; rm -rf "$NEW"; exit 1; }

# 3. Upload persisten di storage/uploads, ditautkan ke public/uploads
mkdir -p storage/uploads
chmod -R 777 storage/uploads 2>/dev/null || true
rm -rf "$NEW/public/uploads"
ln -sfn "$APP/storage/uploads" "$NEW/public/uploads"

# 4. Tukar folder: rilis lama → standalone.prev, rilis baru → standalone
rm -rf "$PREV"
if [ -d "$CUR" ]; then mv "$CUR" "$PREV"; fi
mv "$NEW" "$CUR"

# 5. Static chunk untuk Nginx (/_next/static/): cermin persis build sekarang
mkdir -p .next/static
rsync -a --delete "$CUR/.next/static/" .next/static/
chmod -R 755 .next/static

# 6. public/ di root app; uploads tetap symlink ke storage
mkdir -p public
rsync -a --exclude=uploads "$CUR/public/" public/
if [ ! -L public/uploads ]; then
  cp -rn public/uploads/* storage/uploads/ 2>/dev/null || true
  rm -rf public/uploads
  ln -sfn "$APP/storage/uploads" public/uploads
fi
chmod -R 755 public 2>/dev/null || true

# 7. Hapus arsip sementara, lalu reload PM2 (cwd tetap .next/standalone)
rm -f "$ARCHIVE"
pm2 reload can-freelance --update-env
pm2 save
REMOTE

echo "🧹 [5/5] Membersihkan arsip lokal dan menjalankan Healthcheck..."
rm -f "$ARCHIVE_NAME"

# Uji loopback di server: tanpa cookie, /production harus 307 ke /login dan API harus 401.
# Gerbang login mati (200, atau 307 ke tempat lain) = deploy gagal.
HEALTH=$(ssh $SSH_OPTS "$VPS_USER@$VPS_HOST" bash -s <<'REMOTE'
CODE=000
for _ in 1 2 3 4 5 6 7 8 9 10; do
  HEADERS=$(curl -s -o /dev/null -D - --max-time 10 http://127.0.0.1:3002/production | tr -d '\r' || true)
  CODE=$(printf '%s\n' "$HEADERS" | sed -n 's/^HTTP\/[0-9.]* \([0-9]*\).*/\1/p' | tail -1)
  CODE=${CODE:-000}
  [ "$CODE" != "000" ] && [ "$CODE" != "502" ] && break
  sleep 2
done
LOCATION=$(printf '%s\n' "$HEADERS" | sed -n 's/^[Ll]ocation: *//p' | tail -1)
API=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3002/api/notion/databases || true)
echo "$CODE|$LOCATION|$API"
REMOTE
)
IFS='|' read -r PAGE_CODE PAGE_LOCATION API_STATUS <<< "$HEALTH"

if [ "$PAGE_CODE" = "307" ] && [[ "$PAGE_LOCATION" =~ ^(https?://[^/]+)?/login([?#].*)?$ ]] && [ "$API_STATUS" = "401" ]; then
  echo "=============================================================================="
  echo "🎉 DEPLOYMENT SUKSES! Gerbang login aktif (/production → 307 $PAGE_LOCATION, API → 401) di:"
  echo "👉 https://portal.meetimpro.site"
  echo "=============================================================================="
else
  echo "❌ GERBANG LOGIN TIDAK AKTIF: /production tanpa sesi → HTTP $PAGE_CODE ${PAGE_LOCATION:+(Location: $PAGE_LOCATION)}, API → HTTP $API_STATUS"
  echo "   Harus 307 ke /login dan API 401. Periksa AUTH_MODE/SESSION_SECRET yang terbaca PM2 dan: pm2 logs can-freelance"
  echo "   Rollback ke rilis sebelumnya (di VPS, $REMOTE_APP_DIR):"
  echo "     mv .next/standalone .next/standalone.bad && mv .next/standalone.prev .next/standalone && rsync -a --delete .next/standalone/.next/static/ .next/static/ && pm2 reload can-freelance --update-env"
  exit 1
fi
