# Session Handover Log — CAN-Freelance

Dokumen ini hanya memuat **status aktif** dan keputusan yang masih berlaku, agar murah dibaca di awal sesi (LLM: Claude, Gemini, GPT; editor: Claude Code, Cursor, VS Code, Antigravity).

**Riwayat lengkap** ada di [`archive/session-handover-through-2026-10-16.md`](archive/session-handover-through-2026-10-16.md) dan [`archive/session-handover-from-2026-10-17.md`](archive/session-handover-from-2026-10-17.md) (deploy VPS 2026-10-17). Jangan dibaca utuh; cari dengan `grep` bila butuh detail suatu fitur.

**Aturan menulis di sini**: simpan maksimal ±5 KB. Tambahkan entri sesi baru di bagian "Sesi Terakhir", lalu pindahkan entri lama ke `archive/` bila sudah melewati batas itu.

---

## 📌 Status Aktif

* **Branch**: `feat/canva-insights` = `feat/bundle-order-designer` + `feat/asset-library` (PR #9) + Canva Insights Fase 1–3 + Slide Master F1–F2. Sudah di-push ke `origin` (sinkron per 2026-10-31, `9e91b2e`); belum di-merge ke `main` · **Peran terakhir**: `🏛️ [Architecture & Knowledge Ops]`
* **Multi-Production**: Fase 1–8 sebagian besar selesai (Production Hub, platform per production, Dropbox File Request untuk Envato Elements, Bundle & Order Bundle, tarif per platform). Detail rencana: [`multi-production-plan.md`](multi-production-plan.md).
* **User Role Fase 1**: login ID + PIN 6 digit, role berbasis permission, Membership per ProductionUnit, "Lihat sebagai", halaman `/user-role`, `/profile`. Spec: [`user-role-spec.md`](user-role-spec.md). `AUTH_MODE=session` aktif di `.env` lokal dan VPS Biznet GIO.
* **Sidebar**: pindah ke `layout.tsx` (`AppSidebar`), grup dropdown gaya pohon. Pola baku: [`sidebar-dropdown-pattern.md`](sidebar-dropdown-pattern.md).

## ⏳ Belum Selesai / Menunggu

* Ganti PIN admin `FT-001` (menunggu user).
* **Kode VPS**: `feat/canva-insights` `3ec9882` dirilis 2026-10-30 12:40 WIB (termasuk kolom F2 `tasks.dropbox_*`; `migrate diff` kosong). Backup: `~/db-backups/can-freelance-20261030-123858-pre-canva-insights-vps.dump`. 5 brand Canva sudah di-seed. Deploy: `VPS_SSH_PORT=2222 npm run deploy:vps`; env app di `.next/standalone/.env`.
* **Canva Insights sinkron 365 hari ke VPS** (extension 1.1.0, jadwal harian per profil; rencana `~/.claude/plans/spicy-scribbling-dahl.md`): Chital OK 2026-10-30 (1.335 template). Sisa: Zahra Art, Improstd, Antler, UICreative.net — tiap profil diarahkan ke `portal.fatchurbeny.com/can-freelance` + token VPS, jam 12.00/12.15/…. DB lokal tidak disalin. Cek %: `scratch/canva-insights-test/pct-check.ts <brandId> <from> <to>`.
* Tombol "Download all Statement" di `/billing-statement` mengarah ke `/api/billing/download-all` yang tidak ada (dan `<a>` tanpa basePath) → selalu 404.
* Print statement (`/billing-statement/print`) memanggil `window.print()` otomatis.
* Escape saat dropdown terbuka di drawer `/user-role` menutup seluruh drawer (isian hilang).
* Sync `Dropbox Link` ke Notion (perlu file diunggah ke File Request). Dropbox VPS sehat (cek 2026-10-29: refresh token OK, scope termasuk `files.content.write` ada di lokal & VPS).
* Tab Email Notifications & Overview di production Elements masih konten Canva. Kanban per platform masih didiskusikan.
* Impor katalog Notion "Canva Assets" belum dijalankan di VPS (VPS kini 142 aset).
* Backlog: [Role kustom & matriks](../backlog/custom-roles-matrix.md), [Design Brief autosave](../backlog/task-drawer-design-brief-autosave.md). [Master Deck Builder](../backlog/master-deck-builder.md) ⏸️ HOLD setelah F2 (arah: app macOS; detail `grep "Slide Master" archive/`).

## ⚠️ Gotcha yang Masih Berlaku

* **DB lokal dipakai bersama semua branch/worktree.** `db push` dari branch yang skemanya tidak memuat tabel branch lain akan **menghapus** tabel itu (2026-10-28: tabel aset hilang, dipulihkan dari VPS). Sebelum `db push`, cek `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` tidak berisi `DROP`; bila ada, gabungkan branch dulu atau terapkan SQL aditif via `prisma db execute`.
* **Designer task bundle = designer order bundle** (sumber utama). Ganti hanya lewat drawer order di Billing Statement → Order Bundle (`updateBundleOrderDesignerAction`, ikut ubah semua task + Notion). `updateTaskFieldsAction` menolak designer berbeda, task drawer menampilkannya read-only, dan sync Notion tidak menimpa designer task bundle.
* Setelah `db push`, **restart dev server** (client Prisma lama memberi error "Unknown argument"). `deploy:vps` **tidak** menjalankan `db push`.
* Dropdown di dalam container `overflow-*` terpotong; render lewat portal `fixed`.
* Push body Notion memakai antrean in-memory per `pageId` (`src/lib/notion-body-push.ts`); efektif untuk 1 proses PM2, cluster >1 butuh lock DB.
* Ubah UI/role → perbarui wireframe: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL
* Env baru di VPS harus ditambahkan ke **`.next/standalone/.env`** (berlaku untuk `INSIGHTS_INGEST_TOKEN`).

## 📝 Sesi Terakhir

### 2026-10-31 — Audit knowledge graph (Claude, `🏛️ [Architecture & Knowledge Ops]`)
* `graph.json` dicek dengan `npm run graphify`: hasil identik dengan versi commit (333 node, 900 link), tidak perlu di-commit ulang. `tools/canva-insights-extension/` memang di luar cakupan parser (hanya `src/`).
* `index.md` diperbarui (Canva Insights Fase 1–3 + sinkron harian; Master Deck Builder F1–F2 selesai, HOLD). Entri sesi 2026-10-29 (Slide Master) dipindah ke `archive/session-handover-from-2026-10-17.md`.

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
