# Backlog Batch — Notion-like Custom Fields (Migrasi keluar dari Notion)

> **Status**: PARKED / belum dijadwalkan. Dokumen ini sengaja TIDAK ditautkan dari `docs/knowledge/index.md`
> maupun `session-handover.md` agar tidak terbaca agen pada sesi berjalan. Aktifkan hanya saat batch ini dimulai.
> Dibuat: 2026-09-29 · Pengusul: Claude (claude-opus-5-5)

## Tujuan
Dedicated app dengan database fleksibel ala Notion (custom field, tipe properti, view, filter) tanpa bergantung pada Notion API.

## Prinsip: Hybrid
- **Kolom inti tetap typed** di tabel yang ada (`Task.designerId`, `pages`, `qtySubmit`, `payrollMonth`, `designStatusId`, …) → rumus payroll (`qty_submit * pages`, Resign = 0, `isTaskInPeriods`) tidak berubah.
- **Field tambahan** disimpan di kolom `props JSONB` (GIN index), didefinisikan lewat metadata yang dikelola dari UI → tambah field tanpa migrasi.
- Hindari EAV penuh (query billing/KPI jadi berat & rawan salah).

## Sketsa Skema Prisma
```prisma
model Collection {            // = "Database" Notion
  id      String @id @default(uuid()) @db.Uuid
  key     String @unique
  name    String
  icon    String?
  fields  FieldDefinition[]
  views   View[]
}

model FieldDefinition {       // = "Property" Notion
  id           String @id @default(uuid()) @db.Uuid
  collectionId String @db.Uuid
  key          String          // slug permanen untuk props JSON
  label        String
  type         FieldType
  config       Json?           // format Rupiah, formula, target relasi, dll.
  isSystem     Boolean @default(false) // dipetakan ke kolom inti, tidak bisa dihapus
  position     Int
  isHidden     Boolean @default(false)
  options      FieldOption[]
  collection   Collection @relation(fields: [collectionId], references: [id])
  @@unique([collectionId, key])
}

model FieldOption {
  id       String @id @default(uuid()) @db.Uuid
  fieldId  String @db.Uuid
  label    String
  color    String
  position Int
  field    FieldDefinition @relation(fields: [fieldId], references: [id])
}

model View {
  id           String @id @default(uuid()) @db.Uuid
  collectionId String @db.Uuid
  name         String
  type         ViewType
  config       Json   // { filters, sorts, groupBy, visibleFields, widths }
  position     Int
  collection   Collection @relation(fields: [collectionId], references: [id])
}

model Record {                // koleksi baru buatan user
  id           String @id @default(uuid()) @db.Uuid
  collectionId String @db.Uuid
  props        Json   @default("{}")
  createdAt    DateTime @default(now())
  @@index([props], type: Gin)
}

enum FieldType { TEXT NUMBER CURRENCY SELECT MULTI_SELECT STATUS DATE PERSON RELATION ROLLUP FORMULA CHECKBOX URL FILE }
enum ViewType  { TABLE BOARD CALENDAR GALLERY TIMELINE FORM }
```
+ tambah `props Json @default("{}")` pada `Task` & `Designer`.

## Mekanik UI
1. Tombol "+" di header tabel → drawer (standar `form-crud-rules.md`) pilih tipe/label/opsi/warna → insert `FieldDefinition`.
2. Renderer per tipe: `FieldCell` / `FieldEditor` dipakai ulang di Table, Board, Form.
3. `View.config` → diterjemahkan ke `Prisma.sql` dengan operator JSONB (`props->>'key'`).
4. Formula/Rollup dihitung server-side (parser aman, bukan `eval`), cache untuk rollup berat.
5. Field `isSystem` tampil seragam tapi baca/tulis ke kolom asli.

## Rencana Batch
| Batch | Isi | Role |
| :-- | :-- | :-- |
| 1 | Tabel metadata + `props`, seed `FieldDefinition` dari properti Notion saat ini (`isSystem`) | ⚙️ Backend & Database |
| 2 | `notionPageId` → nullable / `externalId`; server actions CRUD record & field | ⚙️ Backend + 🔄 API |
| 3 | Table view: inline edit, tambah/rename/hide/reorder properti | 🎨 Frontend |
| 4 | Board, Calendar, Form view + saved filter/sort/group | 🎨 Frontend |
| 5 | Formula & Rollup engine | 💼 Business Logic |
| 6 | Notion sync read-only paralel → verifikasi data cocok → matikan cron sync | 🔄 API |
