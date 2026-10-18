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
* Merge `chore/knowledge-token-savings` ke `main` (kode yang berjalan di VPS saat ini).
* Tombol "Download all Statement" di `/billing-statement` mengarah ke `/api/billing/download-all` yang tidak ada (dan `<a>` tanpa basePath) → selalu 404.
* Print statement (`/billing-statement/print`) tidak memuat payout bundle; begitu order bundle completed, total di halaman billing akan lebih besar dari total print. Print juga memanggil `window.print()` otomatis.
* Escape saat dropdown terbuka di drawer `/user-role` menutup seluruh drawer (isian hilang).
* Sync `Dropbox Link` ke Notion (perlu file diunggah ke File Request).
* Tab Email Notifications & Overview di production Elements masih konten Canva.
* Kanban per platform masih didiskusikan.
* Backlog: [Resources Library](../backlog/resources-library.md) (ditunda, menunggu meeting soal MFA Canva), [Role kustom & matriks](../backlog/custom-roles-matrix.md), [Design Brief autosave](../backlog/task-drawer-design-brief-autosave.md).

## ⚠️ Gotcha yang Masih Berlaku

* **Designer task bundle = designer order bundle** (sumber utama). Ganti hanya lewat drawer order di Billing Statement → Order Bundle (`updateBundleOrderDesignerAction`, ikut ubah semua task + Notion). `updateTaskFieldsAction` menolak designer berbeda, task drawer menampilkannya read-only, dan sync Notion tidak menimpa designer task bundle.
* Setelah `db push`, **restart dev server** (client Prisma lama memberi error "Unknown argument").
* Dropdown di dalam container `overflow-*` terpotong; render lewat portal `fixed`.
* Push body Notion memakai antrean in-memory per `pageId` (`src/lib/notion-body-push.ts`); efektif untuk 1 proses PM2, cluster >1 butuh lock DB.
* Ubah UI/role → perbarui wireframe: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL

## 📝 Sesi Terakhir

### 2026-10-18 — Healthcheck gerbang login di deploy (Claude Code, `🛡️ [DevOps & Release]`)
* Cek live 2026-10-18 (sesi lain): gerbang login VPS **sudah aktif** — `/can-freelance` & `/production` → 307 ke `/can-freelance/login`, `/login` → 200 tanpa `WWW-Authenticate` (Basic Auth Nginx sudah mati), API → 401. Cara deploy memuat `.env` tidak diubah.
* `scripts/deploy-vps.sh`: healthcheck loopback kini mewajibkan `/can-freelance/production` tanpa cookie → 307 ke `/can-freelance/login` dan `/can-freelance/api/notion/databases` → 401 (retry 10×2 dtk); selain itu exit 1. Dulu 200/307/401 dari `/can-freelance` dianggap lolos. Diuji lokal (dev 3002); belum dijalankan ke VPS.
* Temuan: rilis standalone ikut membawa `backups/*.dump` (dump DB lokal), `CLAUDE.md`, `Dockerfile` karena output tracing. Belum ditangani.

### 2026-10-18 — Graphify auto-discovery & Knowledge Graph hanya lokal (Claude Code) — detail di archive.
* Lanjutan (branch `chore/kg-stats-api-review`): statistik header Knowledge Graph dihitung dari `graph.json`. `/api/palette/strip` & `/api/uploads/[filename]` sengaja publik (diambil Notion tanpa cookie); uploads kini hanya melayani webp/png/jpg + `nosniff`.
* Uji browser lokal: edit keanggotaan multi-baris, Reset PIN, Nonaktifkan, dan toggle `isAgency` lolos. Fix: ganti role di drawer tidak lagi me-reset production ke unit pertama. Akun uji `FL-002` (QA Test Lokal, nonaktif) ada di DB lokal.

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
