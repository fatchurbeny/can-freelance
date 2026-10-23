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
* Backlog: [Resources Library](../backlog/resources-library.md) (ditunda, menunggu meeting soal MFA Canva), [Role kustom & matriks](../backlog/custom-roles-matrix.md), [Design Brief autosave](../backlog/task-drawer-design-brief-autosave.md).

## ⚠️ Gotcha yang Masih Berlaku

* **Designer task bundle = designer order bundle** (sumber utama). Ganti hanya lewat drawer order di Billing Statement → Order Bundle (`updateBundleOrderDesignerAction`, ikut ubah semua task + Notion). `updateTaskFieldsAction` menolak designer berbeda, task drawer menampilkannya read-only, dan sync Notion tidak menimpa designer task bundle.
* Setelah `db push`, **restart dev server** (client Prisma lama memberi error "Unknown argument").
* Dropdown di dalam container `overflow-*` terpotong; render lewat portal `fixed`.
* Push body Notion memakai antrean in-memory per `pageId` (`src/lib/notion-body-push.ts`); efektif untuk 1 proses PM2, cluster >1 butuh lock DB.
* Ubah UI/role → perbarui wireframe: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL

## 📝 Sesi Terakhir

### 2026-10-24 — Designer bisa download statement sendiri (Claude Code, `🎨 [Frontend & UI/UX]`)
* `OwnBillingView` (billing untuk role designer) kini punya tombol **Download Statement** → `/billing-statement/print?designerId=<milik sendiri>&paymentMonth=…` (tab baru). Guard di print page sudah membatasi `billing.view.own` ke `designerId` sendiri.
* Print page: Rate/Poll tidak lagi hardcode `15000` (pakai `priceFor`, `-` bila belum ada harga); payout 0 untuk designer `Resign` (sama dengan halaman billing).
* Print page kini memuat **Order Bundle** yang masuk payout bulan itu (`getBundleOrdersForPeriod` → `payoutByDesigner`, designer Resign = 0): tabel bundle + Subtotal Satuan/Bundle + Total; ringkasan Total Payout = satuan + bundle. `OwnBillingView` juga memakai `payoutByDesigner` agar total sama persis.
* Deretan chip bulan di `OwnBillingView` diganti dropdown (`billing/OwnMonthSelect.tsx`, pakai `SelectDropdown`, ubah `paymentMonth` di URL); default = bulan terbaru (`availableMonths[0]`). Diuji desktop + mobile 375px.
* Tombol pakai `next/link` (bukan `<a>`) agar basePath `/can-freelance` ikut; `<a>` biasa → 404.
* Diuji lokal (Admin "Lihat sebagai" Putery): tombol muncul, print Putery Sept-2026 = IDR 2.700.000 (sama dengan billing), print designer lain dialihkan. Tabel bundle belum teruji visual: satu-satunya order lokal (Slides-Colony) task-nya masih Draft. Belum di-commit.
* Catatan: panel Notion Sync di sidebar sudah admin-only (`integration.manage`); PM/AD multi-production = beberapa baris Membership (by design).

### 2026-10-20 — Drawer bersusun untuk Edit Design Brief (Claude Code, `🎨 [Frontend & UI/UX]`)
* Branch `feat/bundle-order-designer`. Komponen baru `task-detail/DesignBriefEditorDrawer.tsx` (portal ke `body`, 540px, kanan) berisi palette picker + `TaskBodyEditor`; helper `mergePaletteMarkdown` & `BRIEF_EDITOR_SHIFT_CLASS` (`min-[1100px]:right-[540px]`).
* Dipakai di `TaskDetailSheet` (via `DesignBriefSection`, `z-[60]`, autosave tetap debounce 1,5 dtk) dan `CreateTaskSlideModal` (`z-80`; tersimpan saat Save Task). Drawer utama kini hanya menampilkan preview (live) + tombol Edit, dan bergeser ke kiri saat editor terbuka. Di layar <1100px editor menimpa drawer utama.
* Escape saat editor terbuka hanya menutup editor (listener capture + `stopImmediatePropagation`).
* Diuji di browser lokal (1440px): kedua drawer, preview live, Escape.
* Section **Custom Fields** dihapus dari task drawer (permintaan user). `Task.customFields` tetap disimpan & disinkron dari Notion, hanya tidak ditampilkan.
* Tombol **Acak** di kartu Color Palette (preview brief, hanya role `task.edit`): `shufflePaletteMarkdown` di `brief-parser.ts` mengacak urutan hex lalu menulis ulang baris `Swatches` + role (Primary, Accent, Secondary, Neutral, Background). Di task drawer langsung tersimpan (autosave + push Notion); di buat task tersimpan saat Save Task. Diuji di drawer buat task.
* Semua belum di-commit (user cek sendiri dulu).
* **Dirilis ke VPS 2026-10-20** (`npm run deploy:vps`, `🛡️ [DevOps & Release]`) dari working tree `feat/bundle-order-designer` termasuk perubahan di atas yang belum di-commit; healthcheck gerbang login lolos. Tanpa perubahan skema Prisma.

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
