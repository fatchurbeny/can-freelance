# Session Handover Log — CAN-Freelance

Dokumen ini hanya memuat **status aktif** dan keputusan yang masih berlaku, agar murah dibaca di awal sesi (LLM: Claude, Gemini, GPT; editor: Claude Code, Cursor, VS Code, Antigravity).

**Riwayat lengkap** ada di [`archive/session-handover-through-2026-10-16.md`](archive/session-handover-through-2026-10-16.md) dan [`archive/session-handover-from-2026-10-17.md`](archive/session-handover-from-2026-10-17.md) (deploy VPS 2026-10-17). Jangan dibaca utuh; cari dengan `grep` bila butuh detail suatu fitur.

**Aturan menulis di sini**: simpan maksimal ±5 KB. Tambahkan entri sesi baru di bagian "Sesi Terakhir", lalu pindahkan entri lama ke `archive/` bila sudah melewati batas itu.

---

## 📌 Status Aktif

* **Branch**: `feat/asset-library` (PR #9, Auto-fix aktif) **dirilis ke VPS 2026-10-25** (`48079e1`), belum di-merge ke `main` · **Peran terakhir**: `🛡️ [DevOps & Release]`
* **Multi-Production**: Fase 1–8 sebagian besar selesai (Production Hub, platform per production, Dropbox File Request untuk Envato Elements, Bundle & Order Bundle, tarif per platform). Detail rencana: [`multi-production-plan.md`](multi-production-plan.md).
* **User Role Fase 1**: login ID + PIN 6 digit, role berbasis permission, Membership per ProductionUnit, "Lihat sebagai", halaman `/user-role`, `/profile`. Spec: [`user-role-spec.md`](user-role-spec.md). `AUTH_MODE=session` aktif di `.env` lokal dan VPS Biznet GIO.
* **Sidebar**: pindah ke `layout.tsx` (`AppSidebar`), grup dropdown gaya pohon. Pola baku: [`sidebar-dropdown-pattern.md`](sidebar-dropdown-pattern.md).

## ⏳ Belum Selesai / Menunggu

* Ganti PIN admin `FT-001` (menunggu user).
* Kode di VPS = `feat/asset-library` `48079e1`. Backup DB sebelum rilis: `~/db-backups/can-freelance-20261025-130650-pre-unique-design.dump`. **SSH VPS kini juga di port 2222** (`/etc/systemd/system/ssh.socket.d/port.conf`) karena jaringan kantor & hotspot memblokir port 22 keluar: deploy `VPS_SSH_PORT=2222 npm run deploy:vps`.
* Tombol "Download all Statement" di `/billing-statement` mengarah ke `/api/billing/download-all` yang tidak ada (dan `<a>` tanpa basePath) → selalu 404.
* Print statement (`/billing-statement/print`) memanggil `window.print()` otomatis.
* Escape saat dropdown terbuka di drawer `/user-role` menutup seluruh drawer (isian hilang).
* Sync `Dropbox Link` ke Notion (perlu file diunggah ke File Request).
* Tab Email Notifications & Overview di production Elements masih konten Canva.
* Kanban per platform masih didiskusikan.
* Impor katalog Notion "Canva Assets" (sub-page Impro-Freelance; kini terbaca lewat Pindai) belum dijalankan di VPS.
* Asset Library di VPS terhubung ke database Notion "Asset Library" (121 aset); cek relation `Assets` per production di Notion Config. Dropbox VPS: `invalid_client` di log (cek kredensial).

## ⚠️ Gotcha yang Masih Berlaku

* **Designer task bundle = designer order bundle** (sumber utama). Ganti hanya lewat drawer order di Billing Statement → Order Bundle (`updateBundleOrderDesignerAction`, ikut ubah semua task + Notion). `updateTaskFieldsAction` menolak designer berbeda, task drawer menampilkannya read-only, dan sync Notion tidak menimpa designer task bundle.
* Setelah `db push`, **restart dev server** (client Prisma lama memberi error "Unknown argument"). `deploy:vps` **tidak** menjalankan `db push`: rilis dengan perubahan skema perlu `prisma db push` manual di VPS.
* Dropdown di dalam container `overflow-*` terpotong; render lewat portal `fixed`.
* Push body Notion memakai antrean in-memory per `pageId` (`src/lib/notion-body-push.ts`); efektif untuk 1 proses PM2, cluster >1 butuh lock DB.
* Ubah UI/role → perbarui wireframe: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL

## 📝 Sesi Terakhir

### 2026-10-25 — Rilis Asset Library lanjutan (Claude Code, `🎨 [Frontend & UI/UX]`, `🔄 [API & Notion Integration]`, `🛡️ [DevOps & Release]`)
* Sub-tab Notion Config (Asset Library / Pages & Databases / Sinkronisasi, `?sub=`), impor aset dari database Notion (+ perbarui judul & tag), `canva_design_id` unik, pindai database di sub-page, ikon & ilustrasi kategori (3D, Shape & Label), info field via `InfoTip`, preset periode kontrak, kolom Designer/Doctype di Production Hub, tab "Tanpa Brand" di Overview.
* Rincian sesi 2026-10-24 (Asset Library, kontrak, rilis pertama) dipindah ke arsip `archive/session-handover-from-2026-10-17.md`.
---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
