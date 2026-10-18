# Session Handover Log — CAN-Freelance

Dokumen ini hanya memuat **status aktif** dan keputusan yang masih berlaku, agar murah dibaca di awal sesi (LLM: Claude, Gemini, GPT; editor: Claude Code, Cursor, VS Code, Antigravity).

**Riwayat lengkap** (semua sesi sampai 2026-10-16) ada di [`archive/session-handover-through-2026-10-16.md`](archive/session-handover-through-2026-10-16.md). Jangan dibaca utuh; cari dengan `grep` bila butuh detail suatu fitur.

**Aturan menulis di sini**: simpan maksimal ±5 KB. Tambahkan entri sesi baru di bagian "Sesi Terakhir", lalu pindahkan entri lama ke `archive/` bila sudah melewati batas itu.

---

## 📌 Status Aktif

* **Branch**: `main` · **Peran terakhir**: `⚙️ [Backend & Database]`, `🎨 [Frontend & UI/UX]`, `🏛️ [Architecture & Knowledge Ops]`
* **Multi-Production**: Fase 1–8 sebagian besar selesai (Production Hub, platform per production, Dropbox File Request untuk Envato Elements, Bundle & Order Bundle, tarif per platform). Detail rencana: [`multi-production-plan.md`](multi-production-plan.md).
* **User Role Fase 1**: login ID + PIN 6 digit, role berbasis permission, Membership per ProductionUnit, "Lihat sebagai", halaman `/user-role`, `/profile`. Spec: [`user-role-spec.md`](user-role-spec.md). `AUTH_MODE=session` aktif di `.env` lokal.
* **Sidebar**: pindah ke `layout.tsx` (`AppSidebar`), grup dropdown gaya pohon. Pola baku: [`sidebar-dropdown-pattern.md`](sidebar-dropdown-pattern.md).

## ⏳ Belum Selesai / Menunggu

* Ganti PIN admin `FT-001` (menunggu user).
* Nginx Basic Auth di VPS harus dimatikan agar freelance bisa menjangkau `/login`.
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

### 2026-10-16 — Architecture & Knowledge Ops (Claude Code)
* Handover dipangkas dari 187 KB ke ringkasan ini untuk menghemat token awal sesi; isi lengkap dipindah ke `archive/`.
* Aturan baca di `CLAUDE.md` dan `index.md` diubah: baca `index.md` + bagian relevan saja, dan telusuri `graph.json` (via `jq`) untuk pertanyaan dampak/dependensi.
* Git `pre-commit` hook (`.githooks/pre-commit`, diaktifkan lewat script `prepare` → `core.hooksPath`) menjalankan `npm run graphify` dan hanya men-stage `graph.json` bila node/relasi berubah (abaikan `generatedAt`). Lewati dengan `SKIP_GRAPHIFY=1`. `graph.json` di-commit ke git.
* `AGENTS.md` (sumber aturan bersama) dan `.cursorrules` diperbarui dengan aturan baca-sesuai-kebutuhan + query `graph.json` via `jq`.
* Belum diuji: jalur "tidak ada perubahan" di hook secara end-to-end, dan hook di VPS (`npm install` menjalankan `prepare`).

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
