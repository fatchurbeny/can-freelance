# Session Handover Log — CAN-Freelance

Dokumen ini hanya memuat **status aktif** dan keputusan yang masih berlaku, agar murah dibaca di awal sesi (LLM: Claude, Gemini, GPT; editor: Claude Code, Cursor, VS Code, Antigravity).

**Riwayat lengkap** (semua sesi sampai 2026-10-16) ada di [`archive/session-handover-through-2026-10-16.md`](archive/session-handover-through-2026-10-16.md). Jangan dibaca utuh; cari dengan `grep` bila butuh detail suatu fitur.

**Aturan menulis di sini**: simpan maksimal ±5 KB. Tambahkan entri sesi baru di bagian "Sesi Terakhir", lalu pindahkan entri lama ke `archive/` bila sudah melewati batas itu.

---

## 📌 Status Aktif

* **Branch**: `chore/knowledge-token-savings` (sudah dirilis ke VPS, belum di-merge ke `main`) · **Peran terakhir**: `🛡️ [DevOps & Release]`, `🏛️ [Architecture & Knowledge Ops]`
* **Multi-Production**: Fase 1–8 sebagian besar selesai (Production Hub, platform per production, Dropbox File Request untuk Envato Elements, Bundle & Order Bundle, tarif per platform). Detail rencana: [`multi-production-plan.md`](multi-production-plan.md).
* **User Role Fase 1**: login ID + PIN 6 digit, role berbasis permission, Membership per ProductionUnit, "Lihat sebagai", halaman `/user-role`, `/profile`. Spec: [`user-role-spec.md`](user-role-spec.md). `AUTH_MODE=session` aktif di `.env` lokal dan VPS Biznet GIO.
* **Sidebar**: pindah ke `layout.tsx` (`AppSidebar`), grup dropdown gaya pohon. Pola baku: [`sidebar-dropdown-pattern.md`](sidebar-dropdown-pattern.md).

## ⏳ Belum Selesai / Menunggu

* Ganti PIN admin `FT-001` (menunggu user).
* Pastikan Nginx Basic Auth di VPS (`portal.fatchurbeny.com.conf`) sudah dimatikan agar freelance bisa menjangkau `/login` — dihapus dari daftar oleh sesi 2026-10-17 tanpa catatan perubahan Nginx; belum diverifikasi.
* Merge `chore/knowledge-token-savings` ke `main` (kode yang berjalan di VPS saat ini).
* **Analisa 2026-10-18 (Claude Code)**: (1) gerbang login di VPS kemungkinan tidak aktif — `/can-freelance` 307 ke unit & `/production` 200 tanpa sesi; cek `AUTH_MODE`/`SESSION_SECRET` terbaca PM2 (`.env` dikecualikan dari tar, standalone membaca `.env` di `.next/standalone/`). Di lokal gerbang berfungsi. (2) graphify: **diperbaiki** (lihat sesi 2026-10-18).
* Belum diuji di browser: edit keanggotaan multi-baris, Reset PIN/Nonaktifkan dari `/user-role`; print/download statement dengan bundle; simpan toggle `isAgency`.
* Sync `Dropbox Link` ke Notion (perlu file diunggah ke File Request).
* Tab Email Notifications & Overview di production Elements masih konten Canva.
* Kanban per platform masih didiskusikan.
* Backlog: [Resources Library](../backlog/resources-library.md) (ditunda, menunggu meeting soal MFA Canva), [Role kustom & matriks](../backlog/custom-roles-matrix.md), [Design Brief autosave](../backlog/task-drawer-design-brief-autosave.md).

## ⚠️ Gotcha yang Masih Berlaku

* Setelah `db push`, **restart dev server** (client Prisma lama memberi error "Unknown argument").
* Dropdown di dalam container `overflow-*` terpotong; render lewat portal `fixed`.
* Push body Notion memakai antrean in-memory per `pageId` (`src/lib/notion-body-push.ts`); efektif untuk 1 proses PM2, cluster >1 butuh lock DB.
* Ubah UI/role → perbarui wireframe: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL

## 📝 Sesi Terakhir

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

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
