# Session Handover Log — CAN-Freelance

Dokumen ini hanya memuat **status aktif** dan keputusan yang masih berlaku, agar murah dibaca di awal sesi (LLM: Claude, Gemini, GPT; editor: Claude Code, Cursor, VS Code, Antigravity).

**Riwayat lengkap** ada di [`archive/session-handover-through-2026-10-16.md`](archive/session-handover-through-2026-10-16.md) dan [`archive/session-handover-from-2026-10-17.md`](archive/session-handover-from-2026-10-17.md) (deploy VPS 2026-10-17). Jangan dibaca utuh; cari dengan `grep` bila butuh detail suatu fitur.

**Aturan menulis di sini**: simpan maksimal ±5 KB. Tambahkan entri sesi baru di bagian "Sesi Terakhir", lalu pindahkan entri lama ke `archive/` bila sudah melewati batas itu.

---

## 📌 Status Aktif

* **Branch**: `feat/canva-insights` = `feat/bundle-order-designer` + merge `feat/asset-library` (PR #9) + Canva Insights Fase 1. Belum di-push, belum di-merge ke `main` · **Peran terakhir**: `⚙️ [Backend & Database]`, `🔄 [API & Notion Integration]`
* **Multi-Production**: Fase 1–8 sebagian besar selesai (Production Hub, platform per production, Dropbox File Request untuk Envato Elements, Bundle & Order Bundle, tarif per platform). Detail rencana: [`multi-production-plan.md`](multi-production-plan.md).
* **User Role Fase 1**: login ID + PIN 6 digit, role berbasis permission, Membership per ProductionUnit, "Lihat sebagai", halaman `/user-role`, `/profile`. Spec: [`user-role-spec.md`](user-role-spec.md). `AUTH_MODE=session` aktif di `.env` lokal dan VPS Biznet GIO.
* **Sidebar**: pindah ke `layout.tsx` (`AppSidebar`), grup dropdown gaya pohon. Pola baku: [`sidebar-dropdown-pattern.md`](sidebar-dropdown-pattern.md).

## ⏳ Belum Selesai / Menunggu

* Ganti PIN admin `FT-001` (menunggu user).
* **Kode VPS**: `feat/asset-library` `23736dd` dirilis 2026-10-25, lalu working tree `feat/bundle-order-designer` dirilis 2026-10-27 (tanpa kode Asset Library). Rilis berikutnya sebaiknya dari `feat/canva-insights` (berisi keduanya) + SQL aditif hasil `prisma migrate diff` (tabel Canva, `accounts.canva_brand_id`; `bundle_contracts`/`contract_id` bila belum ada) + `INSIGHTS_INGEST_TOKEN`.
* Backup DB VPS: `~/db-backups/can-freelance-20261025-130650-pre-unique-design.dump`. **SSH VPS juga di port 2222**: deploy `VPS_SSH_PORT=2222 npm run deploy:vps`. Env app VPS ada di `.next/standalone/.env` (tidak ada `.env` di root app).
* Tombol "Download all Statement" di `/billing-statement` mengarah ke `/api/billing/download-all` yang tidak ada (dan `<a>` tanpa basePath) → selalu 404.
* Print statement (`/billing-statement/print`) memanggil `window.print()` otomatis.
* Escape saat dropdown terbuka di drawer `/user-role` menutup seluruh drawer (isian hilang).
* Sync `Dropbox Link` ke Notion (perlu file diunggah ke File Request). Dropbox VPS: `invalid_client` di log.
* Tab Email Notifications & Overview di production Elements masih konten Canva. Kanban per platform masih didiskusikan.
* Impor katalog Notion "Canva Assets" belum dijalankan di VPS (VPS kini 142 aset).
* Backlog: [Role kustom & matriks](../backlog/custom-roles-matrix.md), [Design Brief autosave](../backlog/task-drawer-design-brief-autosave.md).

## ⚠️ Gotcha yang Masih Berlaku

* **DB lokal dipakai bersama semua branch/worktree.** `db push` dari branch yang skemanya tidak memuat tabel branch lain akan **menghapus** tabel itu (2026-10-28: tabel aset hilang, dipulihkan dari VPS). Sebelum `db push`, cek `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` tidak berisi `DROP`; bila ada, gabungkan branch dulu atau terapkan SQL aditif via `prisma db execute`.
* **Designer task bundle = designer order bundle** (sumber utama). Ganti hanya lewat drawer order di Billing Statement → Order Bundle (`updateBundleOrderDesignerAction`, ikut ubah semua task + Notion). `updateTaskFieldsAction` menolak designer berbeda, task drawer menampilkannya read-only, dan sync Notion tidak menimpa designer task bundle.
* Setelah `db push`, **restart dev server** (client Prisma lama memberi error "Unknown argument"). `deploy:vps` **tidak** menjalankan `db push`.
* Dropdown di dalam container `overflow-*` terpotong; render lewat portal `fixed`.
* Push body Notion memakai antrean in-memory per `pageId` (`src/lib/notion-body-push.ts`); efektif untuk 1 proses PM2, cluster >1 butuh lock DB.
* Ubah UI/role → perbarui wireframe: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL
* Env baru di VPS harus ditambahkan ke **`.next/standalone/.env`** (berlaku untuk `INSIGHTS_INGEST_TOKEN`).

## 📝 Sesi Terakhir

### 2026-10-28 — Canva Insights Fase 1 + merge Asset Library (Claude Code, `⚙️ [Backend & Database]` + `🔄 [API & Notion Integration]` + `🏛️ [Knowledge Ops]`)
* Spek: [`canva-insights-spec.md`](canva-insights-spec.md), brief: [`../backlog/canva-insights-implementation.md`](../backlog/canva-insights-implementation.md), mapping field: [`../canva-insights-endpoints.md`](../canva-insights-endpoints.md).
* `fccb674`: 6 model `Canva*` + `Account.canvaBrandId`, `src/lib/canva-insights/*`, route `/api/insights/{ingest,runs,known-ids}`, action `canva-insights.ts`, script `seed-canva-brands.ts` & `import-canva-insights.ts`. Parser lolos 4 fixture (total breakdowns = acuan brief), data rusak & brand asing ditolak.
* `b5d4a03`: merge `feat/asset-library` (konflik skema = gabung kedua sisi; `user-role-spec` Akses aset = versi asset-library). `tsc` lolos.
* DB lokal: skema gabungan diterapkan lewat SQL aditif (tanpa DROP). Data aset dipulihkan dari VPS (`pg_dump --data-only` `asset_categories` + `assets`: 7 + 142 baris), `notion_databases.purpose = asset_library` dipasang ulang di "Asset Library". 1 baris `asset_productions` lokal (data uji) tidak bisa dipulihkan.
* **Fase 1 terverifikasi di DB lokal**: 5 brand ter-seed (Chital = akun "Chital Graphic"), 4 fixture diimpor, total breakdowns = acuan brief, impor ulang idempoten, batch rusak `REJECTED` tanpa perubahan data, API HTTP 200/401/403/413/422 sesuai. `INSIGHTS_INGEST_TOKEN` lokal ditambahkan ke `.env`.
* **Tautan task**: link task = `canva.link` ke desain kerja, bukan desain sumber `I` → `design_id` 0/200. Aturan judul diperluas (nama task + satu kata jenis): 21 tertaut, 0 ambigu. Detail spek §6.
* **Berikutnya**: Fase 2 (collector Playwright, uji 1 brand bersama user). Fixture Chital belum ada.
* Fase 3 wajib: jangan jumlahkan `audience = "ALL"` bersama `B`/`C` (spek §4).

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
