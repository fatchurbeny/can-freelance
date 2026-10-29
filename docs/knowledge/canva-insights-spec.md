# Spec: Canva Insights Tracker

Status: **Fase 1 ditulis di branch `feat/canva-insights`** (2026-10-28): skema, parser, API, impor manual. Diuji ke DB lokal: total breakdowns = acuan brief, impor ulang idempoten, batch rusak ditolak, API HTTP (401/403/413/422/200) sesuai. **Fase 2 = extension Chrome** (`tools/canva-insights-extension/`), diuji dengan `chrome` & Canva palsu terhadap API lokal; belum diuji dengan akun Canva sungguhan. Fase 3 belum. Brief kerja: [`../backlog/canva-insights-implementation.md`](../backlog/canva-insights-implementation.md). Ringkasan endpoint per field: [`../canva-insights-endpoints.md`](../canva-insights-endpoints.md) (salinan dokumen project claude.ai "Can-Product Monitor"; isinya disamakan dengan §1 spek ini).

Tujuan: menyimpan snapshot harian **Applies** dan **Usages** per template Canva dari 5 akun Creator, menautkannya ke `Task` di production dashboard, lalu menampilkan performa per template, per brand, dan per designer di halaman `/insights`.

---

## 1. Sumber data: endpoint internal dashboard Creator

Canva **tidak** menyediakan API resmi untuk data insight creator (Canva Connect API hanya desain/folder/aset, lihat `scratch/canva-spike.mjs`). Data diambil dari endpoint internal yang dipakai halaman `https://www.canva.com/creators/template/dashboard/dashboard`, dipetakan dari HAR kelima brand (28 Okt 2026).

| Endpoint | `x-canva-request` | Isi |
| :--- | :--- | :--- |
| `GET /_ajax/creatorinsight/content/usages?type=BY_BRAND&brandId=…&fromDate=…&toDate=…&contentType=B&sortOrder=C&orderBy=B&limit=50` | `findcontentusagesv2` | Total per template dalam rentang. `orderBy=B` = urut tanggal publish (bukan Applies). Sumber daftar template ID. |
| `GET /_ajax/creatorinsight/content/usages?type=BY_CONTENT&brandId=…&contentType=B&rollupPeriod=B&fromDate=…&toDate=…&limit=…&contentIds=…(≤50)&contentRoyalties=B&contentRoyalties=C` | `findcontentusagesv2` | **Data utama**: baris harian per template (dan per `F` bila `contentRoyalties` disertakan). |
| `GET /_ajax/creatorinsight/brand/usage/breakdowns?brandId=…&rollupPeriod=B&fromDate=…&toDate=…&limit=100&contentType=B&contentRoyalties=B&contentRoyalties=C` | `findbrandusagebreakdownsv2` | Total harian akun, 2 baris per hari (`F`=B, `F`=C). |
| `GET /_ajax/creatorinsight/tier_scores?brand=…&after=…&limit=100` | `findtierscores` | Skor tier harian. |
| `GET /_ajax/template/templates?id=…(≤50)&…` | `findtemplatesapi` | Metadata template. |

### 1.1 Field per endpoint

**Huruf yang sama punya arti berbeda di tiap endpoint.** Parser harus memetakan per endpoint, jangan memakai satu mapping global. `A?` di setiap baris adalah penanda tipe union, diabaikan.

**`content/usages`** (`BY_BRAND` dan `BY_CONTENT`, baris di `A[]`)

| Field | Arti | Status |
| :--- | :--- | :--- |
| `e` | template ID (`EAH…`) | pasti |
| `C` | **Applies** | terkonfirmasi (`EAHYiT2kBI4` dashboard 82 = HAR 82) |
| `D` | **Usages** | terkonfirmasi (dashboard 9 = HAR 9) |
| `F` | jenis royalti, **hanya ada bila request menyertakan `contentRoyalties=B&contentRoyalties=C`**. `C` = Pro, `B` = Free | `C`=Pro hampir pasti (template Pro `EAHXZ2j0CoA` hanya `F=C`); `B`=Free belum dicek |
| `j` | waktu publish (ms) | pasti |
| `k` / `l` | awal / akhir hari rollup (ms UTC), **hanya di `BY_CONTENT`** | pasti |
| `E` | waktu aktivitas terakhir (ms) | dugaan kuat |
| `B` (top-level) | token halaman berikutnya (§1.3) | pasti |

`BY_BRAND` tidak punya `k`/`l`: satu baris = total template dalam rentang. `orderBy=B` mengurutkan berdasarkan tanggal publish, bukan Applies.

**`brand/usage/breakdowns`** (baris di `A[]`, 2 baris per hari: `F=B` dan `F=C`)

| Field | Arti | Status |
| :--- | :--- | :--- |
| `e` / `f` | awal / akhir hari (ms UTC) — **bukan template ID** | pasti |
| `C` | Applies akun hari itu | pasti |
| `D` | Usages akun hari itu | pasti |
| `F` | jenis royalti (`B` Free / `C` Pro) | sama dengan content/usages |
| `E` | waktu akhir agregasi (contoh `…T23:59`) — **bukan** aktivitas terakhir | dugaan kuat |

**`tier_scores`** (baris di `A[]`, satu per hari)

| Field | Arti | Status |
| :--- | :--- | :--- |
| `B` | tanggal (ms UTC, langkah 24 jam) | pasti |
| `C` | label tier, mis. `"LOW"` | pasti |
| `H` | waktu skor dihitung (2–5 hari setelah `B`) | dugaan kuat |
| `F` | rasio 0–1 (contoh 0.54, 0.72, 1.0) — kandidat "skor" | **dugaan** |
| `A` | selalu `2` | belum diketahui |
| `D`, `E`, `G` | bilangan bulat (`D` naik bertahap, `G` ±40-an) | belum diketahui |

Simpan seluruh baris di `CanvaTierScore.raw`; hanya `B`, `C`, `F` yang dipetakan ke kolom. Data tier terlambat lebih lama dari usages (diambil 28 Okt → baris terakhir 24 Okt).

**`template/templates`** (baris di `A[]`)

| Field | Arti | Status |
| :--- | :--- | :--- |
| `A` | template ID | pasti |
| `I` | **ID desain sumber (`DAH…`)**, ada di 200/200 template contoh; dipakai untuk tautan ke task (§6) | pasti |
| `R` | judul | pasti |
| `T` | keyword[] | pasti |
| `0` | lisensi: `"canva_pro"` atau `"none"` (Free); contoh zahra.art 48 Pro / 2 Free | pasti |
| `D` / `E` | brandId / user ID pemilik | pasti |
| `d` | jumlah halaman (nilai 1, 12, 13…) | dugaan |
| `N` / `O` | timestamp (dibuat / dipublikasi?) | belum diketahui |
| `m[0].C[0].A` | URL thumbnail `template.canva.com/…` | pasti |

Semua timestamp dalam ms UTC. **Rollup harian = hari UTC** (dikonfirmasi user).

### 1.2 Kelengkapan data terbaru
* Respons terlambat **±1 hari**: breakdowns yang diambil 28 Okt berakhir di 27 Okt (UTC).
* Namun dashboard Canva sendiri menulis **"Data shown may exclude the last 7 days"**, jadi angka 7 hari terakhir masih bisa bertambah/direvisi. Contoh: breakdowns zahra.art hari terakhir (27 Okt) berisi Applies `0` tetapi Usages `796`.
* Konsekuensi: collector mengambil ulang **14 hari terakhir** setiap run, server upsert, dan UI menandai **7 hari terakhir sebagai "sementara"**.
* **Hari yang belum selesai tidak disimpan** (2026-10-29): Canva sempat mengirim baris parsial hari ini (Chital 29 Okt: Usages 63 pukul 02:02 UTC), lalu menyembunyikannya sampai harinya selesai. Ingest membuang baris harian (`by_content`, `breakdowns`) yang harinya belum berakhir saat batch diterima (`date + 1 hari > receivedAt`).

### 1.3 Paginasi
* Respons `content/usages` membawa `"B": "<token>"` (mis. `"1e"`) bila masih ada halaman berikutnya; tidak ada `B` = halaman terakhir.
* **`limit` menghitung baris, bukan template.** Contoh nyata (HAR zahra.art): `BY_CONTENT` dengan 50 `contentIds`, rentang 29 Agu–29 Sep (31 hari) dan `limit=50` hanya mengembalikan **50 baris yang mencakup 3 hari pertama (29–31 Agu) untuk 26 template**, plus `B="1e"`. Tanpa mengikuti token, 28 hari sisanya hilang tanpa error. Karena itu collector **wajib** mengikuti token sampai `B` tidak ada.
* Nama parameter untuk mengirim token = **`continuation`** (terdeteksi extension pada sinkron zahra.art 2026-10-28, lalu disimpan di `chrome.storage.local`).

### 1.4 Header
Cookie sesi + `x-canva-authz`, `x-canva-user`, `x-canva-brand`, `x-canva-app: home`, `x-canva-request`, `x-canva-accept-prefix: no-prefix`. `x-canva-authz` = token sesi, **tidak pernah disimpan**.

## 2. Brand yang dipantau

| Brand | Canva brandId | Canva user |
| :--- | :--- | :--- |
| Chital | `BADxbxKIT_Y` | ? |
| zahra.art | `BAEtJgfxnTk` | `UAEtJk0nWyo` |
| impro (improstd) | `BAEUTwNzf0Y` | `UAEUTz1VWXU` |
| UiCreative.net | `BAEWutmc71I` | `UAEWuhxa1S0` |
| Antler | `BAEZG0o0gf4` | `UAEZG851wAs` |

**Tiap brand = akun login Canva sendiri** (user ID berbeda). Satu sesi tidak bisa membaca brand lain dengan sekadar mengganti `brandId`, jadi collector butuh satu profil browser per brand. Brand dipetakan ke `Account` yang sudah ada lewat kolom baru `Account.canvaBrandId`.

## 3. Arsitektur

```
Chrome harian user (extension MV3)                     VPS: can-freelance
user buka dashboard Creator → klik "Sinkronkan sekarang" (1× per brand per hari)
  └─ service worker extension
       tangkap header x-canva-* (webRequest, brand dari x-canva-brand)
       fetch endpoint §1 dari dalam tab (MAIN world)  ──POST──▶  /can-freelance/api/insights/ingest
       (ikuti paginasi)                                  (Bearer INSIGHTS_INGEST_TOKEN)
                                                               │
                                                               ▼
                                                     PostgreSQL: batch mentah → parser → tabel harian
                                                               │
                                                               ▼
                                                     Halaman /insights
```

### 3.1 Keputusan
1. **Data diambil di browser, bukan dari server.** Server tidak menyimpan cookie/token Canva: menyimpannya berarti kredensial 5 akun Creator ada di VPS; sesi kedaluwarsa dan login butuh MFA sehingga cron server rapuh; dan akses terjadwal 5 akun dari satu IP datacenter lebih mencurigakan daripada dari browser rumah.
2. **Collector = extension Chrome di browser harian** (`tools/canva-insights-extension/`), user menekan "Sinkronkan sekarang" di dashboard Creator tiap brand. Rencana sebelumnya (script Playwright + launchd di iMac, tanpa pengawas) **dibatalkan 2026-10-28**: Chrome yang dikendalikan Playwright mendapat pemeriksaan anti-bot Cloudflare ("Just a moment…", kotak "Verify you are human" yang tidak lolos), termasuk saat login manual. Melewati pemeriksaan itu tidak dilakukan. Konsekuensi: sinkronisasi butuh satu klik per brand; tanpa klik, data brand itu tertinggal (UI memberi peringatan > 48 jam).
3. **Dashboard tidak pernah memanggil Canva.** Hanya menerima data lewat API ingest.
4. **Simpan mentah dulu, normalisasi kemudian.** Nama field Canva hasil minify bisa berubah. Tiap respons disimpan di `CanvaIngestBatch.payload` lalu diparse oleh parser bervers; batch lama bisa diparse ulang. Parser **fail-closed**: `C`/`D` bukan angka atau `e` hilang → batch `REJECTED`, tidak ada baris ditulis.
5. **Idempoten.** Collector selalu mengambil ulang **14 hari terakhir**, server upsert per (template, tanggal, audiens). Hari dalam 7 hari terakhir ditandai "sementara" di UI.
6. **Zona waktu**: kolom tanggal = hari UTC apa adanya, UI tidak mengonversi ke WIB (angka sama persis dengan dashboard Canva). Hari UTC berganti pukul 07:00 WIB.

## 4. Skema Prisma

```prisma
// Tambahan di model Account:
//   canvaBrandId   String?         @unique @map("canva_brand_id")
//   canvaTemplates CanvaTemplate[]
// Tambahan di model Task:
//   canvaTemplates CanvaTemplate[]

model CanvaTemplate {
  id             String    @id                          // "EAH…"
  canvaBrandId   String    @map("canva_brand_id")
  accountId      String?   @map("account_id") @db.Uuid
  sourceDesignId String?   @map("source_design_id")     // field I, "DAH…"
  title          String?                                // R
  keywords       String[]                               // T
  license        String?                                // field 0: "canva_pro" | "none"
  pageCount      Int?      @map("page_count")           // field d (dugaan)
  thumbnailUrl   String?   @map("thumbnail_url")
  publishedAt    DateTime? @map("published_at") @db.Timestamptz(6)    // j
  lastActivityAt DateTime? @map("last_activity_at") @db.Timestamptz(6) // E
  taskId         String?   @map("task_id") @db.Uuid
  matchMethod    String?   @map("match_method")         // "design_id" | "title" | "manual"
  firstSeenAt    DateTime  @default(now()) @map("first_seen_at") @db.Timestamptz(6)
  updatedAt      DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  account        Account?  @relation(fields: [accountId], references: [id], onDelete: SetNull)
  task           Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)
  daily          CanvaTemplateDaily[]

  @@index([canvaBrandId])
  @@index([taskId])
  @@index([sourceDesignId])
  @@map("canva_templates")
}

model CanvaTemplateDaily {
  templateId String   @map("template_id")
  date       DateTime @db.Date             // hari UTC dari k
  audience   String   @default("ALL")      // F mentah ("B" | "C") atau "ALL"
  applies    Int                           // C
  usages     Int                           // D
  batchId    String   @map("batch_id") @db.Uuid
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  template   CanvaTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@id([templateId, date, audience])
  @@index([date])
  @@map("canva_template_daily")
}

model CanvaBrandDaily {
  canvaBrandId String   @map("canva_brand_id")
  date         DateTime @db.Date
  audience     String
  applies      Int
  usages       Int
  @@id([canvaBrandId, date, audience])
  @@map("canva_brand_daily")
}

model CanvaTierScore {
  canvaBrandId String   @map("canva_brand_id")
  date         DateTime @db.Date
  tier         String?                       // field C, mis. "LOW"
  score        Decimal? @db.Decimal          // field F, rasio 0–1 (dugaan)
  computedAt   DateTime? @map("computed_at") @db.Timestamptz(6) // field H
  raw          Json
  @@id([canvaBrandId, date])
  @@map("canva_tier_scores")
}

model CanvaIngestBatch {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  receivedAt    DateTime  @default(now()) @map("received_at") @db.Timestamptz(6)
  canvaBrandId  String    @map("canva_brand_id")
  endpoint      String    // "content.by_brand" | "content.by_content" | "brand.breakdowns" | "tier_scores" | "templates"
  query         Json      // parameter request (tanpa header)
  payload       Json      // respons mentah
  source        String    @default("collector") // "collector" | "manual"
  parserVersion Int       @default(1) @map("parser_version")
  status        String    @default("PENDING")   // PENDING | PARSED | REJECTED
  error         String?
  rowCount      Int       @default(0) @map("row_count")
  @@index([canvaBrandId, receivedAt])
  @@map("canva_ingest_batches")
}

model CanvaCollectorRun {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  canvaBrandId String    @map("canva_brand_id")
  startedAt    DateTime  @map("started_at") @db.Timestamptz(6)
  finishedAt   DateTime? @map("finished_at") @db.Timestamptz(6)
  status       String    // OK | NEEDS_LOGIN | ERROR
  message      String?
  batchCount   Int       @default(0) @map("batch_count")
  host         String?   // mis. "imac-rumah"
  @@index([canvaBrandId, startedAt])
  @@map("canva_collector_runs")
}
```

Catatan: satu `Task` bisa punya beberapa template (`qtySubmit` > 1, varian bahasa) → `CanvaTemplate.taskId` tidak unik. Payload mentah dihapus setelah 60 hari (baris harian tetap). `Decimal` diserialisasi `JSON.parse(JSON.stringify(...))` sebelum ke Client Component.

**Selisih implementasi Fase 1 dari skema di atas** (2026-10-28, `prisma/schema.prisma` adalah acuan):
* `CanvaBrandDaily` dan `CanvaTierScore` juga punya `batchId` + `updatedAt` (jejak batch terakhir yang menulis baris).
* `CanvaIngestBatch.runId` (opsional) menautkan batch ke `CanvaCollectorRun`; `CanvaCollectorRun.status` juga bisa `RUNNING` (run belum dilaporkan selesai).
* `audience = "ALL"` muncul bila `BY_CONTENT` diminta tanpa `contentRoyalties` (fixture punya contoh ini). Query UI wajib memakai baris `B`/`C` dan memakai `ALL` hanya bila tidak ada baris `B`/`C` untuk template + hari itu, agar tidak terhitung ganda.
* **Retensi** (`src/lib/canva-insights/retention.ts`): payload batch > 60 hari diganti `{ "purgedAt": … }` (tanpa ubah skema), baris batch > 365 hari dihapus. Berjalan otomatis setelah `POST /api/insights/runs` `finish` (maks. 1× per 12 jam per proses); manual: `npx tsx scripts/prune-canva-insights.ts [--dry-run]`. Reparse melewati batch yang sudah dikosongkan.
* **Ukuran nyata sinkron 365 hari zahra.art** (1.236 template): 247 ribu baris harian = 36 MB; 2.594 batch mentah = 13 MB. Dengan 5 brand serupa: ±180 MB data harian setahun + ±65 MB payload mentah (sebelum retensi 60 hari memangkasnya).
* **Proyeksi awal** (diukur 2026-10-28 dari sebagian sinkron zahra, kemungkinan terlalu rendah): ±0,33 baris harian per template per hari, ±152 byte/baris; respons mentah ±4,4 KB per halaman 100 baris. Asumsi 5 brand × ±1.200 template: backfill 365 hari ±75–115 MB, tumbuh ±115 MB/tahun; payload mentah dengan retensi 60 hari ±80 MB (tetap), tanpa retensi ±500 MB/tahun.

## 5. API & collector

### 5.1 `POST /can-freelance/api/insights/ingest`
* Auth `Authorization: Bearer <INSIGHTS_INGEST_TOKEN>` (env baru, terpisah dari `CRON_SECRET`). Route `/api/*` berada di luar gerbang proxy; guard sendiri di handler.
* Body: `{ brandId, endpoint, query, payload, collectorVersion, runId? }`, maks 2 MB. `brandId` wajib ada di `Account.canvaBrandId`, selain itu 403.
* Alur: simpan batch → parse dalam transaksi → upsert → tautkan task untuk template baru → `{ batchId, status, rowCount, error? }`. Rate limit via `src/lib/rate-limit.ts`.
* Status HTTP: 200 `PARSED`, **422 `REJECTED`** (batch tetap tersimpan untuk reparse), 401 token salah, 403 brand belum terdaftar, 413 body > 2 MB, 429 rate limit. `templates` berisi baris milik brand lain (`D` ≠ `brandId`) → `REJECTED`.

### 5.2 Endpoint pendukung
* `POST /api/insights/runs`: `{ action: "start", brandId, host? }` → `{ runId }` (status `RUNNING`); `{ action: "finish", runId, status: "OK"|"NEEDS_LOGIN"|"ERROR", message? }`. Kirim `runId` di tiap ingest agar `batchCount` bertambah.
* `GET /api/insights/known-ids?brandId=…` → `{ ids, missingMetadata }`: template ID yang sudah dikenal (agar template sepi tetap diambil hariannya) dan yang belum punya judul (perlu `templates`).
* Jalur manual (Server Action, permission `integration.manage`): unggah/tempel JSON respons atau file fixture → handler parse yang sama, `source = "manual"`.

### 5.3 Urutan kerja extension per brand
1. User membuka dashboard Creator (akun brand yang login) dan menekan "Sinkronkan sekarang". Brand = `x-canva-brand`; brand yang belum terdaftar ditolak server (403).
2. Header `x-canva-*` ditangkap `webRequest` dari request `creatorinsight` dashboard (bila belum ada, tab dimuat ulang dan ditunggu 30 detik). Disimpan hanya di `chrome.storage.session`.
3. `BY_BRAND` 90 hari → daftar ID, ikuti token paginasi.
4. Gabung dengan `known-ids` dari server.
5. `BY_CONTENT` per kelompok 50 ID, `limit=100`, `contentRoyalties=B&C`, rentang 14 hari terakhir (run pertama: sejak publish, maks 365 hari, dipecah per 90 hari), ikuti token.
6. `breakdowns` dan `tier_scores` 14 hari terakhir.
7. `templates` untuk ID tanpa metadata di server.
8. Tiap respons langsung di-POST sebagai satu batch. Request berurutan, jeda 1–2 detik + jitter. Berhenti di 401/403 pertama.

**Deteksi parameter paginasi**: saat token `B` pertama ditemukan, coba berurutan `continuation`, `continuationToken`, `cursor`, `pageToken`. Parameter benar = respons berisi baris yang berbeda dari halaman pertama. Simpan nama yang berhasil di konfigurasi lokal dan catat di spek ini.

Request ke Canva lalu dijalankan lewat `chrome.scripting.executeScript({ world: 'MAIN' })` di tab dashboard (cookie & origin asli). Sinkron pertama tiap brand: opsi "Ambil 365 hari" di popup. Parameter paginasi yang terdeteksi disimpan di `chrome.storage.local`.

**Pemeriksaan Cloudflare** (2026-10-28): Chrome yang dikendalikan Playwright mendapat halaman "Just a moment…" dan kotak "Verify you are human" yang tidak lolos setelah dicentang user. Karena itu jalur Playwright dihapus dan diganti extension (§3.1 butir 2).

**Endpoint templates wajib memakai parameter dashboard** (`staging=false&deleted=false&forcePrerequisites=canva_pro&filesFromPage=0&filesToPage=1&includeContentFiles=false&previewFileSizes=200&previewFileTypes=A&fileLocationType=B&mode=C&limit=100`). Tanpa itu (sinkron zahra pertama) Canva hanya mengembalikan 64 dari 1.186 template dan tanpa URL thumbnail.

**Verifikasi zahra.art 2026-10-28** (rentang 28 Sep–28 Okt): Applies brand **324.699 = dashboard Canva**; 7 template terbaru sama persis dengan tabel Canva (Usages Sales Growth Roadmap 109 vs 107 di halaman Canva yang dimuat lebih awal). Jumlah harian per template (324.702) ≈ total akun (324.699).

### 5.4 Fetch dari dalam halaman
Request dijalankan via `page.evaluate(fetch(url, { headers, credentials: 'include' }))` di tab Canva, sehingga cookie, origin, dan TLS sama dengan dashboard asli.

## 6. Pencocokan template ↔ task
1. **ID desain**: ambil ID desain dari `TaskCanvaLink.url` dan `Task.outputUrl` (regex `/design/(D[A-Za-z0-9_-]{10})`), cocokkan dengan `CanvaTemplate.sourceDesignId`. → `matchMethod = "design_id"`. Praktis tidak pernah cocok (lihat temuan di bawah); dipertahankan bila suatu saat link desain sumber disimpan di task.
2. **Judul (metode utama)**: judul ternormalisasi (huruf kecil, non-alfanumerik → spasi) = `Task.name`, **atau `Task.name` + satu kata jenis** (judul template = nama task + "Presentation"/"Post"/"Story"/…), pada task dengan `TaskAccount` = akun brand tersebut. Hanya bila tepat satu kandidat. → `"title"`.
3. **Manual**: antrean "Belum tertaut" di `/insights`. → `"manual"`, tidak pernah ditimpa otomatis.

**Temuan 2026-10-28 (fixture 4 brand vs DB lokal)**: semua 462 `TaskCanvaLink.url` berupa short link `canva.link/…` (tanpa ID desain). Diresolve, link itu mengarah ke `/view` **desain kerja designer** (mis. task "Marketing Process Flow" → `DAHXf1bxfKQ`), sedangkan template punya desain sumber baru hasil publish (`I` = `DAHYhL9r9kI`). Jadi `design_id` = 0 dari 200 template; judul (aturan + satu kata) = 21 tertaut, 0 ambigu (antler 0, impro 5, uicreative 5, zahra 11). Sisanya lewat antrean manual di `/insights`.

## 7. UI `/insights`

**Diubah 2026-10-28 (user):** tampil sebagai **tab baru "Canva Insights" di halaman Production** (setelah Email Notifications), dropdown brand (Semua brand / per brand) dan **line chart gabungan semua brand** (toggle Applies/Usages). Desain: https://claude.ai/artifact/DdcA2ANNvf8tK4VR6QEUVy (artboard Semua brand + Zahra Art, data asli fixture). Rincian di bawah tetap berlaku untuk isi tab.
**Diimplementasi 2026-10-28** (`src/components/canva-insights/`, `getCanvaInsightsAction`, `src/lib/canva-insights/queries.ts`): tab muncul di `/production/[slug]` bila user punya `insights.view` untuk production itu **dan** platform-nya punya akun dengan `canvaBrandId`; brand = akun platform tersebut. Data dimuat lewat server action saat tab dibuka; filter brand/rentang/audiens disimpan di localStorage (bukan URL query, karena tab Production berbasis state). Perubahan Usages per Applies ditampilkan dalam poin persen. Belum: drawer template & tautkan task manual, wireframe role.

Permission baru `insights.view` (Admin, Art Director, Project Manager; bukan freelance/viewer). Grup sidebar sesuai [`sidebar-dropdown-pattern.md`](sidebar-dropdown-pattern.md). Standar Cloudflare (`rounded-none`, tabel simetris, toolbar datar), font `Inter`.

Meniru halaman **Template usages** Canva:
* **Toolbar**: brand (5 + "Semua brand"), audiens (Free & Pro / Free / Pro), rentang tanggal (Last 7/30/90 days, This month, Last month, kustom). Filter disimpan di URL query.
* **KPI**: Total Applies, Total Usages + delta % vs periode pembanding (panah hijau/merah); tier terbaru per brand.
* **Periode pembanding & persen ala Canva** (dicek dari request dashboard Canva Chital, 2026-10-29): rentang `from`..`to` sepanjang N hari dibanding `from − (N−1)` .. `from` (hari `from` ikut di kedua periode; Last 30 days 29 Sep–29 Okt → 30 Agu–29 Sep). Persen = rata-rata per hari: total sekarang ÷ hari yang sudah selesai vs total pembanding ÷ N (`comparisonRange().scale`). Chital: −22,5% / −8,1%, Canva menampilkan 23% / 8% (dibulatkan). "Sebelumnya" tetap menampilkan total mentah periode pembanding. Rumus sama untuk semua brand.
* **Grafik area** Applies & Usages harian (recharts), catatan "data 7 hari terakhir mungkin belum lengkap".
* **Tabel template**: thumbnail, judul, lisensi, Published, Total Applies + delta, Total Usages + delta, task/designer tertaut, rasio Usages/Applies. Kolom angka bisa diurutkan. Template yang terbit dalam rentang diberi label "baru".
* **Paginasi server-side**: baris per halaman 10/25/50/100 (default 25), "1–25 dari N". Agregasi `SUM` per template + `LIMIT/OFFSET` di SQL (`Prisma.sql`).
* **Drawer template**: grafik harian, keyword, tautkan/ganti task.
* **Status sync per brand**: run terakhir + status (`OK` / `NEEDS_LOGIN` / `ERROR`), peringatan bila > 48 jam tanpa data.
* Belakangan: agregasi per designer, baris "Performa Canva" di task drawer.

## 8. Fase

| Fase | Isi | Di mana |
| :--- | :--- | :--- |
| 1 | Skema + seed `canvaBrandId`, parser, API ingest/runs/known-ids, jalur unggah manual, pencocokan task | MacBook (repo) |
| 2 | Extension Chrome "Sinkronkan sekarang", diuji 1 brand di MacBook, deteksi paginasi | MacBook (`tools/canva-insights-extension/`) |
| 3 | Halaman `/insights` | MacBook (repo) |
| 4 | Pasang extension di profil Chrome tim yang memegang akun brand; rutinitas sinkron harian | Chrome user |
| 5 | Agregasi designer, widget task drawer | nanti |

## 9. Pertanyaan terbuka
* ~~Nama parameter token paginasi~~: `continuation` (2026-10-28).
* Konfirmasi `F=B` = Free (cek template dengan `0 = "none"`).
* **Thumbnail template**: dengan parameter dashboard pun `m[0].C` kosong (sinkron zahra 2026-10-28: judul 1.236/1.236, thumbnail hanya 50 dari fixture HAR). Sumber URL thumbnail yang dipakai dashboard Canva belum diketahui.
* Arti `d`, `N`, `O` di metadata template dan `A`, `D`, `E`, `G` (serta pastinya `F`) di `tier_scores`.
* ~~Apakah `TaskCanvaLink` berisi desain sumber template~~: **tidak** (2026-10-28, §6).

## 10. Risiko
* Sinkronisasi bergantung pada klik manual per brand (§3.1 butir 2): data bisa tertinggal bila lupa; mitigasi peringatan > 48 jam di `/insights`.
* Endpoint internal, bisa berubah/diblokir: mitigasi payload mentah + parser bervers + fail-closed + peringatan sync.
* Ketentuan layanan Canva: read-only, data akun sendiri, 1×/hari, berurutan, dari browser asli di jaringan rumah.
* HAR berisi cookie/token aktif: jangan commit HAR; logout + login ulang kelima akun setelah HAR dibagikan.

## 11. Riwayat keputusan (sesi 2026-10-28, Claude di claude.ai project "Can-Product Monitor")
1. Pemetaan endpoint dari HAR Chital; `C`=Applies, `D`=Usages dikonfirmasi.
2. Ditolak: integrasi server langsung ke Canva (alasan §3.1). Dipilih: collector di browser → API ingest dashboard.
3. User: 5 brand; tabel berhalaman + rentang tanggal seperti dashboard Canva; hari UTC; collector terpisah dari extension Canva keyword.
4. HAR zahra.art, impro, UiCreative.net, Antler: kelima brandId lengkap; tiap brand akun login sendiri; paginasi via token `B` (`limit` = baris); `F` hanya dengan `contentRoyalties`.
5. Collector dipindah dari Chrome extension ke **script Playwright + launchd di iMac rumah** (iMac selalu menyala).
6. Ditemukan field `I` (ID desain sumber) dan `0` (lisensi) di metadata template → pencocokan task lewat ID desain jadi metode utama.
7. Fixture HAR yang sudah dibersihkan: `scratch/canva-insights-fixtures/*.json` (gitignored).
8. (Claude Code) Playwright terkena pemeriksaan Cloudflare yang tidak lolos → user memilih **kembali ke extension Chrome** (klik per brand). `tools/canva-insights-collector/` dihapus; logika urutan kerja/paginasi dipakai ulang di `tools/canva-insights-extension/`.
