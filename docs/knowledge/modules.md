# Architecture Modules & Component Tree — CAN-Freelance

Dokumen ini memetakan struktur modul aplikasi Next.js 16 (App Router), Server Actions, API Routes, dan Komponen React.

---

## 🗺️ Peta Rute Aplikasi (`src/app/`)

* **`/` (Dashboard Main)**: [src/app/page.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/page.tsx) — Overview KPI dashboard, grafik volume, workload desainer, dan distribusi status.
* **`/production`**: [src/app/production/page.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/production/page.tsx) — Board Kanban Produksi dengan filter multi-bulan, brand, dan status QA.
* **`/billing-statement`**: [src/app/billing-statement/page.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx) — Tabel persetujuan payroll desainer dan cetak otomatis billing statement.
* **`/knowledge-graph`**: [src/app/knowledge-graph/page.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/knowledge-graph/page.tsx) — Dashboard visual interaktif Knowledge Graph & penjelajah dokumen pengetahuan.
* **`/rate-card`**: Editor tarif kontrak desainer & doctype.
* **`/account-team`**: Manajemen desainer dan status keanggotaan.
* **`/notion-config`**: satu halaman dengan tab (gaya `ProductionTabNav`, tab aktif di `?tab=`): **Koneksi** (workspace, API key, panduan), **Pages & Databases** (`?tab=pages`; `/notion-config/databases` di-redirect ke sini), **Sinkronisasi** (metode/interval + riwayat `SyncLog`), **Asset Library**, **Email Notifikasi** (badge `!` bila Google perlu reconnect; kembali dari OAuth membuka tab ini). Komponen tab di `src/components/notion-config/`. Tombol *Sync Sekarang* mengirim event `notion-sync-request` ke `SyncButton` sidebar (satu alur & modal sync).
* **`/assets`**: Asset Library — tab kategori, cari judul/tag, grid kartu (cover = thumbnail Canva / upload), drawer detail (iframe `…/view?embed` tanpa login, Buka di Canva = link edit) dan drawer Tambah/Edit (`asset.manage`). Komponen di `src/components/assets/`; action `src/app/actions/assets.ts`; loader `src/lib/asset-library.ts`.
* **Impor aset dari database Notion** (Notion Config → Asset Library, `NotionAssetImport` + `src/lib/notion-asset-import.ts`): pilih database terdaftar atau tempel link → pratinjau (judul, tag, kategori ditebak dari select/tag/judul, status Siap / Sudah ada / Link bukan desain Canva / Tanpa link) → impor terpilih (`importNotionAssetsAction`, `source = notion_import`, tanpa production = semua Canva) lalu push ke mirror di background 50/putaran. Database sumber hanya dibaca. Redirect hanya diikuti untuk host pemendek (bit.ly, canva.link, tinyurl, s.id, …); dedup lewat `canvaDesignId`.
* **`/share/t/[token]`** (publik, tanpa login): halaman view-only satu task ala Notion "Share to web". Dikecualikan di `src/proxy.ts` (`isPublicPath`) dan dari sidebar (`AppSidebar`). Hanya field allowlist (status, doctype, brand, pages, qty, task month, bahasa, priority, license, field tambahan non-link) + Design Brief; tanpa komentar, designer, payroll, pool score, link Canva/Dropbox/upload. Token dibuat/dicabut lewat `src/app/actions/task-share.ts` (permission `task.share`) dari tombol Share di task drawer (`task-detail/TaskShareButton.tsx`).

---

## ⚙️ Server Actions & Business Logic (`src/app/actions/` & `src/lib/`)

* **`src/app/actions/approval-payroll.ts`**:
  * Action server-side untuk menghitung total pembayaran payroll desainer, pengubahan status pembayaran, dan penanganan kalkulasi desainer bertipe status `Resign`.
* **`src/lib/sync-notion.ts`**:
  * Mesin sinkronisasi data dari Notion API ke database PostgreSQL.
  * Mendukung 2 mode: `full` (rekon total) dan `incremental` (polling cepat).
* **`src/lib/queries.ts`**:
  * Kumpulan query Prisma terpusat untuk kalkulasi agregasi KPI, volume tren, dan data tabel.
* **`src/lib/prisma.ts`**:
  * Inisialisasi prisma client dengan adapter Pg pool.

---

## 🧩 Komponen Utama (`src/components/`)

| Nama Komponen | File Path | Fungsi Utama |
| :--- | :--- | :--- |
| **Sidebar** | [src/components/Sidebar.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/Sidebar.tsx) | Mini icon-rail sidebar (default ~72px desktop) dengan menu navigasi utama. |
| **ApprovalPayrollTable** | [src/components/ApprovalPayrollTable.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ApprovalPayrollTable.tsx) | Shell container tabel persetujuan payroll yang meng-assemble sub-komponen `src/components/payroll/`. |
| **PayrollTableRow** | [src/components/payroll/PayrollTableRow.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/payroll/PayrollTableRow.tsx) | Sub-komponen mikro rendering 1 baris task payroll desainer & dropdown bulan. |
| **PayrollToolbar** | [src/components/payroll/PayrollToolbar.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/payroll/PayrollToolbar.tsx) | Sub-komponen toolbar search, sort, filter category popover, & batch assign. |
| **SortableTaskLists** | [src/components/SortableTaskLists.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/SortableTaskLists.tsx) | Shell container Kanban board yang meng-assemble sub-komponen `src/components/kanban/`. |
| **KanbanBoardHeader** | [src/components/kanban/KanbanBoardHeader.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/kanban/KanbanBoardHeader.tsx) | Sub-komponen header horizontal 8 kolom Kanban dengan sync scroll. |
| **ProductionToolbar** | [src/components/ProductionToolbar.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ProductionToolbar.tsx) | Toolbar filter multi-bulan desainer, brand, dan pencarian tugas. |
| **KPISection** | [src/components/KPISection.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KPISection.tsx) | Widget ringkasan metrik utama (Total Tasks, QTY Pages, Templates, Unpaid Payroll). |
| **SyncButton** | [src/components/SyncButton.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/SyncButton.tsx) | Tombol trigger manual Notion Full Sync dengan indikator progress. |
| **KnowledgeGraphViewer** | [src/components/KnowledgeGraphViewer.tsx](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KnowledgeGraphViewer.tsx) | Viewer interaktif Knowledge Graph dengan tab penjelajah grafis & dokumen. |

---

## 📦 Asset Library di Design Brief
* Drawer **Edit Design Brief** punya tombol **Ambil dari Library** → `AssetPicker` sebagai panel di dalam drawer (tetap 2 stage, bukan drawer ketiga). Escape menutup picker dulu. Sisipkan → `mergeAssetsMarkdown` (`src/lib/asset-brief.ts`) mengganti section `## 📦 Assets` (`- [Judul](…/view) — hlm 3, 7`).
* Preview brief: kind `assets` (`brief-parser.ts`, urutan setelah `links`) dirender `BriefAssetsList` (cover, kategori, halaman, preview iframe inline).
* Helper link Canva: `src/lib/canva-url.ts` (`parseCanvaUrl`, `publicViewUrlError`, `toCanvaEmbedUrl`, `toCanvaThumbnailUrl`). Judul otomatis dari oEmbed `https://www.canva.com/_oembed` (`fetchCanvaInfoAction`).

## 🏭 Kontrak dulu, baru Production
* **Rate Card → Kontrak**: `ContractDrawer` untuk **+ Kontrak Baru** dan **Edit Kontrak** (klik baris / tombol Edit; modal Edit Tarif Dasar lama dihapus; jenis output dikunci saat edit; `updateContractAction`). Kontrak Baru (`createContractAction` di `rate-card.ts`, izin `rateCard.edit`): nama platform unik, jenis output **hanya** `canva_link` / `dropbox_link` (jenis lain = pekerjaan kode), **tarif dasar wajib**, **periode kontrak wajib** (`ContractPeriodField`, dipakai juga di drawer Jadikan Kontrak bundle: pilihan cepat **3 Bulan / 6 Bulan / 1 Tahun** mulai tanggal 1 bulan depan — bundle: bulan setelah trial; edit: tanggal mulai yang ada — atau **Custom** yang membuka `DateRangePicker` di baris bawahnya) → `contractStartDate`/`contractEndDate`, lalu **Hari kerja** muncul setelah periode dipilih = jumlah hari Senin–Jumat di periode (`workingDaysInRange`; libur nasional belum dikurangi). Tabel Kontrak menghitung hal yang sama; kontrak lama tanpa tanggal akhir tetap tampil "25 hari / bulan". Info field memakai ikon ⓘ + tooltip (`InfoTip`, portal `fixed`) dan satuan inline ("/ halaman", "Sen–Jum"), bukan baris catatan di bawah field. `/rate-card?tab=kontrak&new=1&from=wizard` membuka drawer dan kembali ke wizard setelah simpan.
* **Wizard production langkah 1** hanya bisa memilih platform berkontrak (`baseRate` terisi, `isContracted`); platform tanpa tarif tampil "Belum berkontrak" (nonaktif) + tautan ke Rate Card. Draft wizard tetap di localStorage.
* Langkah Success: `getPlatformSetupAction` → pengingat bila platform belum punya Doctype / Akun.
* Asset Library & relation `Assets` hanya untuk platform `canva_link` (`src/lib/asset-productions.ts`).
