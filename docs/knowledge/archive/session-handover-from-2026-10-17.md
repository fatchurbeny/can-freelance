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

### 2026-10-18 — Graphify auto-discovery & Knowledge Graph hanya lokal (Claude Code) — detail di archive.
* Lanjutan (branch `chore/kg-stats-api-review`): statistik header Knowledge Graph dihitung dari `graph.json`. `/api/palette/strip` & `/api/uploads/[filename]` sengaja publik (diambil Notion tanpa cookie); uploads kini hanya melayani webp/png/jpg + `nosniff`.
* Uji browser lokal: edit keanggotaan multi-baris, Reset PIN, Nonaktifkan, dan toggle `isAgency` lolos. Fix: ganti role di drawer tidak lagi me-reset production ke unit pertama. Akun uji `FL-002` (QA Test Lokal, nonaktif) ada di DB lokal.

### 2026-10-18 — Healthcheck gerbang login di deploy (Claude Code, `🛡️ [DevOps & Release]`)
* Cek live 2026-10-18 (sesi lain): gerbang login VPS **sudah aktif** — `/can-freelance` & `/production` → 307 ke `/can-freelance/login`, `/login` → 200 tanpa `WWW-Authenticate` (Basic Auth Nginx sudah mati), API → 401. Cara deploy memuat `.env` tidak diubah.
* `scripts/deploy-vps.sh`: healthcheck loopback kini mewajibkan `/can-freelance/production` tanpa cookie → 307 ke `/can-freelance/login` dan `/can-freelance/api/notion/databases` → 401 (retry 10×2 dtk); selain itu exit 1. Dulu 200/307/401 dari `/can-freelance` dianggap lolos. Diuji lokal (dev 3002); belum dijalankan ke VPS.
* Temuan: rilis standalone ikut membawa `backups/*.dump` (dump DB lokal), `CLAUDE.md`, `Dockerfile` karena output tracing. Belum ditangani.

### 2026-10-20 — Drawer bersusun untuk Edit Design Brief (Claude Code, `🎨 [Frontend & UI/UX]`)
* Branch `feat/bundle-order-designer`. Komponen baru `task-detail/DesignBriefEditorDrawer.tsx` (portal ke `body`, 540px, kanan) berisi palette picker + `TaskBodyEditor`; helper `mergePaletteMarkdown` & `BRIEF_EDITOR_SHIFT_CLASS` (`min-[1100px]:right-[540px]`).
* Dipakai di `TaskDetailSheet` (via `DesignBriefSection`, `z-[60]`, autosave tetap debounce 1,5 dtk) dan `CreateTaskSlideModal` (`z-80`; tersimpan saat Save Task). Drawer utama kini hanya menampilkan preview (live) + tombol Edit, dan bergeser ke kiri saat editor terbuka. Di layar <1100px editor menimpa drawer utama.
* Escape saat editor terbuka hanya menutup editor (listener capture + `stopImmediatePropagation`).
* Diuji di browser lokal (1440px): kedua drawer, preview live, Escape.
* Section **Custom Fields** dihapus dari task drawer (permintaan user). `Task.customFields` tetap disimpan & disinkron dari Notion, hanya tidak ditampilkan.
* Tombol **Acak** di kartu Color Palette (preview brief, hanya role `task.edit`): `shufflePaletteMarkdown` di `brief-parser.ts` mengacak urutan hex lalu menulis ulang baris `Swatches` + role (Primary, Accent, Secondary, Neutral, Background). Di task drawer langsung tersimpan (autosave + push Notion); di buat task tersimpan saat Save Task. Diuji di drawer buat task.
* Semua belum di-commit (user cek sendiri dulu).
* **Dirilis ke VPS 2026-10-20** (`npm run deploy:vps`, `🛡️ [DevOps & Release]`) dari working tree `feat/bundle-order-designer` termasuk perubahan di atas yang belum di-commit; healthcheck gerbang login lolos. Tanpa perubahan skema Prisma.
