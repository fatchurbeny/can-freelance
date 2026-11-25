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
* **`/notion-config`**: satu halaman dengan tab (gaya `ProductionTabNav`, tab aktif di `?tab=`): **Koneksi** (workspace, API key, panduan), **Pages & Databases** (`?tab=pages`; `/notion-config/databases` di-redirect ke sini), **Sinkronisasi** (metode/interval + riwayat `SyncLog`), **Asset Library**, **Email Notifikasi** (badge `!` bila Google perlu reconnect; kembali dari OAuth membuka tab ini). **Extension** (`?tab=extension`, `ExtensionTab.tsx`): unduh zip extension Canva Insights (`/downloads/canva-insights-extension.zip?v=<versi>`, dibuat `scripts/pack-extension.sh` di `npm run build`, versi dibaca dari `manifest.json`) + panduan pasang/perbarui. Komponen tab di `src/components/notion-config/`. Tombol *Sync Sekarang* mengirim event `notion-sync-request` ke `SyncButton` sidebar (satu alur & modal sync).
  * **Sub-tab** (`notion-config/SubTabs.tsx`, `useSubTab`, `?sub=`; ganti tab utama menghapus `sub`): Pages & Databases → **Databases** (default, filter Dipakai: Semua / Task / Asset Library / Belum dipakai + Aktif/Arsip) · **Pages**; Sinkronisasi → **Jadwal** (default) · **Riwayat sync** (20 terakhir, filter Semua / Incremental / Full / Gagal, badge jumlah gagal); Asset Library → **Database & Pemetaan** (default) · **Relation Production** (badge jumlah belum) · **Impor dari Notion**.
* **`/assets`, `/asset-report`**: dihapus 2026-11-14 (lihat `entities.md` › Asset Library).
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
* **`src/lib/canva-insights/`** (spek [`canva-insights-spec.md`](canva-insights-spec.md)):
  * `parse.ts` parser murni per endpoint (fail-closed, `PARSER_VERSION`), `ingest.ts` simpan batch → parse → upsert, `match.ts` tautan template ↔ task, `reparse.ts` parse ulang batch, `retention.ts` retensi payload (60 hari) & batch (365 hari), `import.ts` jalur manual, `api-auth.ts` guard Bearer `INSIGHTS_INGEST_TOKEN`.
  * Route collector (di luar gerbang proxy, auth token sendiri): `POST /api/insights/ingest`, `POST /api/insights/runs`, `GET /api/insights/known-ids`.
  * Action `src/app/actions/canva-insights.ts`: `importCanvaInsightsAction` (`integration.manage`) + `getCanvaInsightsAction` (`insights.view`, data tab); script `scripts/import-canva-insights.ts` untuk impor fixture.
  * **Tab Production › Canva Insights** (`ProductionTabNav` id `insights`, `src/components/canva-insights/`): toolbar brand/audiens/rentang, KPI, line chart per brand (Semua brand) atau Applies & Usages (satu brand), tabel perbandingan brand, tabel template (filter tertaut, cari, urut, paginasi SQL). Query di `src/lib/canva-insights/queries.ts`, rentang di `range.ts`, tipe client di `view.ts`.

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

## 📦 Section Assets lama di Design Brief
* Picker "Ambil dari Library" dan `BriefAssetsList` dihapus 2026-11-14. Section `## 📦 Assets` di brief lama tetap kind `assets` (`brief-parser.ts`) dan dirender sebagai daftar link; `brief-extract` mengirimnya sebagai `links` kind `reference`.
* Helper link Canva tetap: `src/lib/canva-url.ts` (dipakai `canva-link-resolve.ts`).

## 🏭 Kontrak dulu, baru Production
* **Rate Card → Kontrak**: `ContractDrawer` untuk **+ Kontrak Baru** dan **Edit Kontrak** (klik baris / tombol Edit; modal Edit Tarif Dasar lama dihapus; jenis output dikunci saat edit; `updateContractAction`). Kontrak Baru (`createContractAction` di `rate-card.ts`, izin `rateCard.edit`): nama platform unik, jenis output **hanya** `canva_link` / `dropbox_link` (jenis lain = pekerjaan kode), **tarif dasar wajib**, **periode kontrak wajib** (`ContractPeriodField`, dipakai juga di drawer Jadikan Kontrak bundle: pilihan cepat **3 Bulan / 6 Bulan / 1 Tahun** mulai tanggal 1 bulan depan — bundle: bulan setelah trial; edit: tanggal mulai yang ada — atau **Custom** yang membuka `DateRangePicker` di baris bawahnya) → `contractStartDate`/`contractEndDate`, lalu **Hari kerja** muncul setelah periode dipilih = jumlah hari Senin–Jumat di periode (`workingDaysInRange`; libur nasional belum dikurangi). Tabel Kontrak menghitung hal yang sama; kontrak lama tanpa tanggal akhir tetap tampil "25 hari / bulan". Info field memakai ikon ⓘ + tooltip (`InfoTip`, portal `fixed`) dan satuan inline ("/ halaman", "Sen–Jum"), bukan baris catatan di bawah field. `/rate-card?tab=kontrak&new=1&from=wizard` membuka drawer dan kembali ke wizard setelah simpan.
* **Wizard production langkah 1** hanya bisa memilih platform berkontrak (`baseRate` terisi, `isContracted`); platform tanpa tarif tampil "Belum berkontrak" (nonaktif) + tautan ke Rate Card. Draft wizard tetap di localStorage.
* Langkah Success: `getPlatformSetupAction` → pengingat bila platform belum punya Doctype / Akun.
