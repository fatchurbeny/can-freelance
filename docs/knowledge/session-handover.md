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
* Tombol "Download all Statement" di `/billing-statement` mengarah ke `/api/billing/download-all` yang tidak ada (dan `<a>` tanpa basePath) → selalu 404.
* Print statement (`/billing-statement/print`) memanggil `window.print()` otomatis.
* Escape saat dropdown terbuka di drawer `/user-role` menutup seluruh drawer (isian hilang).
* Sync `Dropbox Link` ke Notion (perlu file diunggah ke File Request).
* Tab Email Notifications & Overview di production Elements masih konten Canva.
* Kanban per platform masih didiskusikan.
* Asset Library (`feat/asset-library`): uji tulis Notion, commit, merge. Backlog: [Resources Library](../backlog/resources-library.md) jalur API (ditunda, MFA Canva), [Role kustom & matriks](../backlog/custom-roles-matrix.md), [Design Brief autosave](../backlog/task-drawer-design-brief-autosave.md).

## ⚠️ Gotcha yang Masih Berlaku

* **Designer task bundle = designer order bundle** (sumber utama). Ganti hanya lewat drawer order di Billing Statement → Order Bundle (`updateBundleOrderDesignerAction`, ikut ubah semua task + Notion). `updateTaskFieldsAction` menolak designer berbeda, task drawer menampilkannya read-only, dan sync Notion tidak menimpa designer task bundle.
* Setelah `db push`, **restart dev server** (client Prisma lama memberi error "Unknown argument"). `deploy:vps` **tidak** menjalankan `db push`: rilis dengan perubahan skema perlu `prisma db push` manual di VPS.
* Dropdown di dalam container `overflow-*` terpotong; render lewat portal `fixed`.
* Push body Notion memakai antrean in-memory per `pageId` (`src/lib/notion-body-push.ts`); efektif untuk 1 proses PM2, cluster >1 butuh lock DB.
* Ubah UI/role → perbarui wireframe: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL

## 📝 Sesi Terakhir

### 2026-10-24 — Asset Library, Notion Config bertab, kontrak platform & bundle (Claude Code, `⚙️ [Backend & Database]`, `🎨 [Frontend & UI/UX]`, `🔄 [API & Notion Integration]`)
* Branch `feat/asset-library` (worktree `.claude/worktrees/asset-library`); commit `4d01967` + perubahan lanjutan **belum di-commit**. Rincian lengkap di arsip `archive/session-handover-from-2026-10-17.md`.
* Asset Library (`/assets`, mirror Notion, picker di Design Brief, Production multi-select hanya platform Canva), Notion Config satu halaman bertab, kontrak platform di Rate Card → Kontrak (periode preset 3/6/12 bulan atau Custom + hari kerja Sen–Jum; info field via ikon ⓘ `InfoTip` di semua form: wizard, User, Asset, Doctype, Core field — aturan `form-crud-rules.md` §9), **Trial → Kontrak bundle** via `BundleContract`. Production Hub: kolom Designer (punya task di production) & Doctype (aktif per platform). Overview: tab "Tanpa Brand" untuk task tanpa akun (issues #35). Aturan: `business-rules.md`; modul: `modules.md`; entitas: `entities.md`.
* Skema lokal diterapkan lewat SQL tambahan saja (tabel `task_share_links` sesi lain jangan terhapus). **VPS perlu `prisma db push`**.
* Notion: database "Asset Library" di Impro-Freelance (uji) + relation `Assets` hanya di SC-Canva. Belum diuji: drawer Jadikan Kontrak bundle di browser (tak ada trial approved lokal), brief → relation `Assets`, gating role "Lihat sebagai". Wireframe role belum diperbarui.

### 2026-10-24 — Share link publik task (Claude Code, `⚙️ [Backend & Database]` + `🎨 [Frontend & UI/UX]`)
* Model `TaskShareLink` + permission `task.share` (Admin, AD, PM); halaman publik `/share/t/[token]` (view-only, dikecualikan dari proxy). Di-merge ke `feat/asset-library`. Rincian di arsip.

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
