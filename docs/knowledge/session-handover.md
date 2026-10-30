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
* **Kode VPS**: `feat/canva-insights` `3ec9882` dirilis 2026-10-30 12:40 WIB (backup `~/db-backups/can-freelance-20261030-123858-pre-canva-insights-vps.dump`; kolom `tasks.dropbox_files/dropbox_folder_path/dropbox_scanned_at` ditambahkan, `migrate diff` kosong). 5 brand Canva sudah di-seed ke akun VPS. `INSIGHTS_INGEST_TOKEN` VPS ada di `.next/standalone/.env` (64 karakter). Branch belum di-push.
* **Canva Insights → VPS + sinkron harian** (rencana `~/.claude/plans/spicy-scribbling-dahl.md`): extension 1.1.0 (`alarms`, jadwal di Pengaturan, bawaan 12.00, susulan saat startup; tidak cocok-dengan-Canva = data basi sejak sinkron terakhir, bukan rumus). Langkah tersisa: rilis VPS + seed brand (sesi terpisah), lalu tiap profil diarahkan ke `portal.fatchurbeny.com/can-freelance` + token VPS, jam 12.00/12.15/…, dan sinkron 365 hari per brand ke VPS. **Progres VPS**: Chital 365 hari OK 2026-10-30 (1.335 template, 2.313 halaman, ±1,5 j; periode Sep sama persis dengan lokal). Sisa: Zahra Art, Improstd, Antler, UICreative.net. DB lokal tidak disalin. Extension kini menerima sesi Canva tanpa `x-canva-authz` (cookie saja). Cek %: `scratch/canva-insights-test/pct-check.ts <brandId> <from> <to>`.
* Backup DB VPS terakhir: `~/db-backups/can-freelance-20261030-123858-pre-canva-insights-vps.dump`. **SSH VPS juga di port 2222**: deploy `VPS_SSH_PORT=2222 npm run deploy:vps`. Env app VPS ada di `.next/standalone/.env` (tidak ada `.env` di root app).
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

### 2026-10-29 — Slide Master Builder F1 + F2, fallback Notion, rilis VPS (Claude, `⚙️ [Backend & Database]` + `🎨 [Frontend & UI/UX]` + `🔄 [API & Notion Integration]`)
* Rencana: [`../backlog/master-deck-builder.md`](../backlog/master-deck-builder.md) · spec + status per fase: [`../../design-handoff/IMPLEMENTATION-slide-master-builder.md`](../../design-handoff/IMPLEMENTATION-slide-master-builder.md) (§7). Detail sesi di arsip (`grep "Slide Master" archive/`).
* **F1** (Checklist QA per Doctype, gerbang In Review) + **fallback Notion** ("Buat di Notion") di-commit, dirilis ke VPS, PR fatchurbeny/can-freelance#10.
* **F2** (centang otomatis dari folder Dropbox: `src/lib/dropbox-checklist.ts`, kolom `tasks.dropbox_folder_path/dropbox_files/dropbox_scanned_at`): dibuat & diuji lokal; SQL `prisma/sql/2026-10-29-task-dropbox-scan.sql` **belum dijalankan di VPS**, belum dirilis. `markdownToNotionBlocks` kini di `src/lib/notion-body-blocks.ts`.
* **⏸️ HOLD (keputusan user 2026-10-29).** Arah yang dibahas sebelum hold: VPS (1 vCPU, RAM 961 MB, swap terpakai) **tidak cocok** untuk worker; builder jadi **app macOS terpisah** yang terhubung ke dashboard lewat API ber-token, membaca folder Dropbox lokal ("Available offline", akun App Folder yang sama), mencentang checklist otomatis penuh (validasi file + Master Slides), dan mengekspor ke `/_master/` lokal (Dropbox meng-upload). Keputusan terbuka: Mac stasiun mana, In Review otomatis atau diklik QA, ketersediaan Keynote/PowerPoint. Wireframe perlu page v3 (artboard 0 revisi kecil, Antrean digambar ulang sebagai jendela Mac, Review/Layout/Export diadaptasi, + menu bar/onboarding).

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
