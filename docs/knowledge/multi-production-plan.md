# Multi-Production Plan (Production → sub-unit per platform)

> Sumber desain: wireframe "Add Production Flow" (Claude Design canvas).
> Aturan eksekusi: **1 fase = 1 sesi Claude**. Mulai sesi dengan:
> `Kerjakan Fase N dari docs/knowledge/multi-production-plan.md`.
> Akhiri setiap fase dengan `npx tsc --noEmit` + update `session-handover.md` + centang checklist di file ini.

## Keputusan yang sudah dikunci
- Notion: **1 database Task per production**. Designer, Doctype, Account tetap di **Postgres**; di Notion jadi properti **Select** yang opsinya diisi dari Postgres.
- Designer = master (dipakai semua production). Doctype & Account = **per platform**.
- Design Status = **Select** saat dibuat dari platform; sync tetap membaca Select maupun Status. Role tetap di tabel `DesignStatus` (match by nama, ejaan "Aproved" dipertahankan).
- Output per platform: Canva → Canva Link; Envato Elements → Dropbox Link via **File Request per task**.
- Overview: skip dulu. Billing: group per production. Kanban & custom field: didiskusikan sambil jalan.
- Freelance Lamongan = production pertama (platform Canva), data lama tidak boleh berubah.

---

## Fase 1 — Skema database (Prisma) ✅
**Scope:** `prisma/schema.prisma`, migration, seed script.
- [x] Model `Platform` (id, name, slug, outputType: `canva_link` | `dropbox_link`).
- [x] Model `ProductionUnit` (id, name, slug unik, platformId, notionTaskDbId, notionParentPageId?, fieldMapping Json, dropboxRoot?, isActive, createdAt).
- [x] `Task`: + `productionUnitId` (nullable dulu), `customFields Json?`, `outputUrl String?`, `uploadRequestUrl String?`.
- [x] `Doctype` & `Account`: + `platformId`; unique `notionKey` → `@@unique([platformId, notionKey])`.
- [x] Seed/backfill: `scripts/backfill-multi-production.ts` (idempotent) membuat Platform "Canva" + ProductionUnit "Freelance Lamongan" (fixed ID `…0001` / `…0101`, notionTaskDbId dari `NotionDatabase` ter-decrypt). `prisma/seed.ts` disesuaikan ke unique compound.
- [x] Setelah backfill: `productionUnitId` & `platformId` required (NOT NULL). Default transisi masih ada di schema (lihat komentar) — hapus di Fase 5.
**Done:** `npx prisma generate` + `tsc` lolos (exit 0); jumlah task Lamongan = 316, sama dengan backup pra-migrasi (`pg_dump`).
**Catatan eksekusi:** `db push` langsung gagal menambah FK karena baris platform belum ada → urutan yang dipakai: DDL tanpa FK → backfill → `db push` (FK) → `migrate diff` kosong.

## Fase 2 — Routing & Sidebar ✅
**Scope:** `src/app/production/**`, `Sidebar.tsx`, `queries.ts`, `revalidatePath` di `actions/*`.
- [x] Route `src/app/production/[slug]/page.tsx` (isi = page production sekarang, difilter `productionUnitId`).
- [x] `/production` → halaman **Production Hub** (tabel unit + tombol Tambah) sesuai wireframe layar 0.
- [x] Sidebar: Production jadi parent + submenu dinamis dari `ProductionUnit` + link "Tambah Production".
- [x] Ganti `revalidatePath('/production')` → `revalidatePath('/production', 'layout')`.
- [x] Redirect bookmark lama `/production?…` tetap jalan.
**Done:** Lamongan tampil identik di `/production/freelance-lamongan` (diverifikasi: 200; `/production?period=all` → 307 ke unit + query; slug tidak ada → 404).
**Catatan:** tombol "Tambah Production" (hub & sidebar) masih disabled sampai wizard Fase 5. Sidebar memuat unit via `getProductionUnitsAction` (`src/app/actions/production-unit.ts`).

## Fase 3 — Sync per production + field mapping ✅
**Scope:** `src/lib/sync-notion.ts`, `background-sync.ts`, `actions/sync.ts`, `notion-body-push.ts`.
- [x] Loop sync per `ProductionUnit` aktif (bukan satu DB global).
- [x] Ganti nama properti hardcode → `fieldMapping` (default = nama sekarang, termasuk alias typo `Date Completd`, `Created date`). Resolver: `src/lib/production-field-mapping.ts`.
- [x] Lookup Doctype/Account scoped by `platformId`.
- [x] Simpan custom field ke `Task.customFields` (semua properti Notion yang tidak terpetakan).
- [x] Sidebar "Terakhir Sync" tetap jalan (agregat semua unit).
**Done:** sync Lamongan menghasilkan angka status sama (Approved 283, Aproved-Profile Only 18, dll) — diverifikasi dengan sync incremental nyata (12 task diperbarui, 0 gagal).
**Catatan:** default transisi `platformId`/`productionUnitId` BELUM dihapus — create path di `rate-card.ts`, `qa.ts`, `designer.ts` belum meneruskan unit/platform (di luar scope Fase 3); dipindah ke Fase 5. Push outbound (`pushPendingLocalChangesToNotion`) masih memakai nama properti hardcode; hanya DB tujuannya yang per-unit.

## Fase 4 — Notion provisioning service ✅
**Scope:** file baru `src/lib/notion-provision.ts`, `actions/production-unit.ts`.
- [x] `createTaskDatabase(parentPageId, unit, customFields)` → buat DB + core properties.
- [x] Isi opsi Select: Design Status (dari `DesignStatus`), Designer (master), Doctype & Account (platform).
- [x] `validateExistingDatabase(dbId)` → laporan cocok / alias / properti hilang + "Tambahkan".
- [x] Hook: tambah Designer/Doctype/Account di platform → tambah opsi Select di Task DB terkait.
- [x] Idempotent (bisa diulang tanpa duplikasi).
**Done:** tes live berhasil — 1 DB uji dibuat di page uji (`dd6e8482-23b5-4ac2-94b4-89eb87b6df35`), validasi: 21 cocok, 0 alias/hilang/tipe beda. Status option sudah diterima API tanpa `groups`. DB uji perlu dihapus manual di Notion.
**Catatan:** `src/lib/notion-provision.ts` (create, validate, `addMissingProperties`, `ensureSelectOptions`) + action di `src/app/actions/production-unit.ts`. Hook `syncPlatformOptionsToNotion` sudah ada, tetapi BELUM dipanggil dari `designer.ts` (tambah account) dan `rate-card.ts` (tambah doctype) — di luar scope Fase 4, perlu disambung. Status options dibuat tanpa `groups` (belum diverifikasi ke API live).

## Fase 5 — Wizard UI (layar 1,2,3,5,6,7) ✅
**Scope:** `src/app/production/new/**`, `src/components/production-wizard/*` (atomik, <250 baris/file).
- [x] Stepper, Info Dasar, Notion Database (create/connect), Skema Field (core terkunci + custom field), Review, Progress, Success.
- [x] Ikuti invariant: Inter, `rounded-none` container, tabel 2 kolom simetris, `"use client"` baris 1.
- [x] Langkah 4 (Output) tampil sebagai placeholder untuk platform Dropbox sampai Fase 6.
**Done:** "Freelance Elements" dibuat end-to-end: platform Envato Elements (dropbox_link) ditambahkan, database Notion dibuat di page uji (`417e4182-1238-44ab-8490-3ce22bd6edb3`, validasi 21 cocok), unit tersimpan. Route `/production/new` 200. Output Dropbox tetap placeholder sampai Fase 6.
**Catatan:** Database "Freelance Elements" di page uji dan platform Envato Elements sengaja dibiarkan; hapus/rapikan bila tidak diperlukan.

## Fase 6 — Dropbox File Request 🟡 (kode selesai; tes OAuth & File Request menunggu koneksi akun)
**Keputusan:** auth = OAuth di dalam app (klik Connect sekali, refresh token terenkripsi di DB seperti Gmail).
**Status:** `DropboxConnection` (schema, refresh token terenkripsi), `src/lib/dropbox.ts`, route `api/dropbox/oauth/{start,callback}`, wizard langkah Output (hubungkan/putuskan), `src/lib/dropbox-output.ts` (File Request per task di background, properti Notion `Upload Link`, sync link folder → `outputUrl`). Output sync juga menulis properti Notion `Dropbox Link` (dibuat otomatis bila belum ada). Edit task di platform Dropbox tidak lagi memvalidasi link Canva.
**Catatan lanjutan (saat sistem role user dibuat):** di detail task, role **designer** hanya melihat **Upload Link**; role **admin** melihat **dua link**: Upload Link dan Dropbox Link (view).
**Sisa:** tes live (koneksi ulang, folder, File Request, sync output) — menunggu koneksi akun.
**Dulu butuh dari user (sudah terpenuhi):** Dropbox app (Scoped access) dengan scope `files.metadata.read`, `files.content.read`, `sharing.write`, `file_requests.write`; redirect URI `http://127.0.0.1:3002/can-freelance/api/dropbox/oauth/callback` (dan URI produksi); app key & secret ditaruh di `.env`. Juga persetujuan perubahan schema (tabel koneksi Dropbox) dan properti Notion `Upload Link` di database unit dropbox.
**Scope:** `src/lib/dropbox.ts`, env token, step 4 wizard, hook di sync.
- [ ] Koneksi akun Dropbox (token tersimpan terenkripsi via `encryption.ts`).
- [ ] Buat File Request per task (folder `/{root}/{Task Month}/{Task}/`), tulis ke properti Notion **Upload Link**.
- [ ] Saat sync: cek isi folder → shared link folder ke **Dropbox Link** / `outputUrl`.
- [ ] Validator output per platform (Canva tetap pakai `validate-template-link.ts`).
**Done:** designer uji upload tanpa akun, link muncul di task.

## Fase 7 — Billing per production + custom field display 🟡
**Scope:** `billing-statement`, `ApprovalPayrollTable`, task detail.
- [x] Billing Statement di-group per ProductionUnit (+ total keseluruhan). Tabel "Per Production" di summary (`src/components/billing/ProductionBreakdown.tsx`), total = `totalMonthlyPayout`; diverifikasi di browser (Lamongan IDR 4.830.000 = total).
- [x] Custom field tampil & editable di detail task (simpan lokal ke `Task.customFields`; tulis balik ke Notion belum).
- [ ] Diskusi tampilan Kanban per platform.

---

## Fase 8 — Bundle (paket multi-platform) 📝 (didiskusikan, belum ada kode)
**Keputusan (2026-10-16):**
- Doctype tetap per platform (tidak perlu grouping ulang). Dropdown Doctype Elements kosong karena datanya belum dibuat.
- Bundle = paket beberapa platform dengan **satu harga**, mis. Canva Slides 12 pages + Element PPT 20 slides = 115.000. Platform dan pages bisa bertambah.
- Harga 115.000 = **bayaran designer** yang disepakati (studio meng-hire freelance). Bukan harga jual ke klien.
- Tiap komponen bundle jadi task di board (ProductionUnit) masing-masing agar brief fokus; properti task boleh beda per board.
- Designer sama untuk satu order, tapi bisa berupa **agency** (studio) yang mendelegasikan ke designer di bawahnya. Cukup 1 user role untuk agency; delegasi diurus agency.
- `BundleOrder` dimasukkan ke **Billing Statement**, sehingga ada dua jenis billing: **Satuan** (per platform, rumus lama) dan **Bundle** (paket beberapa platform, harga paket).

**Penempatan UI (diputuskan 2026-10-16):** Rate Card punya tab Doctype, **Bundle**, Kontrak. **Kontrak = aturan per satu platform; Bundle = kontrak multi-platform** (komponen platform/doctype/pages + harga paket, opsional tanggal berlaku). Tab Kontrak menampilkan ringkasan bundle (read-only). Catatan: `contractRate` sekarang global (Rp 15.000/halaman); jika kontrak harus per platform, perlu field tarif per `Platform` — belum diputuskan.

**Skema usulan:**
- `Bundle` (name, price, isActive, notes), `BundleItem` (bundleId, productionUnitId, doctypeId, pages, sortOrder).
- `BundleOrder` (bundleId, designerId, period/bulan, status turunan dari task, harga snapshot).
- `Task` + `bundleId?`, `bundleItemId?`, `bundleOrderId?`.
- `Designer.isAgency` (Boolean, label saja). Diputuskan 2026-10-16: delegasi ke designer di bawah agency diurus agency di luar aplikasi; sub-designer tidak dicatat di sistem.

**Aturan billing:** task bundle dikecualikan dari rumus `qty_submit * pages * tarif`; harga paket dihitung sekali per `BundleOrder`, tidak dobel per board.

**Checklist:**
- [ ] Schema Bundle/BundleItem/BundleOrder + kolom Task (butuh persetujuan schema).
- [ ] Isi doctype platform Elements.
- [ ] Halaman kelola Bundle + form Bundle Order (membuat task per BundleItem, salin brief/brand/bulan).
- [ ] Billing Statement: seksi Satuan vs Bundle, kecualikan task bundle dari rumus lama.
- [ ] Tambah `Designer.isAgency` + tampilkan label di tabel/detail designer.

---

## Tips hemat kuota
- Satu fase per sesi; jangan minta "lanjut semua".
- Minta agent baca hanya file di **Scope** fase itu.
- Hindari full-file rewrite (sesuai skill ui-component-development).
- Jika sesi habis di tengah fase, cukup bilang: "lanjutkan Fase N, cek checklist".

## Glosarium istilah (Fase 8) — usulan, belum diterapkan di kode
| Istilah lama | Istilah baru (UI) | Arti | Catatan kode |
| :--- | :--- | :--- | :--- |
| Kontrak / `contractRate` (global Rp 15.000) | **Kontrak Platform** → field **Tarif Dasar per Halaman** | Kontrak satu platform; tiap `Platform` punya tarif dasar sendiri (Elements ≠ Canva) | Pindah dari `NotionConfig.contractRate` ke `Platform.baseRate`; `NotionConfig` jadi fallback sampai migrasi selesai |
| (baru) | **Bundle** / **Kontrak Bundle** | Kontrak multi-platform: komponen (platform, doctype, pages) + **Harga Paket** | `Bundle`, `BundleItem` |
| (baru) | **Order Bundle** | Satu pemesanan bundle, membuat task per board; masuk Billing Statement seksi Bundle | `BundleOrder` |
| Pool Score (`poolRate`) | tetap **Pool Score** | Bobot doctype; payout satuan = Pool Score × Pages × Tarif Dasar platform | Tidak berlaku untuk task bundle |
| Payout | **Payout Satuan** vs **Harga Paket** | Satuan = rumus per platform; Paket = harga tetap bundle (bayaran designer) | Billing Statement dipisah dua seksi |
| Tab Rate Card "Kontrak" | **Kontrak Platform** | Aturan + tarif per platform (selector platform) | Tab lain: Doctype, Bundle |
