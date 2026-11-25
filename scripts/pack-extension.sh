#!/usr/bin/env bash
# Kemas extension Canva Insights ke public/downloads/canva-insights-extension.zip (Chrome)
# dan public/downloads/canva-insights-extension-firefox.zip (Firefox, lewat tools/…/scripts/build-firefox.mjs)
# (diunduh dari Notion Config › Extension; file di public/ tetap lewat gerbang login proxy).
# Dijalankan otomatis oleh `npm run build`. Isi zip = folder canva-insights-extension/ tanpa test & package.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_PARENT="$ROOT/tools"
OUT_DIR="$ROOT/public/downloads"
OUT="$OUT_DIR/canva-insights-extension.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT"
(
  cd "$SRC_PARENT"
  COPYFILE_DISABLE=1 zip -rqX "$OUT" canva-insights-extension \
    -x 'canva-insights-extension/test/*' \
       'canva-insights-extension/package.json' \
       'canva-insights-extension/node_modules/*' \
       'canva-insights-extension/manifest.firefox.json' \
       'canva-insights-extension/scripts/*' \
       'canva-insights-extension/dist/*' \
       'canva-insights-extension/.gitignore' \
       '*/.DS_Store'
)
VERSION=$(node -p "require('$SRC_PARENT/canva-insights-extension/manifest.json').version")
echo "📦 Extension Canva Insights $VERSION → public/downloads/canva-insights-extension.zip ($(du -h "$OUT" | cut -f1))"
FF_OUT="$OUT_DIR/canva-insights-extension-firefox.zip"
node "$SRC_PARENT/canva-insights-extension/scripts/build-firefox.mjs" "$FF_OUT" >/dev/null
echo "📦 Extension Canva Insights $VERSION (Firefox) → public/downloads/canva-insights-extension-firefox.zip ($(du -h "$FF_OUT" | cut -f1))"
