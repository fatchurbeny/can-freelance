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
* Setelah `db push`, **restart dev server** (client Prisma lama memberi error "Unknown argument"). `deploy:vps` **tidak** menjalankan `db push`: rilis dengan perubahan skema perlu `prisma db push` manual di VPS.
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

### 2026-10-24 — Field Notion dinamis per production, putaran 1 (Claude Code, `⚙️ [Backend & Database]`)
* Production yang baru ditambahkan (wizard, buat database, atau ganti database di Edit Production) otomatis terdaftar di Notion Config → Databases (`registerNotionDatabase`). Halaman Notion Config dipertahankan. Backfill SC-Element & SC-Canva baru dilakukan di DB lokal, **VPS belum**.
* Skema baru: `ProductionUnit.disabledFields`, model `ProductionField`. Detail di `entities.md` dan `data-flows.md` (bagian "Nama Properti & Field Tambahan").
* Semua push ke Notion kini memakai `resolveWriteName` + `fieldMapping`. Dicek read-only: untuk ketiga production, nama properti sama persis dengan nama lama.
* Edit Production: bagian "Struktur Field" (pilih nama properti, matikan field opsional) dan "Field Tambahan" (tambah field → dibuat di Notion, ganti nama, baca ulang skema, buat ulang yang hilang). Task drawer & modal buat task: section "Field Tambahan" per tipe (`custom-fields/*`), baris field inti yang dimatikan disembunyikan.
* Task drawer kini memanggil `fetchTaskMetadataOptionsAction(task.productionUnitId)`, sehingga daftar doctype/akun ikut platform production.
* Pembagian field disetujui user: wajib = name, designer, doctype, designStatus, pages, qtySubmit, payrollMonth; disarankan = taskMonth, brand.
* Desain: https://claude.ai/artifact/8vPphPxA2HkpuGhdomBXpR. **Putaran 2 belum**: langkah wizard "Struktur Field" + filter board untuk field `filterable`.
* Diuji di browser lokal, data uji sudah dikembalikan:
  * Struktur Field: mematikan Priority di SC-Canva → baris Priority hilang dari task drawer. Dropdown portal dan Escape bekerja.
  * Baca ulang skema dan menampilkan field tambahan di task drawer.
  * Drawer Tambah Field: opsi hanya muncul untuk tipe select; Escape hanya menutup drawer itu.
  * `Upload Link`/`Dropbox Link` dikecualikan dari field tambahan (`APP_MANAGED_PROPERTIES`).
* **Uji tulis ke Notion lolos** di production uji `UJI Field Dinamis` (database di page "Impro-Freelance"; sudah diarsipkan). Yang diuji:
  * buat field Select & Tanggal → properti muncul di Notion
  * buat task dengan nilai field → nilai masuk Notion
  * edit dari drawer → nilai masuk Notion
  * ubah di Notion + sync incremental → app ikut berubah
  * ganti nama field → nama di Notion dan key `customFields` ikut berganti
* Database uji di Notion dan barisnya di Notion Config → Databases boleh dihapus manual.
* **Notion Config → Pages & Databases** (pengganti halaman Databases, tabel gaya Production Hub, copy Bahasa Indonesia): daftar page induk (`NotionPage`, default = Impro-Freelance) + database terdaftar. Status arsip database milik production mengikuti production (Production Hub); Arsipkan/Pulihkan hanya untuk database tanpa production. Halaman Notion Config responsif (2 kolom mulai `xl`). `NotionConfig.defaultParentPageId` dihapus. Lokal: test, test-1, test-2 didaftarkan lewat Pindai (Belum dipakai, tidak diarsipkan). VPS perlu `db push` + isi page.
* Belum di-commit.

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
