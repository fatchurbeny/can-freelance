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

### 2026-10-29 — Rencana Master Deck Builder (Claude, `🏛️ [Architecture & Knowledge Ops]`, tanpa perubahan kode)
* Rencana: task production **output Dropbox** yang masuk status QA otomatis diantrekan ke Master Deck (analisis .pptx/.pdf → review → rebuild slide master → simpan ke `/_master/` di folder task + properti Notion "Master Deck"). Production Canva tidak ikut. Flow: https://claude.ai/artifact/XoQAVhocSqm7r9cHjYMTMM · desain UI: https://claude.ai/artifact/5vK7jUxXuAWGWZDV76TETE
* Keputusan usulan: satu fungsi `enqueueMasterDeckJobs()` (dipanggil dari `updateTaskStatusAction`, akhir `syncNotionData`, Sync Now), idempotent per task + `content_hash`; file diambil via `files/list_folder` + `files/download` (scope `files.content.read` sudah ada); simpan `Task.dropboxFolderPath` saat `attachUploadRequest` (path dihitung dari nama/bulan task, meleset bila task di-rename); worker PM2 terpisah di VPS (python-pptx + LibreOffice); model `MasterDeckJob`; tab "Master Deck" di production Dropbox; permission `masterdeck.review`.
* Diputuskan user: checklist kartu (Preview, Master Slides, Keynote, PPT, PPTX; field checkbox Notion) jadi gerbang QA → In Review; PDF wajib; file satuan tanpa .zip. Catatan perbaikan: Dropbox VPS `invalid_client`, scope `files.content.write`. Rincian: [`../backlog/master-deck-builder.md`](../backlog/master-deck-builder.md).
* Lanjutan (sore): checklist disimpan di **body kartu Notion** (`## ✅ Checklist QA`, blok to-do), bukan properti database; kartu kanban hanya indikator n/5; detail di tab ketiga drawer (Design Brief · Checklist QA · Comments). Satu Slide Master Builder global untuk semua production Dropbox, filter Production + dibatasi Membership. **Design handoff**: [`../../design-handoff/IMPLEMENTATION-slide-master-builder.md`](../../design-handoff/IMPLEMENTATION-slide-master-builder.md) + wireframe di `design-handoff/slide-master-builder/`. Push to-do ke Notion (`markdownToNotionBlocks`) belum didukung.
* Dokumen dirapikan (malam, Claude, `🏛️ [Architecture & Knowledge Ops]`): backlog disamakan dengan spec (halaman global, tanpa properti/tab "Master Deck"); spec ditambah gerbang di **dua jalur** status (`updateTaskStatusAction` + dropdown `updateTaskFieldsAction`) via helper `assertChecklistAllowsStatus`, kind `checklist` di `orderBriefMarkdown`, autosave brief harus menjaga section checklist, risiko push seluruh body, permission `masterdeck.review`, backfill task lama. `Main.dc.html` disamakan dengan canvas `1793257954-053f`. **Diputuskan user**: item checklist **ikut Doctype** (kolom baru `Doctype.qaChecklist`, SQL aditif; Doctype presentasi = 5 item). F1 siap dimulai.

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
