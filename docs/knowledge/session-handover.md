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
* **Kode VPS**: `feat/canva-insights` `4fe3b1a` (Asset Library + Bundle + Canva Insights + Slide Master F1 + fallback Notion) dirilis 2026-10-29 15:2x WIB; SQL aditif diterapkan (tabel Canva, `accounts.canva_brand_id`, `doctypes.qa_checklist` + isi checklist Doctype presentasi); `migrate diff` VPS ↔ skema = kosong. `INSIGHTS_INGEST_TOKEN` baru ditambahkan ke `.next/standalone/.env` VPS (ambil nilainya lewat SSH untuk extension). Brand Canva belum di-seed di VPS (`scripts/seed-canva-brands.ts`) → tab Canva Insights belum tampil di sana. Branch belum di-push.
* Backup DB VPS terakhir: `~/db-backups/can-freelance-20261029-151332-pre-slide-master-f1.dump`. **SSH VPS juga di port 2222**: deploy `VPS_SSH_PORT=2222 npm run deploy:vps`. Env app VPS ada di `.next/standalone/.env` (tidak ada `.env` di root app).
* Tombol "Download all Statement" di `/billing-statement` mengarah ke `/api/billing/download-all` yang tidak ada (dan `<a>` tanpa basePath) → selalu 404.
* Print statement (`/billing-statement/print`) memanggil `window.print()` otomatis.
* Escape saat dropdown terbuka di drawer `/user-role` menutup seluruh drawer (isian hilang).
* Sync `Dropbox Link` ke Notion (perlu file diunggah ke File Request). Dropbox VPS sehat (cek 2026-10-29: refresh token OK, scope termasuk `files.content.write` ada di lokal & VPS).
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

### 2026-10-29 — Slide Master Builder: rencana (commit `233671e`) + F1 Checklist QA (Claude, `⚙️ [Backend & Database]` + `🎨 [Frontend & UI/UX]` + `🔄 [API & Notion Integration]`)
* Rencana & keputusan: [`../backlog/master-deck-builder.md`](../backlog/master-deck-builder.md) · spec: [`../../design-handoff/IMPLEMENTATION-slide-master-builder.md`](../../design-handoff/IMPLEMENTATION-slide-master-builder.md) (§7 = status F1). Riwayat diskusi di arsip (`grep "Master Deck" archive/`).
* **F1 dibuat, belum di-commit**: kolom `Doctype.qaChecklist` (SQL aditif `prisma/sql/2026-10-29-doctype-qa-checklist.sql`, sudah dijalankan di DB lokal, **belum di VPS**); `src/lib/checklist-qa.ts` (parser/gerbang/status); `markdownToNotionBlocks` kini membuat blok `to_do`; gerbang QA → In Review di `updateTaskStatusAction` + `updateTaskFieldsAction`; section dibuat saat task dibuat / masuk QA / Doctype diganti saat Draft; autosave brief menyambung kembali section; `toggleChecklistItemAction` (baca checklist terbaru dari Notion sebelum push); UI: indikator kartu, tab Checklist QA (`ChecklistQASection.tsx`), editor di `DoctypeSlideModal`.
* Diverifikasi di port 3013 (`AUTH_MODE=off`): alur app (task `app_created_` "Trial Slides Colony") dan push/pull Notion (task Notion "Test Fase 6 Task"): to-do terkirim, centang Notion masuk lewat Sync Now, centang Notion tidak tertimpa saat app mencentang, section tetap di akhir setelah edit brief. Kedua task uji dikembalikan ke kondisi awal (DB + Notion). Batas: dalam 2 menit setelah push body, aksi centang tidak membaca Notion dulu.
* **Fallback Notion diperbaiki** (belum di-commit): `createTaskAction` dulu diam-diam menyimpan task `app_created_…` bila halaman Notion gagal dibuat. Kini pembuatan halaman ada di `createNotionTaskPage()` (qa.ts), kegagalan mengembalikan `notionWarning` (toast di modal buat task, duplikat, order bundle), drawer menampilkan banner + tombol **Buat di Notion** (`createMissingNotionPageAction`, aman dari klik ganda), dan sync Notion dilewati untuk task belum tertaut (`isNotionLinked`, `src/lib/notion-link.ts`). Diuji lewat tombol drawer pada "Trial Slides Colony" → tertaut ke `4080e19a-a135-81c6-90c6-ef3a6e6ed08a`; 2 halaman uji lain diarsipkan (Trash Notion). Jalur gagal saat membuat task baru belum diuji di UI.

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
