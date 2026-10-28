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

* **`TaskShareLink`** (Tabel `task_share_links`): link publik view-only per task — `token` unik (acak 24 byte base64url), `createdById?`, `revokedAt?` (null = aktif; tanpa kedaluwarsa). Cascade saat task dihapus.

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

### 9. Canva Insights (`canva_*`) — spek: [`canva-insights-spec.md`](canva-insights-spec.md) §4
* `Account.canvaBrandId` (unik) menghubungkan akun brand ke brand Canva Creator; diisi `scripts/seed-canva-brands.ts`.
* `CanvaTemplate` (id `EAH…`): metadata, `sourceDesignId` (`DAH…`), tautan `taskId` + `matchMethod` (`design_id` | `title` | `manual`).
* `CanvaTemplateDaily` (`templateId`, `date` hari UTC, `audience`) dan `CanvaBrandDaily` (`canvaBrandId`, `date`, `audience`): Applies/Usages harian. `audience` = `B` Free, `C` Pro, atau `ALL` (request tanpa `contentRoyalties`; jangan dijumlah bersama `B`/`C`).
* `CanvaTierScore`, `CanvaIngestBatch` (respons mentah + status `PENDING`/`PARSED`/`REJECTED`), `CanvaCollectorRun` (`RUNNING`/`OK`/`NEEDS_LOGIN`/`ERROR`).

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

## 🧩 Struktur Field per Production (Notion dinamis)

* **`ProductionUnit.fieldMapping`** (Json): nama properti Notion kustom per `FieldKey` inti. Hanya disimpan bila beda dari nama default (`DEFAULT_FIELD_ALIASES` di `src/lib/production-field-mapping.ts`).
* **`ProductionUnit.disabledFields`** (String[]): `FieldKey` inti yang dimatikan. Field wajib (`REQUIRED_FIELD_KEYS`: name, designer, doctype, designStatus, pages, qtySubmit, payrollMonth) tidak boleh masuk. Disarankan: taskMonth, brand.
* **`ProductionField`** (tabel `production_fields`): field tambahan per production. Kolom: `name` (= nama properti Notion = key di `Task.customFields`), `notionPropertyId` (mengenali rename di Notion), `type`, `options`, `source` (`app`/`notion`), `visible`, `editable`, `filterable` (dipakai filter board, putaran berikutnya), `missingInNotion`.
* Katalog tipe & konversi nilai: `src/lib/notion-field-types.ts`. Kelola lewat `src/app/actions/production-field.ts` (drawer Edit Production → Struktur Field & Field Tambahan).
* **`NotionPage`** (tabel `notion_pages`): page induk untuk database Task baru, satu `isDefault`. Diatur di Notion Config → Pages & Databases (Tambah Page, Default, Pindai, Lepas). Wizard production memakai dropdown page (default terpilih) + opsi "Page lain…" (bisa disimpan ke daftar). Input menerima ID atau link (`normalizeNotionId`).
* **`NotionDatabase.archived` / `parentPageId`**: database terdaftar otomatis dari production; "Pindai" mendaftarkan database lama di dalam page. Arsip = disembunyikan & tidak dipakai sebagai database default QA/Doctype, tetap terdaftar. Database milik production (aktif maupun diarsipkan) mengikuti status production-nya dan diatur di Production Hub (aksi di tabel = link Production Hub); tombol Arsipkan hanya untuk database tanpa production, dan server menolak mengarsipkan database milik production. Tombol Add Database & Delete dihapus.

---

## 📦 Asset Library (`asset_categories`, `assets`, `task_assets`)
Katalog aset Canva untuk designer (jalur manual, tanpa Canva API). Backlog/rencana: [`../backlog/resources-library.md`](../backlog/resources-library.md).
* **`AssetCategory`**: tab di `/assets` (`name` unik, `sortOrder`, `archived`). Seed: Icon, Ilustrasi, Template, Mockup.
* **`Asset`**: `title`, `categoryId`, `tags[]`, `editUrl` (link `/edit`, butuh login akun tim), `previewUrl` (public view link `/view`, wajib; divalidasi `publicViewUrlError`), `coverUrl` (upload `/api/uploads/<file>`; null = thumbnail Canva), `pages`, `notes`, `status` (`active`|`archived`), `canvaDesignId` (dari previewUrl, untuk mencocokkan link di brief), `notionPageId`, `syncStatus` (`PENDING_PUSH` default | `SYNCED` | `ERROR`), `lastSyncedAt`, `lastEditedTime`.
* **`AssetProduction`** (`assetId`+`productionUnitId`): production yang boleh memakai aset; **hanya production berplatform Canva** (`platform.outputType = canva_link`, `canvaProductionUnits`). Kosong = semua production Canva. Notion: properti `Production` multi-select (database lama ber-select diubah otomatis saat push).
* **`TaskAsset`** (`taskId`+`assetId`, `pages`): sumber hitungan "Dipakai di N task". Diisi dari section `## 📦 Assets` brief (app & pull) + relation Notion `Assets`.
* **`NotionDatabase.purpose`**: `"asset_library"` menandai database mirror Asset Library (maks. satu aktif).

* **`BundleContract`** (`bundle_contracts`): kontrak bundle dari trial yang lolos — `bundleId`, `designerId`, `trialOrderId` (unik), `price` (per periode), `contractStartDate`/`contractEndDate` (DATE), `notes`. **`BundleOrder.contractId`** = order periode kontrak (`orderType = 'Kontrak'`). Ringkasan untuk UI: `mapBundleContract` di `src/lib/queries.ts` (periods, usedPeriods, nextPeriod). Helper periode: `nextTaskMonth`, `taskMonthsInRange` (`period-utils.ts`).
* **`Platform.contractEndDate`** (DATE): akhir kontrak platform (Rate Card → Kontrak).
