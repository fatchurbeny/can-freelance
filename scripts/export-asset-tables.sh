#!/usr/bin/env bash
# Ekspor data fitur Asset sebelum tabelnya di-DROP (penghapusan fitur Asset, 2026-11-14).
# Dijalankan DI VPS lewat:  ssh -p 2222 fatchurbeny@103.89.5.148 'bash -s' < scripts/export-asset-tables.sh > backups/asset-export-20261114.json
# - stdout: JSON { assets, asset_categories, asset_productions, task_assets, asset_report } (untuk laptop).
# - Salinan lengkap pg_dump (bisa dipulihkan): ~/db-backups/can-freelance-20261114-asset-tables.dump di VPS.
set -euo pipefail
cd /www/wwwroot/can-freelance-app
DB="$(grep -h '^DATABASE_URL=' .next/standalone/.env | head -1 | cut -d= -f2- | tr -d '"' | sed 's/?.*//')"
mkdir -p ~/db-backups
pg_dump "$DB" -Fc -t assets -t asset_categories -t asset_productions -t task_assets \
  -f ~/db-backups/can-freelance-20261114-asset-tables.dump
echo "pg_dump OK: ~/db-backups/can-freelance-20261114-asset-tables.dump" >&2

psql "$DB" -At <<'SQL'
select json_build_object(
  'exported_at', now(),
  'assets', (select coalesce(json_agg(a order by a.created_at), '[]') from assets a),
  'asset_categories', (select coalesce(json_agg(c order by c.sort_order), '[]') from asset_categories c),
  'asset_productions', (select coalesce(json_agg(p), '[]') from asset_productions p),
  'task_assets', (select coalesce(json_agg(t), '[]') from task_assets t),
  -- Data Asset Report: tiap pemakaian aset + status desain task (dasar hitungan Approved/Profile only/Reject).
  'asset_report', (select coalesce(json_agg(r), '[]') from (
     select a.id as asset_id, a.title, a.canva_design_id, c.name as category,
            ta.task_id, t.name as task_name, ta.pages, ta.created_at as applied_at,
            ds.display_name as design_status, pu.name as production
     from task_assets ta
     join assets a on a.id = ta.asset_id
     join asset_categories c on c.id = a.category_id
     join tasks t on t.id = ta.task_id
     left join design_statuses ds on ds.id = t.design_status_id
     left join production_units pu on pu.id = t.production_unit_id
     order by ta.created_at) r)
);
SQL
