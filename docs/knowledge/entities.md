# Entity Knowledge & Database Schema — CAN-Freelance

Dokumen ini memetakan seluruh model data Prisma, skema Postgres, serta properti sinkronisasi Notion API.

---

## 🗄️ Model Utama Database (Prisma Schema)

### 1. `Task` (Tabel `tasks`)
Entitas utama yang merepresentasikan Notion Card / Tugas Pekerjaan Desain.
* **Kolom Utama**:
  * `id`: String (Primary Key, default UUID/Cuid)
  * `notionPageId`: String (Unique Index) — Halaman Notion sumber
  * `title`: String — Nama tugas
  * `qtySubmit`: Decimal (`@default(1)`) — Jumlah template disubmit
  * `pages`: Decimal (`@default(0)`) — Jumlah halaman dasar per template
  * `brandId`: Foreign Key -> `Brand.id`
  * `doctypeId`: Foreign Key -> `Doctype.id`
  * `designerId`: Foreign Key -> `Designer.id`
  * `designStatusId`: Foreign Key -> `DesignStatus.id`
  * `poolScore`: Decimal (`@default(0)`) — Skor pool freelancer
  * `createdTime`, `lastEditedTime`: DateTime

### 2. `Designer` (Tabel `designers`)
Entitas desainer / freelancer.
* **Kolom Utama**: `id`, `displayName`, `notionKey`, `status` (`'Active'` | `'Inactive'` | `'Resign'`), `role` (Jabatan), `contractType` (`Probation` | `Freelance` | `Fulltime`), `contractStartDate` (DateTime/Date), `inactiveStartDate` (DateTime/Date), `inactiveNote` (String), `resignDate` (DateTime/Date), `promotionDate` (DateTime/Date), `email`, `phone`, `bankName`, `bankAccount`.
* **Kaidah Bisnis**: Designer dengan `status === 'Resign'` memiliki total kalkulasi payroll = 0 dan badge UI merah coret. Status `Inactive` mencatat tanggal tidak aktif & alasan catatan inactive. Promosi jabatan mencatat `role` baru dan `promotionDate`.

### 3. `Doctype` (Tabel `doctypes`)
Entitas tipe dokumen (misal: `Regular-Presentation`, `Infographic`, `Social Media`).
* **Kolom Utama**: `id`, `name`, `pages` (base template pages), `rate`, `notionId`.

### 4. `Brand` (Tabel `brands`)
Entitas brand / klien.
* **Kolom Utama**: `id`, `name`, `notionId`.

### 5. `DesignStatus` (Tabel `design_statuses`)
Entitas tahapan / status pengerjaan desain di Kanban.
* **Kolom Utama**: `id`, `displayName`, `notionKey`, `order`, `color`.

### 6. `ContractRate` (Tabel `contract_rates`)
Tarif kontrak khusus per desainer/doctype.
* **Kolom Utama**: `id`, `designerId`, `doctypeId`, `customRate`.

### 7. `BillingStatement` (Tabel `billing_statements`)
Laporan tagihan pembayaran desainer.
* **Kolom Utama**: `id`, `designerId`, `month`, `totalAmount`, `status`, `paidAt`.

### 8. `SyncLog` & `NotionConfig` (Log & Konfigurasi Sync)
Kredensial database Notion ID, API Key, dan histori log eksekusi sync (`status`, `startedAt`, `finishedAt`, `itemsProcessed`, `errors`).

---

## 🔄 Pemetaan Notion API -> Prisma Column

| Notion API Property | Tipe Property Notion | Prisma Target Field | Catatan Parsing |
| :--- | :--- | :--- | :--- |
| `Task Name` | `title` | `Task.title` | Wajib `.map(t => t.plain_text).join('')` |
| `Designer` | `relation` / `people` | `Task.designerId` | Lookup/upsert ke tabel `Designer` |
| `Doctype` | `select` / `relation` | `Task.doctypeId` | Lookup/upsert ke tabel `Doctype` |
| `Brand` | `relation` / `select` | `Task.brandId` | Lookup/upsert ke tabel `Brand` |
| `Status` | `status` / `select` | `Task.designStatusId` | Pemetaan status alias & title-case |
| `QTY Submit` | `number` | `Task.qtySubmit` | Coerce ke `Decimal` Prisma |
| `Pages` | `number` | `Task.pages` | Coerce ke `Decimal` Prisma |
