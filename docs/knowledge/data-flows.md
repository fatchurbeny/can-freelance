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

## 📦 Asset Library ⇄ Notion (`src/lib/notion-assets.ts`)
* **App = sumber input utama**, database Notion "Asset Library" (properti: Name, Kategori, Tag, Production, Edit URL, Public View URL, Halaman, Catatan, Status Aktif/Arsip) = mirror dua arah.
* **Push**: simpan aset → `syncStatus: PENDING_PUSH` → `pushAssetToNotion` di background (diserialkan per aset). Page baru berisi blok `embed` public view link; saat link berubah embed Canva lama dihapus lalu ditambah (bukan lewat antrean body task yang menghapus semua blok). Properti yang tidak ada di skema dilewati. Aset `PENDING_PUSH`/`ERROR` dikirim ulang di awal `syncNotionData` (`pushPendingAssets`).
* **Pull**: `syncAssetsFromNotion` dipanggil setelah loop production (filter `last_edited_time` sama dengan task). Aset yang belum `SYNCED` tidak ditimpa. Mode full mengarsipkan aset yang page-nya hilang. Kategori baru dari Notion dibuat otomatis.
* **Brief → relation**: `updateTaskFieldsAction`/`createTaskAction` mem-parse section `## 📦 Assets` (`parseAssetSection`), mencocokkan aset lewat `canvaDesignId`, mengisi `TaskAsset`, dan menulis relation `Assets` bila skema task punya properti relation itu. Pull task: `TaskAsset` = aset dari brief + aset dari relation yang tidak ada di brief. `syncTaskAssetLinks` menulis secara **diff** (hapus yang hilang, tambah yang baru, perbarui `pages`) sehingga `TaskAsset.createdAt` = tanggal aset pertama dipakai di brief; Asset Report menghitung Applies dari tanggal ini.
* **Relation `Assets`** dibuat per production lewat Notion Config → Asset Library ("Buat relation", mengubah skema database live) atau otomatis saat database task production dibuat/diganti (`ensureAssetsRelationForTaskDb`). `Assets` ada di `APP_MANAGED_PROPERTIES` (bukan Field Tambahan).
* **Body task**: `markdownToNotionBlocks` kini mengubah `[teks](url)` di bullet/paragraf menjadi rich text link (dulu literal).
