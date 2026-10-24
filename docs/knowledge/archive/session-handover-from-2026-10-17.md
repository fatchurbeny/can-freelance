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
