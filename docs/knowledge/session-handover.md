# Session Handover Log — CAN-Freelance

Dokumen ini hanya memuat **status aktif** dan keputusan yang masih berlaku, agar murah dibaca di awal sesi (LLM: Claude, Gemini, GPT; editor: Claude Code, Cursor, VS Code, Antigravity).

**Riwayat lengkap** ada di [`archive/session-handover-through-2026-10-16.md`](archive/session-handover-through-2026-10-16.md) dan [`archive/session-handover-from-2026-10-17.md`](archive/session-handover-from-2026-10-17.md) (deploy VPS 2026-10-17). Jangan dibaca utuh; cari dengan `grep` bila butuh detail suatu fitur.

**Aturan menulis di sini**: simpan maksimal ±5 KB. Tambahkan entri sesi baru di bagian "Sesi Terakhir", lalu pindahkan entri lama ke `archive/` bila sudah melewati batas itu.

---

## 📌 Status Aktif

* **Branch**: `main` (`abe521a`) = merge PR #10 `feat/canva-insights` 2026-10-31 (berisi `feat/bundle-order-designer` + `feat/asset-library` + Canva Insights Fase 1–3 + Slide Master F1–F2). PR #5 & #9 ikut tertutup sebagai merged; PR #6–#8 (base ke branch lain) masih terbuka dan isinya sudah ada di `main` · **Peran terakhir**: `🏛️ [Architecture & Knowledge Ops]`
* **Multi-Production**: Fase 1–8 sebagian besar selesai (Production Hub, platform per production, Dropbox File Request untuk Envato Elements, Bundle & Order Bundle, tarif per platform). Detail rencana: [`multi-production-plan.md`](multi-production-plan.md).
* **User Role Fase 1**: login ID + **PIN 4 digit** (sejak 2026-11-16, belum di-commit/rilis; PIN 6 angka lama masih bisa masuk lewat tautan "PIN saya masih 6 angka" lalu wajib ganti, `src/lib/pin-rules.ts`), role berbasis permission, Membership per ProductionUnit, "Lihat sebagai", halaman `/user-role`, `/profile`. Spec: [`user-role-spec.md`](user-role-spec.md). `AUTH_MODE=session` aktif di `.env` lokal dan VPS Biznet GIO.
* **Sidebar**: pindah ke `layout.tsx` (`AppSidebar`), grup dropdown gaya pohon. Pola baku: [`sidebar-dropdown-pattern.md`](sidebar-dropdown-pattern.md).

## ⏳ Belum Selesai / Menunggu

* Freelance boleh ber-ID PRO (Putery `FL-001` → `PRO61`): sudah di-commit (`69859e1`) dan ikut ter-deploy 2026-11-14; tinggal ganti ID di VPS lewat drawer Edit User. Menunggu juga: `SSO_SECRET` + `BRIEF_API_KEY` di VPS untuk Kirim brief ke Deck/Doc (detail `grep "ID login Full-time" archive/`).
* Ganti PIN admin `FT-001` (menunggu user). DB lokal: Postgres 16 Homebrew; VPS: Postgres 16 Ubuntu (lihat arsip 2026-11-09).
* **Kode VPS**: `feat/canva-insights` `3ec9882` dirilis 2026-10-30 12:40 WIB (termasuk kolom F2 `tasks.dropbox_*`; `migrate diff` kosong). Backup: `~/db-backups/can-freelance-20261030-123858-pre-canva-insights-vps.dump`. 5 brand Canva sudah di-seed. Deploy: `VPS_SSH_PORT=2222 npm run deploy:vps`; env app di `.next/standalone/.env`. **Sejak 2026-11-14 app di root `https://portal.fatchurbeny.com` (tanpa `/can-freelance`).**
* **Canva Insights di VPS**: Chital, Antler, UICreative.net, Improstd OK 365 hari (run OK terakhir 2026-11-02); Zahra Art belum dicek. Ingest massal (`3a408e7`) **belum dirilis ke VPS** (deploy ditolak classifier; jalankan `VPS_SSH_PORT=2222 npm run deploy:vps` manual). Setelah rilis: reload extension tiap profil (1.1.2), cocokkan angka tiap brand dengan Canva (`scratch/canva-insights-test/pct-check.ts <brandId> <from> <to>`).
* Tombol "Download all Statement" di `/billing-statement` mengarah ke `/api/billing/download-all` yang tidak ada (dan `<a>` tanpa basePath) → selalu 404.
* Print statement (`/billing-statement/print`) memanggil `window.print()` otomatis.
* Escape saat dropdown terbuka di drawer `/user-role` menutup seluruh drawer (isian hilang).
* Sync `Dropbox Link` ke Notion (perlu file diunggah ke File Request). Dropbox VPS sehat (cek 2026-10-29: refresh token OK, scope termasuk `files.content.write` ada di lokal & VPS).
* Tab Email Notifications & Overview di production Elements masih konten Canva. Kanban per platform masih didiskusikan.
* Impor katalog Notion "Canva Assets" belum dijalankan di VPS (VPS kini 142 aset).
* Backlog: [Role kustom & matriks](../backlog/custom-roles-matrix.md), [Design Brief autosave](../backlog/task-drawer-design-brief-autosave.md). [Master Deck Builder](../backlog/master-deck-builder.md) ⏸️ HOLD setelah F2 (arah: app macOS; detail `grep "Slide Master" archive/`).

## ⚠️ Gotcha yang Masih Berlaku

* **DB lokal dipakai bersama semua branch/worktree.** `db push` dari branch yang skemanya tidak memuat tabel branch lain akan **menghapus** tabel itu (2026-10-28: tabel aset hilang, dipulihkan dari VPS). Sebelum `db push`, cek `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` tidak berisi `DROP`; bila ada, gabungkan branch dulu atau terapkan SQL aditif via `prisma db execute`.
* **Designer task bundle = designer order bundle** (sumber utama). Ganti hanya lewat drawer order di Billing Statement → Order Bundle (`updateBundleOrderDesignerAction`, ikut ubah semua task + Notion). `updateTaskFieldsAction` menolak designer berbeda, task drawer menampilkannya read-only, dan sync Notion tidak menimpa designer task bundle.
* Setelah `db push`, **restart dev server** (client Prisma lama memberi error "Unknown argument"). `deploy:vps` **tidak** menjalankan `db push`.
* Dropdown di dalam container `overflow-*` terpotong; render lewat portal `fixed`.
* Push body Notion memakai antrean in-memory per `pageId` (`src/lib/notion-body-push.ts`); efektif untuk 1 proses PM2, cluster >1 butuh lock DB.
* Ubah UI/role → perbarui wireframe: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL
* **Prisma + timestamptz**: Prisma menulis `DateTime` sebagai waktu tanpa zona yang ditafsirkan di zona sesi DB (Asia/Jakarta) dan membacanya kembali dengan pergeseran yang sama, jadi nilai tersimpan **−7 jam** dari UTC walau lewat Prisma tampak benar. SQL mentah yang menulis kolom ini harus memakai cast `::timestamp` tanpa `Z` (contoh `ensureTemplates` di `canva-insights/ingest.ts`), dan `to_char(... AT TIME ZONE 'UTC')` di SQL mentah menampilkan nilai yang bergeser.
* Env baru di VPS harus ditambahkan ke **`.next/standalone/.env`** (berlaku untuk `INSIGHTS_INGEST_TOKEN`).

## 📝 Sesi Terakhir

### 2026-11-25 — Rencana pindah domain ke `portal.meetimpro.site` (Claude Code, `🏛️ [Architecture & Knowledge Ops]`)
* Hanya rencana, tanpa perubahan kode/VPS: [`domain-migration-meetimpro.md`](domain-migration-meetimpro.md). Temuan kunci: `NEXT_PUBLIC_APP_URL` di-inline saat build di Mac, jadi fallback hardcode `portal.fatchurbeny.com` (upload, Notion body, impro-sso) wajib diganti di kode; Google/Dropbox redirect URI perlu ditambah di konsol; extension perlu 1.2.0. Keputusan pemilik: domain lama jadi redirect 308 ≥3 bulan; improstd ikut pindah lewat rencana terpisah; DNS di Cloudflare (Origin Certificate, Full strict). Fase 3 (kode) selesai di branch `chore/domain-meetimpro` (dari `docs/stacked-drawer-knowledge`), belum di-commit/deploy: helper `getAppBaseUrl`/`oauthCallbackUrl` di `public-origin.ts`, Dropbox OAuth kini pakai origin publik, extension 1.2.0 (migrasi URL otomatis). Berikutnya: Fase 1 (DNS/Nginx) + Fase 2 (konsol OAuth); sebelum cutover cek `GOOGLE_OAUTH_REDIRECT_URI` di `.env` VPS. DNS `portal.meetimpro.site` sudah dibuat (proxied, Full strict, Origin Cert wildcard sudah ada); vhost Nginx `portal.meetimpro.site.conf` (443 + Origin Cert) aktif 2026-11-25, app bisa dibuka di domain baru; **Fase 1 selesai**. Fase 2: Dropbox ✅ (URI domain baru ditambahkan), Google ⏸️ di-skip (project `716061138114`, akun di profil Dia impronsite; Connect Gmail di domain baru gagal sampai URI ditambahkan, wajib sebelum Fase 5). `.env` VPS punya `GOOGLE_OAUTH_REDIRECT_URI` domain lama → ganti di Fase 4 (deploy branch + `APP_URL`).

### 2026-11-15 — UICreative.net: 173/175 halaman REJECTED (Claude Code, `🔌 [API & Integrations]`)
* Sinkron 14 hari UICreative (`BAEWutmc71I`): halaman berisi `C`/`D` REJECTED (`parseBatch` gagal, bukan token/DB); `tier_scores` lolos. Alasan persis di `canva_ingest_batches.error` VPS belum terbaca (akses DB ditolak di sesi).
* Perbaikan (commit `021816e`, dirilis ke VPS 2026-11-15, healthcheck OK; sinkron ulang UICreative belum dicek): parser v2 validasi per baris (baris rusak dilewati + dicatat, `C`/`D` null=0, string angka & negatif diterima; REJECTED hanya bila semua baris rusak), `ingest` mengembalikan `skippedRows`. Extension 1.1.3: alasan REJECTED & baris dilewati tampil di Log teknis/panel. Uji: `scratch/canva-insights-test/parse-tolerance.ts`, extension 16/16. Setelah deploy: reload extension, sinkron ulang UICreative (14 hari ditimpa); bila tetap REJECTED, alasan "semua N baris tidak valid" kini terlihat di panel.

---

## Catatan untuk LLM / Editor Selanjutnya

* **Awal sesi**: baca `index.md`, file ini, lalu hanya modul yang relevan dengan tugas.
* **Akhir sesi**: perbarui file ini (status, keputusan, hal belum selesai) dan jaga ukurannya kecil.
