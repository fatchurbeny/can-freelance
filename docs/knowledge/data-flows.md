# Data Flows & Notion Sync Engine — CAN-Freelance

Dokumen ini mendokumentasikan alur eksekusi sinkronisasi data Notion API ke PostgreSQL/Prisma DB.

---

## 🔄 Mode Sinkronisasi Data

```
               ┌──────────────────────────────────────────────┐
               │              NOTION API DATABASE             │
               └──────────────────────┬───────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
              ▼                                               ▼
    [ MANUAL TRIGGER (UI) ]                        [ BACKGROUND CRON ]
    - Mode: Full Sync                              - Mode: Incremental Sync
    - syncNotionData('full')                       - Polling interval 5 menit
    - Rekonsiliasi total tugas,                    - Menarik tugas yang berubah
      status, & halaman dihapus                      sejak last sync time
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    POSTGRESQL / PRISMA DB     │
                      └───────────────────────────────┘
```

---

## 📝 Rules Parsing Notion API

### 1. Handling Rich Text & Title Parsing
Notion memecah teks menjadi beberapa segmen array jika terdapat format campuran (misal: tebal/miring).
* **DILARANG**: Mengambil elemen pertama saja (misal `title[0].plain_text`).
* **WAJIB**: Melakukan `.map().join('')`:
  ```typescript
  const name = properties.Name?.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
  ```

### 2. Case Sensitivity & Pemetaan Alias Status Notion
Nilai status dari Notion API bisa bervariasi dalam penulisan huruf kapital maupun istilah alias.
* **Match Array Case-Insensitive**: `BOARD_STATUSES` & filter kolom harus menyertakan varian title-case dan lowercase (misal `['Not Started', 'Not started']`).
* **Dukungan Varian QA**:
  * Mengakomodasi varian `['QA', 'qa', 'Q&A', 'q&a', 'In QA', 'in qa', 'QA Process', 'Quality Assurance']`.
* **Mapping Cerdas**: `syncNotionData` secara otomatis menormalisasi nama status ke entitas `DesignStatus` kanonikal yang sudah ada.

## 🧩 Nama Properti & Field Tambahan (per production)

* **Tulis ke Notion** selalu lewat `resolveWriteName(schemaProps, key, unit.fieldMapping)`: mapping production dulu, lalu alias default; properti yang tidak ada di database dilewati. Dipakai di `createTaskAction`, `updateTaskFieldsAction`, `updateTaskStatusAction` (`qa.ts`), `pushPendingLocalChangesToNotion` (`sync-notion.ts`), Parameter Issue, dan `syncPlatformOptionsToNotion`. Jangan menulis nama properti hardcoded lagi.
* **Field tambahan**: pull menyimpan semua properti non-inti ke `Task.customFields` (`extractCustomFields`). Edit dari app mengirim patch `customFields` (digabung, nilai kosong menghapus key) dan push hanya field `ProductionField` yang `editable`, dikonversi `toNotionPropertyValue` sesuai tipe di skema Notion.
* **Membuat/ganti nama properti** dari app: `ensureCustomProperty` / `renameProperty` (`notion-provision.ts`, via `dataSources.update`). Rename ikut mengganti key di `tasks.custom_fields` (SQL jsonb). App tidak pernah menghapus properti Notion.
* Pull menimpa `customFields` dengan nilai Notion setiap sync (sama seperti field inti), jadi push harus selesai lebih dulu.

---

## 📦 Asset Library ⇄ Notion (dihapus)
* **Dihapus 2026-11-14** (keputusan pemilik): Asset Library, Asset Report, picker "Ambil dari Library", sinkron Notion aset, relation `Assets`, izin `asset.*`, dan tabel `assets`/`asset_categories`/`asset_productions`/`task_assets`. Ekspor data: `backups/asset-export-20261114.json` (laptop, git-ignored) + `~/db-backups/can-freelance-20261114-asset-tables.dump` (VPS). Pengganti yang direncanakan: katalog elemen improstd (Element Board), lihat [`impro-brief-handoff.md`](impro-brief-handoff.md). Section `## 📦 Assets` di brief lama tetap teks, dirender sebagai daftar link. Database Notion "Asset Library" tidak dibuang: judulnya diberi akhiran "(arsip 2026-11-14)"; relation `Assets` dilepas dari database task.

* **Body task**: `markdownToNotionBlocks` kini mengubah `[teks](url)` di bullet/paragraf menjadi rich text link (dulu literal).
