# Brief Implementasi: Canva Insights Tracker

> **Untuk Claude Code di project `can-freelance`.** Dokumen ini adalah perintah kerja. Spesifikasi lengkap (endpoint, field, skema, alasan keputusan) ada di [`../knowledge/canva-insights-spec.md`](../knowledge/canva-insights-spec.md). Baca spek itu dulu, lalu kerjakan fase di bawah secara berurutan.

Dibuat: 2026-10-28 dari diskusi di claude.ai project "Can-Product Monitor". Pemilik: Beni (IKA).

---

## 0. Sebelum mulai

1. Ikuti protokol `CLAUDE.md`: baca `docs/knowledge/index.md`, `session-handover.md`, `roles.md`. Modul yang relevan untuk tugas ini: `entities.md`, `modules.md`, `form-crud-rules.md`, `sidebar-dropdown-pattern.md`, `user-role-spec.md` (bagian permission), dan `issues-and-fixes.md` (cari dengan `grep`, jangan baca utuh).
2. **Branch**: working tree saat ini ada di `feat/bundle-order-designer` dengan perubahan yang belum di-commit (lihat handover). **Tanyakan user dulu** apakah perubahan itu di-commit/stash sebelum membuat branch `feat/canva-insights`. Perubahan dokumen Canva Insights (`docs/knowledge/canva-insights-spec.md`, `docs/backlog/canva-insights-implementation.md`, `index.md`, `session-handover.md`, `archive/…`) ikut ke branch baru.
3. Role yang terlibat: `⚙️ [Backend & Database]`, `🔄 [API & Notion Integration]`, `🎨 [Frontend & UI/UX]`, `🏛️ [Architecture & Knowledge Ops]`. Tandai setiap bagian kerja dengan role yang sesuai di handover.
4. Data uji: `scratch/canva-insights-fixtures/{zahra-art,impro,uicreative,antler}.json` (gitignored, sudah dibersihkan dari cookie/token). Format: `{ brand, brandId, captures: [{ endpoint, query, response }] }`, `endpoint` ∈ `content.by_brand | content.by_content | brand.breakdowns | tier_scores | templates`. **Jangan** pernah membaca, menyalin, atau meng-commit file `.har` asli.

## 1. Fase 1 — Skema, parser, API ingest (Backend + API)

### 1.1 Skema
- [ ] Tambahkan model dari spek §4 ke `prisma/schema.prisma`: `CanvaTemplate`, `CanvaTemplateDaily`, `CanvaBrandDaily`, `CanvaTierScore`, `CanvaIngestBatch`, `CanvaCollectorRun`; kolom `Account.canvaBrandId` (+ relasi `Account.canvaTemplates`, `Task.canvaTemplates`).
- [ ] `npx prisma generate`. **`npx prisma db push` dijalankan oleh user** di MacBook (DB lokal Homebrew), lalu restart dev server (gotcha: client Prisma lama → "Unknown argument").
- [ ] Script `scripts/seed-canva-brands.ts`: isi `Account.canvaBrandId` untuk 5 brand (tabel spek §2). Cocokkan ke `Account` platform Canva berdasarkan `displayName`/`notionKey`; bila tidak ada yang cocok persis, **cetak daftar akun dan minta user memetakan**, jangan menebak.

### 1.2 Parser (`src/lib/canva-insights/`)
Petakan field **per endpoint** sesuai tabel spek §1.1 — huruf yang sama berbeda arti antar endpoint (mis. `e` = template ID di content/usages, tetapi awal hari di breakdowns). Abaikan `A?`.
- [ ] `parse.ts`: fungsi murni per endpoint → baris ternormalisasi. `PARSER_VERSION = 1`.
  - `content.by_content` → `CanvaTemplateDaily` (`date` dari `k` sebagai tanggal UTC, `audience` = `F` atau `"ALL"`), plus `publishedAt` (`j`) dan `lastActivityAt` (`E`) untuk `CanvaTemplate`.
  - `content.by_brand` → daftar template ID + `publishedAt`, `lastActivityAt` (totalnya **tidak** disimpan sebagai harian).
  - `brand.breakdowns` → `CanvaBrandDaily` (`date` dari `e` = awal hari, `audience` = `F`; `E` diabaikan).
  - `tier_scores` → `CanvaTierScore` (`date` dari `B`, `tier` dari `C`, `score` dari `F` (dugaan), `computedAt` dari `H`, seluruh baris di `raw`).
  - `templates` → metadata `CanvaTemplate`: `A` id, `I` sourceDesignId, `R` title, `T` keywords, `0` license, `d` pageCount, thumbnail `m[0].C[0].A`.
  - **Fail-closed**: field wajib hilang atau tipe salah → lempar error berisi alasan; tidak ada penulisan parsial.
- [ ] `ingest.ts`: simpan `CanvaIngestBatch` → parse → upsert dalam satu transaksi → update `status/rowCount/error`. Upsert idempoten (`@@id` komposit).
- [ ] `match.ts`: pencocokan template ↔ task (spek §6). Urutan: ID desain dari `TaskCanvaLink.url` + `Task.outputUrl` (regex `/design/(D[A-Za-z0-9_-]{10})`) → judul (tepat satu kandidat di akun yang sama) → tidak tertaut. Jangan menimpa `matchMethod = "manual"`.
- [ ] `reparse.ts`: parse ulang batch `PARSED`/`REJECTED` dengan parser versi terbaru (dipakai bila mapping berubah).

### 1.3 Route & action
- [ ] `src/app/api/insights/ingest/route.ts` — `POST`, Bearer `INSIGHTS_INGEST_TOKEN` (perbandingan constant-time), body ≤ 2 MB, `brandId` harus terdaftar (403), rate limit `src/lib/rate-limit.ts`.
- [ ] `src/app/api/insights/runs/route.ts` — `POST` mulai/selesai run (`CanvaCollectorRun`).
- [ ] `src/app/api/insights/known-ids/route.ts` — `GET ?brandId=`.
- [ ] Server Action unggah manual (`src/app/actions/canva-insights.ts`, permission `integration.manage`): terima JSON fixture/respons, jalankan `ingest` dengan `source = "manual"`.
- [ ] Env baru `INSIGHTS_INGEST_TOKEN` di `.env` lokal. Catat di handover bahwa VPS butuh variabel ini di **`.next/standalone/.env`** juga (gotcha Dropbox 2026-10-27).

### 1.4 Kriteria selesai Fase 1
Impor keempat fixture lewat jalur manual, lalu cek:

| Fixture | `brand.breakdowns` 2026-09-28 … 2026-10-27 (fetch tanpa `toDate`) | Template teratas `content.by_brand` |
| :--- | :--- | :--- |
| antler | applies 573.094 · usages 222.655 | `EAHXZ3heft0` "Strategic Roadmap Timeline Presentation" C 48 D 14, `I` = `DAHXZ-pq2zg` |
| impro | applies 370.898 · usages 141.000 | `EAHYay97CIU` "Brand Strategy Guide Presentation" C 14 D 1, `I` = `DAHYa_EiXsg` |
| uicreative | applies 116.685 · usages 61.090 | `EAHYofTEK4g` "Social Media Performance Report Presentation" C 1 D 0 |
| zahra-art | applies 317.813 · usages 143.085 | `EAHYhG46cmQ` "Marketing Process Flow Presentation" C 10 D 1 |

- [ ] `SUM(applies)`, `SUM(usages)` di `canva_brand_daily` per brand untuk rentang itu = angka tabel di atas.
- [ ] Impor ulang fixture yang sama tidak menambah baris (idempoten).
- [ ] Fixture yang dirusak (mis. `C` diganti string) → batch `REJECTED`, nol baris tertulis.
- [ ] Laporkan ke user: berapa template ter-tautkan ke task via `design_id`, via `title`, dan berapa yang belum tertaut.
- [ ] `npx tsc --noEmit` lolos.

## 2. Fase 2 — Extension Chrome (diuji di MacBook)

> **Diubah 2026-10-28.** Rencana awal (script Playwright + launchd di iMac) dibatalkan: Chrome yang dikendalikan Playwright terkena pemeriksaan Cloudflare yang tidak lolos. Penggantinya extension MV3 di Chrome harian (spek §3.1 butir 2, §5.3).

Lokasi: `tools/canva-insights-extension/` (dikecualikan dari `tsconfig.json` dan eslint; tidak ikut build Next/graphify).

- [x] `manifest.json` MV3: `webRequest`, `scripting`, `storage`; host `www.canva.com`, `portal.fatchurbeny.com`, `127.0.0.1`/`localhost`.
- [x] Service worker: header `x-canva-*` via `webRequest` (hanya `chrome.storage.session`), fetch endpoint dari tab (MAIN world), urutan spek §5.3 (`lib/collect-brand.js`), POST tiap respons ke ingest, laporan run, status + badge.
- [x] Popup "Sinkronkan sekarang" (+ "Ambil 365 hari" untuk sinkron pertama), daftar sinkron terakhir per brand. Halaman Pengaturan: URL dashboard, token, nama perangkat, uji koneksi.
- [x] Deteksi parameter paginasi → `chrome.storage.local` (`paginationParam`).
- [x] Tes: `npm test` (logika murni) + `test/background-e2e.mjs` (`chrome` & Canva palsu → API lokal).
- [ ] **Uji bersama user**: load unpacked, isi URL lokal + token, sinkronkan satu brand, bandingkan satu template dengan dashboard Canva, **perbarui spek §1.3 dan §9** dengan parameter paginasi.

## 3. Fase 3 — Halaman `/insights` (Frontend)

Ikuti spek §7 dan invariant `CLAUDE.md` (Inter, `"use client"` di baris 1, `rounded-none`, tabel simetris, toolbar datar, dropdown di container overflow lewat portal `fixed`).

- [ ] Permission `insights.view` di `src/lib/permissions.ts` (Admin, Art Director, Project Manager), peta rute `'/insights': ['insights.view']`, baris di matriks permission, menu di `AppSidebar` (pola `sidebar-dropdown-pattern.md`).
- [ ] Query di `src/lib/canva-insights/queries.ts` dengan `Prisma.sql`: KPI + delta periode sebelumnya, seri harian, tabel template teragregasi dengan sort + `LIMIT/OFFSET` + total count.
- [ ] Toolbar: brand, audiens (Free & Pro / Free / Pro), rentang tanggal (preset + kustom); state di URL query.
- [ ] Grafik area recharts, tabel berhalaman 10/25/50/100 (default 25), drawer template (grafik harian, keyword, tautkan/ganti task manual).
- [ ] Panel status sync per brand dari `CanvaCollectorRun` (peringatan > 48 jam / `NEEDS_LOGIN`).
- [ ] Perbarui wireframe role bila menyangkut akses: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL (lihat gotcha handover).

## 4. Penutupan sesi (wajib)

- [ ] `npx tsc --noEmit` dan `npm run graphify`.
- [ ] Perbarui `docs/knowledge/canva-insights-spec.md` bila ada temuan (paginasi, arti `F`/`d`/`N`/`O`, tingkat kecocokan design_id).
- [ ] Tambah ke `docs/knowledge/entities.md` (model baru) dan `modules.md` (rute `/insights`, API insights).
- [ ] Entri baru di `session-handover.md` (role, status, keputusan, sisa pekerjaan), jaga ±5 KB.
- [ ] Jangan `git push` tanpa instruksi user. Rilis ke VPS butuh `prisma db push` manual + `INSIGHTS_INGEST_TOKEN` di `.next/standalone/.env`.

## 5. Di luar cakupan sesi ini
- Pemasangan extension di profil Chrome tim (Fase 4) — memakai README extension.
- Agregasi per designer, widget task drawer, extension "Sync sekarang" (Fase 5).
