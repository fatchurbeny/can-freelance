# Session Handover Archive — sejak 2026-10-17

Entri yang dipindah dari `session-handover.md`. Cari dengan `grep`; jangan dibaca utuh.

### 2026-10-18 — Graphify auto-discovery (Claude Code, `🏛️ [Architecture & Knowledge Ops]`)
* **Knowledge Graph hanya lokal**: `src/lib/dev-tools.ts` (`DEV_TOOLS_ENABLED` = bukan produksi). Di build produksi halaman `/knowledge-graph` & API → 404, menu disembunyikan, `graph.json` dikecualikan dari tar `deploy-vps.sh` (salinan lama di VPS tidak terhapus otomatis). Tambah `src/app/not-found.tsx` bergaya aplikasi. Fix fetch tanpa basePath di `GraphifyVisualizer` & `/content-access`. Diuji dengan `next build` + `next start` lokal.
* `graphify-parser.ts` kini menemukan otomatis: page/layout, semua `src/app/actions/*` (`action:`), route handler (`api:`), komponen di subfolder + yang ditaruh di `src/app`, semua `src/lib/*` (`lib:`), dan 25 model dari `schema.prisma`. Link dari import yang di-resolve ke file (termasuk `import()`), plus `prisma.<model>.` → `queries`. Link manual yang target-nya hilang dibuang dengan peringatan; script exit 1 bila gagal.
* Sebelumnya file `src/app/actions/*.ts` & `route.ts` tercatat salah sebagai `page:`; model `Brand`/`ContractRate`/`BillingStatement` (sudah tidak ada) dihapus. Hasil: 239 node, 545 link, semua model punya link; output deterministik.

### 2026-10-17 — DevOps & Release Deployment to Biznet GIO (Antigravity, `🛡️ [DevOps & Release]`)
* Production build Next.js 16 standalone sukses dikompilasi dari branch `chore/knowledge-token-savings`.
* Database PostgreSQL VPS Biznet GIO (`103.89.5.148`) dimigrasikan via `vps_migration_step.sql` (hanya di VPS, tidak ada di repo) + `prisma db push`: menambahkan tabel `platforms`, `production_units`, `dropbox_connections`, `bundles`, `bundle_items`, `bundle_orders`, `users`, `memberships`, `sessions`.
* Menjalankan backfill data awal idempoten (`scripts/backfill-multi-production.ts`): 316 tasks, 20 doctypes, 5 accounts terhubung ke Platform Canva & Production Unit Freelance Lamongan.
* Inisialisasi user Admin pertama `FT-001` via `scripts/create-admin.ts`.
* Rilis standalone diekstrak ke `/www/wwwroot/can-freelance-app/.next/standalone`, static chunks Nginx disinkronkan, upload persisten ditautkan (`storage/uploads`), dan reload PM2 berjalan zero-downtime.
* Verifikasi endpoint live via HTTPS Cloudflare: `/can-freelance` (307 redirect ke unit Lamongan), `/production` (200 OK), `/billing-statement` (200 OK).
