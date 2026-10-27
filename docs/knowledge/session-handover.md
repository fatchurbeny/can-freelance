# Session Handover Log — CAN-Freelance

Dokumen ini hanya memuat **status aktif** dan keputusan yang masih berlaku, agar murah dibaca di awal sesi (LLM: Claude, Gemini, GPT; editor: Claude Code, Cursor, VS Code, Antigravity).

**Riwayat lengkap** ada di [`archive/session-handover-through-2026-10-16.md`](archive/session-handover-through-2026-10-16.md) dan [`archive/session-handover-from-2026-10-17.md`](archive/session-handover-from-2026-10-17.md) (deploy VPS 2026-10-17). Jangan dibaca utuh; cari dengan `grep` bila butuh detail suatu fitur.

**Aturan menulis di sini**: simpan maksimal ±5 KB. Tambahkan entri sesi baru di bagian "Sesi Terakhir", lalu pindahkan entri lama ke `archive/` bila sudah melewati batas itu.

---

## 📌 Status Aktif

* **Branch**: `chore/knowledge-token-savings` (sudah dirilis ke VPS, belum di-merge ke `main`); `fix/vps-auth-gate` (healthcheck deploy, belum di-push) · **Peran terakhir**: `🛡️ [DevOps & Release]`, `🏛️ [Architecture & Knowledge Ops]`
* **Multi-Production**: Fase 1–8 sebagian besar selesai (Production Hub, platform per production, Dropbox File Request untuk Envato Elements, Bundle & Order Bundle, tarif per platform). Detail rencana: [`multi-production-plan.md`](multi-production-plan.md).
* **User Role Fase 1**: login ID + PIN 6 digit, role berbasis permission, Membership per ProductionUnit, "Lihat sebagai", halaman `/user-role`, `/profile`. Spec: [`user-role-spec.md`](user-role-spec.md). `AUTH_MODE=session` aktif di `.env` lokal dan VPS Biznet GIO.
* **Sidebar**: pindah ke `layout.tsx` (`AppSidebar`), grup dropdown gaya pohon. Pola baku: [`sidebar-dropdown-pattern.md`](sidebar-dropdown-pattern.md).

## ⏳ Belum Selesai / Menunggu

* Ganti PIN admin `FT-001` (menunggu user).
* Kode di VPS kini = working tree `feat/bundle-order-designer` (sebagian belum di-commit) → commit & merge ke `main`.
* Rilis berikutnya ke VPS perlu `prisma db push` manual (`TaskShareLink`, Notion Pages & Databases).
* Tombol "Download all Statement" di `/billing-statement` mengarah ke `/api/billing/download-all` yang tidak ada (dan `<a>` tanpa basePath) → selalu 404.
* Print statement (`/billing-statement/print`) memanggil `window.print()` otomatis.
* Escape saat dropdown terbuka di drawer `/user-role` menutup seluruh drawer (isian hilang).
* Sync `Dropbox Link` ke Notion (perlu file diunggah ke File Request).
* Tab Email Notifications & Overview di production Elements masih konten Canva.
* Kanban per platform masih didiskusikan.
* Backlog: [Resources Library](../backlog/resources-library.md) (jalur manual, tahap desain; model akses sudah diputuskan), [Role kustom & matriks](../backlog/custom-roles-matrix.md), [Design Brief autosave](../backlog/task-drawer-design-brief-autosave.md).

## ⚠️ Gotcha yang Masih Berlaku

* **Designer task bundle = designer order bundle** (sumber utama). Ganti hanya lewat drawer order di Billing Statement → Order Bundle (`updateBundleOrderDesignerAction`, ikut ubah semua task + Notion). `updateTaskFieldsAction` menolak designer berbeda, task drawer menampilkannya read-only, dan sync Notion tidak menimpa designer task bundle.
* Setelah `db push`, **restart dev server** (client Prisma lama memberi error "Unknown argument"). `deploy:vps` **tidak** menjalankan `db push`: rilis dengan perubahan skema perlu `prisma db push` manual di VPS.
* Dropdown di dalam container `overflow-*` terpotong; render lewat portal `fixed`.
* Push body Notion memakai antrean in-memory per `pageId` (`src/lib/notion-body-push.ts`); efektif untuk 1 proses PM2, cluster >1 butuh lock DB.
* Ubah UI/role → perbarui wireframe: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL

## 📝 Sesi Terakhir

### 2026-10-27 — Summary Order Bundle: nominal "menunggu task approved" (Claude Code, `🎨 [Frontend]` + `⚙️ [Backend]`)
* Aturan tetap: order bundle masuk payout hanya bila semua task approved (meski sudah Lunas). `getBundleOrdersForPeriod` kini mengembalikan `pendingTotal` (Payout Month = bulan ini, task belum semua approved).
* UI: kartu segmen "Order Bundle" dan header grup Payout Breakdown menampilkan "+ IDR x menunggu task approved"; baris order belum complete diberi badge amber. Belum dicek di browser (DB lokal mati), belum di-commit.

### 2026-10-25 — Model akses Asset Production & Asset Library (Claude Code, `🏛️ [Architecture & Knowledge Ops]`)
* Diputuskan (belum diimplementasi): permission baru `asset.view` (Admin, AD, PM, designer FT & FL) dan `asset.manage` (Admin semua; AD & PM production sendiri; library bersama hanya membership global). Aset/kategori punya `productionUnitId` opsional (terisi = Asset Production, null = Library). Dicatat di `user-role-spec.md` › Akses aset dan backlog `resources-library.md`. Tanpa perubahan kode.

### 2026-10-24 — Asset Library: jalur manual, tahap desain (Claude Code, `🏛️ [Architecture & Knowledge Ops]`)
* User memilih jalur **manual** (link edit + public view link, preview iframe `?embed`, tanpa Canva API/MFA). Rencana & skema di [`../backlog/resources-library.md`](../backlog/resources-library.md).
* Notion **opsi B** disetujui: app = input utama, database Notion "Asset Library" = mirror dua arah, relation "Assets" di database task untuk hitungan pemakaian.
* Desain 4 artboard: https://claude.ai/artifact/HKviEpNcfcL5V7MD3iYjLj. Belum ada kode/skema; menunggu review desain.

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
