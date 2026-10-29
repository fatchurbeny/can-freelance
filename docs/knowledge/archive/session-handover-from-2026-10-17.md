# Session Handover Archive — sejak 2026-10-17

Entri yang dipindah dari `session-handover.md`. Cari dengan `grep`; jangan dibaca utuh.

### 2026-10-18 — Graphify auto-discovery (Claude Code, `🏛️ [Architecture & Knowledge Ops]`)
* **Knowledge Graph hanya lokal**: `src/lib/dev-tools.ts` (`DEV_TOOLS_ENABLED` = bukan produksi). Di build produksi halaman `/knowledge-graph` & API → 404, menu disembunyikan, `graph.json` dikecualikan dari tar `deploy-vps.sh` (salinan lama di VPS tidak terhapus otomatis). Tambah `src/app/not-found.tsx` bergaya aplikasi. Fix fetch tanpa basePath di `GraphifyVisualizer` & `/content-access`. Diuji dengan `next build` + `next start` lokal.
* `graphify-parser.ts` kini menemukan otomatis: page/layout, semua `src/app/actions/*` (`action:`), route handler (`api:`), komponen di subfolder + yang ditaruh di `src/app`, semua `src/lib/*` (`lib:`), dan 25 model dari `schema.prisma`. Link dari import yang di-resolve ke file (termasuk `import()`), plus `prisma.<model>.` → `queries`. Link manual yang target-nya hilang dibuang dengan peringatan; script exit 1 bila gagal.
* Sebelumnya file `src/app/actions/*.ts` & `route.ts` tercatat salah sebagai `page:`; model `Brand`/`ContractRate`/`BillingStatement` (sudah tidak ada) dihapus. Hasil: 239 node, 545 link, semua model punya link; output deterministik.

### 2026-10-17 — DevOps & Release Deployment to Biznet GIO (Antigravity, `🛡️ [DevOps & Release]`)
* Production build Next.js 16 standalone sukses dikompilasi dari branch `chore/knowledge-token-savings`.
* Database PostgreSQL VPS Biznet GIO (`103.89.5.148`) dimigrasikan via `vps_migration_step.sql` (hanya di VPS, tidak ada di repo) + `prisma db push`: menambahkan tabel `platforms`, `production_units`, `dropbox_connections`, `bundles`, `bundle_items`, `bundle_orders`, `users`, `memberships`, `sessions`.
* Menjalankan backfill data awal idempoten (`scripts/backfill-multi-production.ts`): 316 tasks, 20 doctypes, 5 accounts terhubung ke Platform Canva & Production Unit Freelance Lamongan.
* Inisialisasi user Admin pertama `FT-001` via `scripts/create-admin.ts`.
* Rilis standalone diekstrak ke `/www/wwwroot/can-freelance-app/.next/standalone`, static chunks Nginx disinkronkan, upload persisten ditautkan (`storage/uploads`), dan reload PM2 berjalan zero-downtime.
* Verifikasi endpoint live via HTTPS Cloudflare: `/can-freelance` (307 redirect ke unit Lamongan), `/production` (200 OK), `/billing-statement` (200 OK).

### 2026-10-18 — Graphify auto-discovery & Knowledge Graph hanya lokal (Claude Code) — detail di archive.
* Lanjutan (branch `chore/kg-stats-api-review`): statistik header Knowledge Graph dihitung dari `graph.json`. `/api/palette/strip` & `/api/uploads/[filename]` sengaja publik (diambil Notion tanpa cookie); uploads kini hanya melayani webp/png/jpg + `nosniff`.
* Uji browser lokal: edit keanggotaan multi-baris, Reset PIN, Nonaktifkan, dan toggle `isAgency` lolos. Fix: ganti role di drawer tidak lagi me-reset production ke unit pertama. Akun uji `FL-002` (QA Test Lokal, nonaktif) ada di DB lokal.

### 2026-10-18 — Healthcheck gerbang login di deploy (Claude Code, `🛡️ [DevOps & Release]`)
* Cek live 2026-10-18 (sesi lain): gerbang login VPS **sudah aktif** — `/can-freelance` & `/production` → 307 ke `/can-freelance/login`, `/login` → 200 tanpa `WWW-Authenticate` (Basic Auth Nginx sudah mati), API → 401. Cara deploy memuat `.env` tidak diubah.
* `scripts/deploy-vps.sh`: healthcheck loopback kini mewajibkan `/can-freelance/production` tanpa cookie → 307 ke `/can-freelance/login` dan `/can-freelance/api/notion/databases` → 401 (retry 10×2 dtk); selain itu exit 1. Dulu 200/307/401 dari `/can-freelance` dianggap lolos. Diuji lokal (dev 3002); belum dijalankan ke VPS.
* Temuan: rilis standalone ikut membawa `backups/*.dump` (dump DB lokal), `CLAUDE.md`, `Dockerfile` karena output tracing. Belum ditangani.

### 2026-10-20 — Drawer bersusun untuk Edit Design Brief (Claude Code, `🎨 [Frontend & UI/UX]`)
* Branch `feat/bundle-order-designer`. Komponen baru `task-detail/DesignBriefEditorDrawer.tsx` (portal ke `body`, 540px, kanan) berisi palette picker + `TaskBodyEditor`; helper `mergePaletteMarkdown` & `BRIEF_EDITOR_SHIFT_CLASS` (`min-[1100px]:right-[540px]`).
* Dipakai di `TaskDetailSheet` (via `DesignBriefSection`, `z-[60]`, autosave tetap debounce 1,5 dtk) dan `CreateTaskSlideModal` (`z-80`; tersimpan saat Save Task). Drawer utama kini hanya menampilkan preview (live) + tombol Edit, dan bergeser ke kiri saat editor terbuka. Di layar <1100px editor menimpa drawer utama.
* Escape saat editor terbuka hanya menutup editor (listener capture + `stopImmediatePropagation`).
* Diuji di browser lokal (1440px): kedua drawer, preview live, Escape.
* Section **Custom Fields** dihapus dari task drawer (permintaan user). `Task.customFields` tetap disimpan & disinkron dari Notion, hanya tidak ditampilkan.
* Tombol **Acak** di kartu Color Palette (preview brief, hanya role `task.edit`): `shufflePaletteMarkdown` di `brief-parser.ts` mengacak urutan hex lalu menulis ulang baris `Swatches` + role (Primary, Accent, Secondary, Neutral, Background). Di task drawer langsung tersimpan (autosave + push Notion); di buat task tersimpan saat Save Task. Diuji di drawer buat task.
* Semua belum di-commit (user cek sendiri dulu).
* **Dirilis ke VPS 2026-10-20** (`npm run deploy:vps`, `🛡️ [DevOps & Release]`) dari working tree `feat/bundle-order-designer` termasuk perubahan di atas yang belum di-commit; healthcheck gerbang login lolos. Tanpa perubahan skema Prisma.

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

### 2026-10-24 — Asset Library: jalur manual + mirror Notion (Claude Code, `⚙️ [Backend & Database]`, `🎨 [Frontend & UI/UX]`, `🔄 [API & Notion Integration]`)
* Branch `feat/asset-library` di worktree `.claude/worktrees/asset-library` (sesi lain sedang mengerjakan share link task di checkout utama). Belum di-commit.
* Skema baru `AssetCategory`, `Asset`, `TaskAsset`, `NotionDatabase.purpose`; diterapkan ke DB lokal lewat SQL tambahan saja (bukan `db push`, agar tabel `task_share_links` sesi lain tidak terhapus). VPS perlu `db push` saat rilis.
* Permission `asset.view` (semua role) & `asset.manage` (Admin/AD/PM). Halaman `/assets`, picker **Ambil dari Library** di drawer Edit Design Brief (2 stage), kartu Assets di preview brief, kartu Asset Library di Notion Config. Detail: `modules.md`, `data-flows.md`, `entities.md`, issues #34.
* Relation `Assets` untuk production yang sudah ada dibuat manual per production (mengubah skema database live tim).
* Diuji lokal (`AUTH_MODE=off`, port 3012): tambah aset, validasi `/edit`, embed & cover thumbnail Canva, judul otomatis oEmbed, picker + Escape, preview brief, mobile 375px & dark.
* **Uji tulis Notion lolos** (disetujui user): database **Asset Library** dibuat di page Impro-Freelance (terdaftar `purpose=asset_library` di DB lokal); push aset (properti + 1 blok embed); edit di Notion → Sync di `/assets` → catatan & tag masuk app; arsip dari app → Status Arsip di Notion, embed tidak dobel. Relation `Assets` dibuat **hanya di SC-Canva** (kolom balik "Related to slides-colony (Assets)" di database aset).
* **Belum diuji**: brief task → relation `Assets` terisi (butuh menyimpan brief task sungguhan) dan gating role via "Lihat sebagai". Aset uji "UJI Putry – …" sudah diarsipkan (app & Notion).
* Desain: https://claude.ai/artifact/HKviEpNcfcL5V7MD3iYjLj. Wireframe role belum diperbarui untuk permission baru.
* Lanjutan (belum di-commit setelah `4d01967`): canva.link di-resolve ke link /view; Production aset multi-select (`AssetProduction`, hanya platform `canva_link`); kontrak platform dibuat di Rate Card → Kontrak (`ContractDrawer`, periode + hari kerja Sen–Jum, edit per baris; wizard production hanya platform berkontrak); **Trial → Kontrak bundle** pakai `BundleContract` (lihat `business-rules.md`). Diuji lokal; data uji dibersihkan. **VPS perlu `prisma db push`** (asset_productions, bundle_contracts, bundle_orders.contract_id, platforms.contract_end_date).
* **Notion Config redesign** (desain https://claude.ai/artifact/YRw7bLhyXB641efBa2J8DN): satu halaman bertab Koneksi / Pages & Databases / Sinkronisasi / Asset Library / Email Notifikasi; `NotionDatabasesClient` dihapus. Database Asset Library di daftar database berlabel "Asset Library" (tidak bisa diarsipkan di sana). Juga: sidebar mobile `z-45` agar menutupi tab sticky. Diuji lokal desktop + 375px.

### 2026-10-24 — Share link publik task (Claude Code, `⚙️ [Backend & Database]` + `🎨 [Frontend & UI/UX]`)
* Model baru `TaskShareLink` (db push lokal sudah; **VPS perlu `prisma db push`**), permission `task.share` (Admin, AD, PM).
* Tombol Share di header task drawer → buat/salin/cabut link `/can-freelance/share/t/<token>`; satu link aktif per task, tanpa kedaluwarsa. Escape menutup panel saja.
* Halaman publik `/share/t/[token]` (proxy & sidebar dikecualikan, `noindex`): field allowlist + Design Brief. Detail di `modules.md`.
* Drawer menandai task ber-link publik: badge **Public view** di baris Last Edited + titik hijau di tombol Share (status dimuat saat drawer dibuka). Cabut link memakai konfirmasi inline (`confirm()` bawaan tertutup otomatis di browser in-app → cabut tidak jalan). Diuji di browser (Admin): cabut → 404, buat ulang, Escape hanya menutup panel.
* Dev server kedua: `npm run dev` membaca `PORT` (default 3002) & `next.config` membaca `NEXT_DIST_DIR`; preview `.claude/launch.json` memakai `.next-preview` + `autoPort` (Next 16 menolak 2 `next dev` di distDir sama).
* Diuji di build produksi lokal (port 3003): link aktif 200, token salah/dicabut 404, rute lain tetap 307 ke login; desktop + mobile 375px tanpa scroll horizontal. Dev server chat lain di 3002 perlu restart (Prisma client lama). Belum di-commit.

### 2026-10-24 — Designer bisa download statement sendiri (Claude Code, `🎨 [Frontend & UI/UX]`)
* `OwnBillingView` (billing untuk role designer) kini punya tombol **Download Statement** → `/billing-statement/print?designerId=<milik sendiri>&paymentMonth=…` (tab baru). Guard di print page sudah membatasi `billing.view.own` ke `designerId` sendiri.
* Print page: Rate/Poll tidak lagi hardcode `15000` (pakai `priceFor`, `-` bila belum ada harga); payout 0 untuk designer `Resign` (sama dengan halaman billing).
* Print page kini memuat **Order Bundle** yang masuk payout bulan itu (`getBundleOrdersForPeriod` → `payoutByDesigner`, designer Resign = 0): tabel bundle + Subtotal Satuan/Bundle + Total; ringkasan Total Payout = satuan + bundle. `OwnBillingView` juga memakai `payoutByDesigner` agar total sama persis.
* Deretan chip bulan di `OwnBillingView` diganti dropdown (`billing/OwnMonthSelect.tsx`, pakai `SelectDropdown`, ubah `paymentMonth` di URL); default = bulan terbaru (`availableMonths[0]`). Diuji desktop + mobile 375px.
* Tombol pakai `next/link` (bukan `<a>`) agar basePath `/can-freelance` ikut; `<a>` biasa → 404.
* Diuji lokal (Admin "Lihat sebagai" Putery): tombol muncul, print Putery Sept-2026 = IDR 2.700.000 (sama dengan billing), print designer lain dialihkan. Tabel bundle belum teruji visual: satu-satunya order lokal (Slides-Colony) task-nya masih Draft. Belum di-commit.
* Catatan: panel Notion Sync di sidebar sudah admin-only (`integration.manage`); PM/AD multi-production = beberapa baris Membership (by design).

### 2026-10-24 — Asset Library: jalur manual, tahap desain (Claude Code, `🏛️ [Architecture & Knowledge Ops]`)
* User memilih jalur **manual** (link edit + public view link, preview iframe `?embed`, tanpa Canva API/MFA). Rencana & skema di [`../backlog/resources-library.md`](../backlog/resources-library.md).
* Notion **opsi B** disetujui: app = input utama, database Notion "Asset Library" = mirror dua arah, relation "Assets" di database task untuk hitungan pemakaian.
* Desain 4 artboard: https://claude.ai/artifact/HKviEpNcfcL5V7MD3iYjLj. Belum ada kode/skema; menunggu review desain.

### 2026-10-25 — Model akses Asset Production & Asset Library (Claude Code, `🏛️ [Architecture & Knowledge Ops]`)
* Diputuskan (belum diimplementasi): permission baru `asset.view` (Admin, AD, PM, designer FT & FL) dan `asset.manage` (Admin semua; AD & PM production sendiri; library bersama hanya membership global). Aset/kategori punya `productionUnitId` opsional (terisi = Asset Production, null = Library). Dicatat di `user-role-spec.md` › Akses aset dan backlog `resources-library.md`. Tanpa perubahan kode.

### 2026-10-27 — Summary Order Bundle: nominal "menunggu task approved" (Claude Code, `🎨 [Frontend]` + `⚙️ [Backend]`)
* Aturan tetap: order bundle masuk payout hanya bila semua task approved (meski sudah Lunas). `getBundleOrdersForPeriod` kini mengembalikan `pendingTotal` (Payout Month = bulan ini, task belum semua approved).
* UI: kartu segmen "Order Bundle" dan header grup Payout Breakdown menampilkan "+ IDR x menunggu task approved"; baris order belum complete diberi badge amber. Commit `6c3057d`, dirilis ke VPS (healthcheck lolos); tampilan belum dicek visual.
* Notion: opsi select Doctype = `notionKey`, bukan `displayName` (displayName "PPTX, Slides, Keynote" ditolak karena koma). Create/update task & push sync kini kirim `notionKey` (`95cab85`, sudah di VPS).
* Dropbox `invalid_client`: `.next/standalone/.env` VPS tidak punya `DROPBOX_APP_KEY/SECRET`. Ditambahkan dari `.env` lokal (backup `.env.bak-*`), PM2 di-reload; probe token → `invalid_grant` (client valid). Refresh token tersimpan belum terbukti valid: bila sync Dropbox masih gagal, hubungkan ulang Dropbox dari VPS.
### 2026-10-24 — Asset Library, Notion Config bertab, kontrak platform & bundle (Claude Code, `⚙️ [Backend & Database]`, `🎨 [Frontend & UI/UX]`, `🔄 [API & Notion Integration]`)
* Branch `feat/asset-library` (worktree `.claude/worktrees/asset-library`), commit `d5cb65b` + merge `6baf129`. Rincian lengkap di arsip `archive/session-handover-from-2026-10-17.md`.
* Asset Library (`/assets`, mirror Notion, picker di Design Brief, Production multi-select hanya platform Canva), Notion Config satu halaman bertab, kontrak platform di Rate Card → Kontrak (periode preset 3/6/12 bulan atau Custom + hari kerja Sen–Jum; info field via ikon ⓘ `InfoTip` di semua form: wizard, User, Asset, Doctype, Core field — aturan `form-crud-rules.md` §9), **Trial → Kontrak bundle** via `BundleContract`. Production Hub: kolom Designer (punya task di production) & Doctype (aktif per platform). Overview: tab "Tanpa Brand" untuk task tanpa akun (issues #35). Aturan: `business-rules.md`; modul: `modules.md`; entitas: `entities.md`.
* **Rilis VPS 2026-10-24**: skema VPS ditambah via SQL aditif dari `prisma migrate diff` (tanpa DROP, 1 transaksi; 9 tabel baru termasuk `task_share_links`, kolom `contract_id`, `contract_end_date`, `purpose`, dll.) + 4 kategori aset default; `migrate diff` setelahnya kosong. `npm run deploy:vps` lolos healthcheck; log error PM2 bersih.
* Notion: database "Asset Library" di Impro-Freelance (uji) + relation `Assets` hanya di SC-Canva. Belum diuji: drawer Jadikan Kontrak bundle di browser (tak ada trial approved lokal), brief → relation `Assets`, gating role "Lihat sebagai". Wireframe role belum diperbarui.

### 2026-10-25 — Rilis Asset Library lanjutan (dipindah dari handover)
* Sub-tab Notion Config (Asset Library / Pages & Databases / Sinkronisasi, `?sub=`), impor aset dari database Notion (+ perbarui judul & tag), `canva_design_id` unik, pindai database di sub-page, ikon & ilustrasi kategori (3D, Shape & Label), info field via `InfoTip`, preset periode kontrak, kolom Designer/Doctype di Production Hub, tab "Tanpa Brand" di Overview.

### 2026-10-25 — Batas akses aset per role (Claude Code, `🛡️ [Security]`/`🎨 [Frontend & UI/UX]`)
* `asset.view` dicabut dari Finance & Viewer. `asset.manage` kini per production: helper `canManageAsset`/`canManageAllAssets` (`permissions.ts`), guard `denyAssetScope`/`denyAssetGlobal` di `actions/assets.ts`; UI `/assets` menyembunyikan Sync/+Kategori untuk non-Admin, Edit/Arsip hanya aset production sendiri, form AD/PM wajib pilih production sendiri. Baris "Asset Report" di matriks. Detail: `user-role-spec.md` › Akses aset.
* Diuji: Lihat sebagai PM uji `FT-002` (Lamongan, kini **nonaktif**) + skrip helper (14 kasus). Simpan aset sebagai PM tidak diuji di browser (pratinjau hanya-baca). Commit `23736dd`, **dirilis ke VPS 2026-10-25** (port SSH 2222, tanpa perubahan skema); healthcheck lolos, `/assets` & `/asset-report` → 307 login.
* Commit `f3bd86c` di `feat/bundle-order-designer` memuat versi **rencana** Akses aset (`productionUnitId` tunggal) → saat merge pakai versi branch ini.
* `.claude/launch.json` utama: `asset-library-dev` = AUTH_MODE=off (port 3012); `asset-library-auth` = worktree dengan login (port 3004).

### 2026-10-25 — Rilis Asset Library lanjutan (Claude Code, `🎨 [Frontend & UI/UX]`, `🔄 [API & Notion Integration]`, `🛡️ [DevOps & Release]`)
* **Asset Report** (`/asset-report`, menu di bawah Production, sub-menu per kategori; desain https://claude.ai/artifact/1bRjBCU85gn84C85Cm27Lb): diuji lokal dengan data uji sementara (sudah dihapus); **dirilis ke VPS 2026-10-25** (`8f8e837`, tanpa perubahan skema). Wireframe role belum diperbarui untuk menu ini.

### 2026-10-28 — Canva Insights Fase 1 + merge Asset Library (Claude Code, `⚙️ [Backend & Database]` + `🔄 [API & Notion Integration]` + `🏛️ [Knowledge Ops]`)
* Spek: [`canva-insights-spec.md`](canva-insights-spec.md), brief: [`../backlog/canva-insights-implementation.md`](../backlog/canva-insights-implementation.md), mapping field: [`../canva-insights-endpoints.md`](../canva-insights-endpoints.md).
* `fccb674`: 6 model `Canva*` + `Account.canvaBrandId`, `src/lib/canva-insights/*`, route `/api/insights/{ingest,runs,known-ids}`, action `canva-insights.ts`, script `seed-canva-brands.ts` & `import-canva-insights.ts`. Parser lolos 4 fixture (total breakdowns = acuan brief), data rusak & brand asing ditolak.
* `b5d4a03`: merge `feat/asset-library` (konflik skema = gabung kedua sisi; `user-role-spec` Akses aset = versi asset-library). `tsc` lolos.
* DB lokal: skema gabungan diterapkan lewat SQL aditif (tanpa DROP). Data aset dipulihkan dari VPS (`pg_dump --data-only` `asset_categories` + `assets`: 7 + 142 baris), `notion_databases.purpose = asset_library` dipasang ulang di "Asset Library". 1 baris `asset_productions` lokal (data uji) tidak bisa dipulihkan.
* **Fase 1 terverifikasi di DB lokal**: 5 brand ter-seed (Chital = akun "Chital Graphic"), 4 fixture diimpor, total breakdowns = acuan brief, impor ulang idempoten, batch rusak `REJECTED` tanpa perubahan data, API HTTP 200/401/403/413/422 sesuai. `INSIGHTS_INGEST_TOKEN` lokal ditambahkan ke `.env`.
* **Tautan task**: link task = `canva.link` ke desain kerja, bukan desain sumber `I` → `design_id` 0/200. Aturan judul diperluas (nama task + satu kata jenis): 21 tertaut, 0 ambigu. Detail spek §6.
* **Fase 2 = extension Chrome** (`tools/canva-insights-extension/`, MV3, dikecualikan dari tsc/eslint): popup "Sinkronkan sekarang" (+ opsi 365 hari), Pengaturan (URL dashboard, token, uji koneksi), header via `webRequest`, fetch di tab (MAIN world), status & badge. Diuji: 7 tes logika + `test/background-e2e.mjs` (`chrome` & Canva palsu → API lokal: OK, paginasi terdeteksi, cookie/token tidak bocor; data uji Chital dihapus).
* **Keputusan**: jalur Playwright + launchd (commit `f963258`) dibatalkan karena Cloudflare "Verify you are human" tidak lolos walau dicentang user; folder `tools/canva-insights-collector/` dihapus, profil Chrome-nya di `~/Library/Application Support` juga dihapus.
* **Berikutnya (butuh user)**: load unpacked extension di Chrome, isi URL `http://127.0.0.1:3002/can-freelance` + token lokal (`.env`), buka dashboard Creator zahra, Sinkronkan (centang 365 hari); bandingkan 1 template dengan dashboard Canva; catat parameter paginasi di spek §1.3/§9. `https://portal.fatchurbeny.com` sudah ada di `host_permissions`.
* Fase 3 wajib: jangan jumlahkan `audience = "ALL"` bersama `B`/`C` (spek §4).


### 2026-10-28 — Canva Insights Fase 1–2 + merge Asset Library (Claude Code, `⚙️ [Backend & Database]` + `🔄 [API & Notion Integration]`)
* Detail lengkap sesi ini di arsip (`grep "Canva Insights Fase 1" archive/`). Spek: [`canva-insights-spec.md`](canva-insights-spec.md), brief: [`../backlog/canva-insights-implementation.md`](../backlog/canva-insights-implementation.md).
* **Fase 1 selesai & terverifikasi** di DB lokal (skema, parser, API ingest/runs/known-ids, impor manual, 5 brand ter-seed). Tautan task lewat judul (21/200); ID desain tidak bisa dipakai (spek §6).
* **Retensi payload** dibuat (spek §4): payload > 60 hari dikosongkan, batch > 365 hari dihapus, otomatis setelah run selesai. Proyeksi DB 5 brand: ±270–310 MB tahun pertama, lalu ±115 MB/tahun.
* ⚠️ Timestamp yang ditulis Prisma (adapter `pg`) **tampak** −7 jam bila dibaca langsung di psql (sesi Asia/Jakarta); lewat Prisma (termasuk `$queryRaw`) nilainya kembali benar. Jangan bandingkan kolom timestamp dengan `now()` di SQL; hitung batas waktu di JS.
* **Fase 2 = extension Chrome** `tools/canva-insights-extension/` (Playwright + launchd dibatalkan: Cloudflare tidak lolos). Popup status jelas + panel slide-over di halaman Canva Creator + notifikasi. **Sinkron asli zahra.art 365 hari OK** (2.594 halaman, 247 ribu baris, Applies = Canva persis; paginasi `continuation`). Endpoint templates kini memakai parameter dashboard (sebelumnya hanya 64/1.186 judul, tanpa thumbnail): sinkron ulang 14 hari di Yab OK (4 menit): judul 1.236/1.236; **thumbnail belum** (respons tanpa URL, spek §9); tertaut task 11 dari 104 task Zahra. Extension tahan Yab: status di memori service worker (Yab menolak `storage.local.set`), kolom token tidak di-autofill pengelola password. **Chital Graphic 365 hari OK** (2026-10-29, 2.313 halaman, 1.336 template; Applies 30 hari = Canva persis; Usages beda hanya baris hari ini yang dihitung Canva setelah halamannya dimuat). Run Chital 2026-10-28 tertinggal RUNNING karena server 3002 mati di tengah jalan; Yab menulis error jaringan sebagai "Load failed". Persen pembanding kini mengikuti Canva (periode 30 Agu–29 Sep, rata-rata per hari) dan hari yang belum selesai tidak disimpan; Chital = Canva persis (141.620 / 77.754). Pembersihan SQL sempat menghapus baris 28 Okt yang sah karena `updated_at` bergeser −7 jam; dipulihkan dengan reparse batch. Postgres sempat mati 11:34 WIB (smart shutdown). Sisa: Antler, Improstd, UICreative.net.
* **Berikutnya (butuh user)**: load unpacked, URL `http://127.0.0.1:3002/can-freelance` + token lokal (`.env`), sinkronkan zahra (centang 365 hari), bandingkan 1 template dengan Canva, catat parameter paginasi di spek §1.3/§9. **Fase 3 dibangun**: tab "Canva Insights" di Production (permission `insights.view`; diverifikasi di dev `AUTH_MODE=off` port 3013, config `insights-noauth`). Sisa: drawer template + tautkan task manual, perbarui wireframe role. Desain https://claude.ai/artifact/DdcA2ANNvf8tK4VR6QEUVy ( jangan jumlahkan `audience = "ALL"` bersama `B`/`C`).


### 2026-10-29 — Rencana Master Deck Builder (Claude, `🏛️ [Architecture & Knowledge Ops]`, tanpa perubahan kode)
* Rencana: task production **output Dropbox** yang masuk status QA otomatis diantrekan ke Master Deck (analisis .pptx/.pdf → review → rebuild slide master → simpan ke `/_master/` di folder task + properti Notion "Master Deck"). Production Canva tidak ikut. Flow: https://claude.ai/artifact/XoQAVhocSqm7r9cHjYMTMM · desain UI: https://claude.ai/artifact/5vK7jUxXuAWGWZDV76TETE
* Keputusan usulan: satu fungsi `enqueueMasterDeckJobs()` (dipanggil dari `updateTaskStatusAction`, akhir `syncNotionData`, Sync Now), idempotent per task + `content_hash`; file diambil via `files/list_folder` + `files/download` (scope `files.content.read` sudah ada); simpan `Task.dropboxFolderPath` saat `attachUploadRequest` (path dihitung dari nama/bulan task, meleset bila task di-rename); worker PM2 terpisah di VPS (python-pptx + LibreOffice); model `MasterDeckJob`; tab "Master Deck" di production Dropbox; permission `masterdeck.review`.
* Diputuskan user: checklist kartu (Preview, Master Slides, Keynote, PPT, PPTX; field checkbox Notion) jadi gerbang QA → In Review; PDF wajib; file satuan tanpa .zip. Catatan perbaikan: Dropbox VPS `invalid_client`, scope `files.content.write`. Rincian: [`../backlog/master-deck-builder.md`](../backlog/master-deck-builder.md).
* Lanjutan (sore): checklist disimpan di **body kartu Notion** (`## ✅ Checklist QA`, blok to-do), bukan properti database; kartu kanban hanya indikator n/5; detail di tab ketiga drawer (Design Brief · Checklist QA · Comments). Satu Slide Master Builder global untuk semua production Dropbox, filter Production + dibatasi Membership. **Design handoff**: [`../../design-handoff/IMPLEMENTATION-slide-master-builder.md`](../../design-handoff/IMPLEMENTATION-slide-master-builder.md) + wireframe di `design-handoff/slide-master-builder/`. Push to-do ke Notion (`markdownToNotionBlocks`) belum didukung.
* Dokumen dirapikan (malam, Claude, `🏛️ [Architecture & Knowledge Ops]`): backlog disamakan dengan spec (halaman global, tanpa properti/tab "Master Deck"); spec ditambah gerbang di **dua jalur** status (`updateTaskStatusAction` + dropdown `updateTaskFieldsAction`) via helper `assertChecklistAllowsStatus`, kind `checklist` di `orderBriefMarkdown`, autosave brief harus menjaga section checklist, risiko push seluruh body, permission `masterdeck.review`, backfill task lama. `Main.dc.html` disamakan dengan canvas `1793257954-053f`. **Diputuskan user**: item checklist **ikut Doctype** (kolom baru `Doctype.qaChecklist`, SQL aditif; Doctype presentasi = 5 item). F1 siap dimulai.


### 2026-10-29 — Slide Master Builder: rencana (commit `233671e`) + F1 Checklist QA (Claude, `⚙️ [Backend & Database]` + `🎨 [Frontend & UI/UX]` + `🔄 [API & Notion Integration]`)
* Rencana & keputusan: [`../backlog/master-deck-builder.md`](../backlog/master-deck-builder.md) · spec: [`../../design-handoff/IMPLEMENTATION-slide-master-builder.md`](../../design-handoff/IMPLEMENTATION-slide-master-builder.md) (§7 = status F1). Riwayat diskusi di arsip (`grep "Master Deck" archive/`).
* **F1 dibuat, belum di-commit**: kolom `Doctype.qaChecklist` (SQL aditif `prisma/sql/2026-10-29-doctype-qa-checklist.sql`, sudah dijalankan di DB lokal, **belum di VPS**); `src/lib/checklist-qa.ts` (parser/gerbang/status); `markdownToNotionBlocks` kini membuat blok `to_do`; gerbang QA → In Review di `updateTaskStatusAction` + `updateTaskFieldsAction`; section dibuat saat task dibuat / masuk QA / Doctype diganti saat Draft; autosave brief menyambung kembali section; `toggleChecklistItemAction` (baca checklist terbaru dari Notion sebelum push); UI: indikator kartu, tab Checklist QA (`ChecklistQASection.tsx`), editor di `DoctypeSlideModal`.
* Diverifikasi di port 3013 (`AUTH_MODE=off`): alur app (task `app_created_` "Trial Slides Colony") dan push/pull Notion (task Notion "Test Fase 6 Task"): to-do terkirim, centang Notion masuk lewat Sync Now, centang Notion tidak tertimpa saat app mencentang, section tetap di akhir setelah edit brief. Kedua task uji dikembalikan ke kondisi awal (DB + Notion). Batas: dalam 2 menit setelah push body, aksi centang tidak membaca Notion dulu.
* **Fallback Notion diperbaiki** (belum di-commit): `createTaskAction` dulu diam-diam menyimpan task `app_created_…` bila halaman Notion gagal dibuat. Kini pembuatan halaman ada di `createNotionTaskPage()` (qa.ts), kegagalan mengembalikan `notionWarning` (toast di modal buat task, duplikat, order bundle), drawer menampilkan banner + tombol **Buat di Notion** (`createMissingNotionPageAction`, aman dari klik ganda), dan sync Notion dilewati untuk task belum tertaut (`isNotionLinked`, `src/lib/notion-link.ts`). Diuji lewat tombol drawer pada "Trial Slides Colony" → tertaut ke `4080e19a-a135-81c6-90c6-ef3a6e6ed08a`; 2 halaman uji lain diarsipkan (Trash Notion). Jalur gagal saat membuat task baru belum diuji di UI.
