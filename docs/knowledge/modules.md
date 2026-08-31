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
* **`/notion-config`**: Konfigurasi Notion Database ID & API token.

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
