# Rencana Pindah Domain: `portal.fatchurbeny.com` → `portal.meetimpro.site`

Status: **Fase 1–4 selesai** (2026-11-25). App produksi memakai `https://portal.meetimpro.site`; domain lama masih melayani penuh. Pemilik mengonfirmasi upload, Connect Dropbox, dan Kirim brief jalan di domain baru. Fase 5 selesai (domain lama → 308, kecuali ingest extension). Fase 6 selesai (DB). Sisa: extension 1.2.0 di 5 profil lalu hapus pengecualian ingest, hapus redirect URI lama di Google/Dropbox. Domain lama tetap redirect (URL lama masih ada di body Notion).

Server tetap sama (VPS Biznet GIO `103.89.5.148`, Next standalone :3002, PM2 `can-freelance`, Nginx). Yang berubah hanya nama host publik.

---

## 0. Keputusan pemilik (dijawab 2026-11-25)

1. **Domain lama**: ✅ tetap hidup sebagai **redirect 308 ke domain baru minimal 3 bulan** (sampai ±2027-03). Gambar di brief/Notion, extension lama, dan bookmark tetap jalan. Matikan hanya setelah Fase 6 (rewrite URL di DB) selesai.
2. **`impro.fatchurbeny.com` (improstd)**: ✅ **ikut pindah, tapi lewat rencana terpisah** setelah portal stabil. Selama portal pindah, improstd tetap di domain lama; di sisi ini cukup tambah domain portal baru di allowlist SSO improstd. Saat improstd pindah nanti, di repo ini tinggal ganti env `IMPRO_URL` (dan teks bantuan yang menyebut `impro.fatchurbeny.com`: `DoctypeSlideModal.tsx:432`, `UserDrawer.tsx:176`, `SendBriefButton.tsx:8,18`, default di `impro-sso.ts:16`).
3. **DNS**: ✅ **Cloudflare**: A record proxied, SSL mode Full (strict), Cloudflare Origin Certificate di VPS.
4. **Rewrite URL di database** (brief berisi `https://portal.fatchurbeny.com/api/uploads/...`): tidak di fase awal, cukup andalkan redirect; dikerjakan di Fase 6, **wajib selesai sebelum domain lama dimatikan**.

## 1. Inventaris titik yang terikat domain

| Area | Lokasi | Catatan |
| :--- | :--- | :--- |
| Fallback URL publik (hardcode) | `src/app/api/upload/route.ts:27-29`, `src/lib/notion-body-blocks.ts:30-51`, `src/lib/impro-sso.ts:20-22` | **Kritis**: `NEXT_PUBLIC_APP_URL` di-*inline* saat `npm run build` di Mac (nilai lokal = localhost) → kode jatuh ke hardcode `portal.fatchurbeny.com`. Mengganti env VPS saja **tidak cukup**. |
| Google OAuth redirect | `src/lib/google-oauth.ts:9-10` | Hardcode host lama + prefix `/can-freelance`. |
| Dropbox OAuth redirect | `src/lib/dropbox.ts:16`, `src/app/api/dropbox/oauth/start/route.ts:21` | Memakai `request.nextUrl.origin` (di VPS = localhost) + prefix lama. Cek URI yang terdaftar di Dropbox App Console; sebaiknya pindah ke `getPublicOrigin()`. |
| Origin publik dinamis | `src/lib/public-origin.ts` | Sudah aman (ikut Host header / `APP_URL`). |
| Email notifikasi | `src/app/actions/email-notification.ts:333` | Ikut env `NEXT_PUBLIC_APP_URL`/`APP_URL`. |
| Extension Canva Insights | `tools/canva-insights-extension/manifest.json:16`, `options.js:3`, `options.html:14`, `README.md` | `host_permissions` wajib memuat domain baru; URL tersimpan di tiap profil Chrome harus diganti. |
| Skrip deploy | `scripts/deploy-vps.sh:96` | Hanya teks; healthcheck lewat loopback (tidak terpengaruh). |
| Komentar/dok | `next.config.ts:9`, `src/lib/base-path.ts:1`, `docs/knowledge/*` | Kosmetik. |
| VPS | Nginx vhost `portal.fatchurbeny.com.conf`, `.next/standalone/.env` (`APP_URL`, `NEXT_PUBLIC_APP_URL`), crontab (sudah `127.0.0.1`) | Crontab tidak perlu diubah. |
| improstd | `CANFREELANCE_URL=http://127.0.0.1:3002` (aman); `core/lib/brief.mjs:96` mengenali URL upload; allowlist origin/return URL SSO (perlu dicek) | Brief yang berisi URL upload domain baru harus tetap dikenali. |
| Data tersimpan | Markdown brief di DB, body halaman Notion, gambar referensi | Berisi URL absolut domain lama → bergantung pada redirect. |
| Sesi login | cookie host-only (`src/lib/session.ts`) | Semua user **login ulang sekali** di domain baru. |

## 2. Fase & langkah

### Fase 1 — Persiapan infrastruktur (tanpa downtime)
**Progres 2026-11-25**: ✅ DNS `portal` A → `103.89.5.148` proxied dibuat di Cloudflare. ✅ SSL mode sudah Full (strict). ✅ Origin Certificate `*.meetimpro.site, meetimpro.site` (s.d. 2041-11-21) sudah ada dan terpasang di VPS (dipakai `meetimpro.site`/`tools`), jadi langkah 2 tidak perlu cert baru, cukup pakai path cert yang sama. ✅ Vhost `/www/server/panel/vhost/nginx/portal.meetimpro.site.conf` dibuat (salinan vhost lama + `listen 443 ssl http2` dengan Origin Cert `/www/server/nginx/conf/ssl/meetimpro.site/origin.{pem,key}`, `X-Forwarded-Proto https`); backup `~/backups/nginx-vhosts-20261125-211225-pre-meetimpro.tar.gz`. Uji: `/login` 200, `/production` 307 → `/login`, `/can-freelance/login` 308 → `/login`, static CSS 200, API 401; domain lama tetap 200. **Fase 1 selesai.** Kode di VPS masih versi lama dan `APP_URL` masih domain lama, jadi URL yang dihasilkan app (upload, email) tetap domain lama sampai Fase 4.

1. DNS (Cloudflare): tambah zona `meetimpro.site` bila belum; A record `portal` → `103.89.5.148`, proxied; SSL/TLS mode **Full (strict)**, Always Use HTTPS aktif.
2. Sertifikat: buat **Cloudflare Origin Certificate** untuk `portal.meetimpro.site` (boleh sekalian `*.meetimpro.site` untuk improstd nanti), simpan cert + key di VPS (mis. `/www/server/nginx/ssl/meetimpro.site/`, key `chmod 600`).
3. Nginx: salin `portal.fatchurbeny.com.conf` → `portal.meetimpro.site.conf`, ganti `server_name` & path sertifikat; proxy penuh ke :3002, `/_next/static/` dari filesystem, `absolute_redirect off`, redirect `/can-freelance` tetap ada. `nginx -t` lalu reload. Backup conf dulu (`~/backups/...-pre-meetimpro`).
4. Uji: `curl -sI https://portal.meetimpro.site/production` → 307 ke `/login`. Kedua domain kini melayani app yang sama.

### Fase 2 — Konsol OAuth (tambah, jangan hapus yang lama)
**Progres 2026-11-25**: ✅ Dropbox app `impro-freelance` (`a2t7qhbgsmauijl`): `https://portal.meetimpro.site/api/dropbox/oauth/callback` ditambahkan; URI domain lama `/can-freelance` sudah terdaftar sebelumnya (begitu juga 127.0.0.1/localhost). ✅ Google (2026-11-25, lewat Chrome akun pemilik project `can-freelance` / `716061138114`): client "can-freelance" ditambah origin `https://portal.meetimpro.site` dan redirect URI `https://portal.meetimpro.site/api/google/oauth/callback`; entri lama (origin domain lama, redirect localhost & domain lama `/can-freelance`) tetap. Google menyebut perubahan bisa butuh 5 menit sampai beberapa jam. Catatan VPS: `.next/standalone/.env` berisi `GOOGLE_OAUTH_REDIRECT_URI` = URI domain lama → ganti saat Fase 4.

1. Google Cloud Console: tambah redirect URI `https://portal.meetimpro.site/api/google/oauth/callback` (tanpa prefix lama) + JavaScript origin `https://portal.meetimpro.site`. Bila OAuth consent screen memakai domain terverifikasi, tambahkan `meetimpro.site` di Authorized domains.
2. Dropbox App Console: tambah `https://portal.meetimpro.site/api/dropbox/oauth/callback`. Pastikan juga `https://portal.fatchurbeny.com/can-freelance/api/dropbox/oauth/callback` terdaftar: sejak Fase 3, Connect Dropbox dari domain lama memakai URI itu (sebelumnya origin internal `localhost:3002`).

### Fase 3 — Perubahan kode ✅ (branch `chore/domain-meetimpro`)
Hasil: `src/lib/public-origin.ts` kini punya `PUBLIC_APP_URL_DEFAULT`, `LEGACY_PUBLIC_HOST`, `getAppBaseUrl()` (`APP_URL` runtime didahulukan, nilai lokal → domain baru) dan `oauthCallbackUrl(origin, path)` (domain lama → prefix `/can-freelance`; lokal → prefix; domain lain → tanpa prefix). Dipakai di upload, `notion-body-blocks`, `impro-sso.publicBase`, `google-oauth`, `dropbox` (start & callback kini sama-sama `getPublicOrigin`). Extension 1.2.0 (`migrateBaseUrl` di `lib/server.js`, dijalankan di `onInstalled`). Uji: `npx tsc --noEmit` OK, extension 17/17, asersi helper `scratch/domain-test/helpers.ts`. `email-notification.ts` tidak diubah (refresh token tidak memakai redirect URI).

Langkah semula:
1. Satu sumber kebenaran: konstanta `PUBLIC_APP_URL_DEFAULT = 'https://portal.meetimpro.site'` + helper `getAppBaseUrl()` (env non-lokal → env, selain itu default) di `src/lib/public-origin.ts`; pakai di `upload/route.ts`, `notion-body-blocks.ts`, `impro-sso.ts`, `email-notification.ts`.
2. `google-oauth.ts`: redirect URI = `${getAppBaseUrl()}/api/google/oauth/callback` untuk host publik; tetap dukung `GOOGLE_OAUTH_REDIRECT_URI` override. Lepas prefix `/can-freelance` untuk domain baru.
3. Dropbox: `dropboxRedirectUri(getPublicOrigin(request))` di start **dan** callback (nilai harus identik), tanpa prefix lama untuk domain baru.
4. Redirect host lama di Next (`next.config.ts` `redirects` dengan `has: [{ type: 'host', value: 'portal.fatchurbeny.com' }]`) **atau** di Nginx (lebih disukai, lihat Fase 5).
5. Extension → **1.2.0**: `host_permissions` memuat **kedua** domain; default `options.js`/`options.html` ke domain baru; migrasi otomatis di `chrome.storage` (bila `baseUrl` = host lama, tulis ulang ke host baru). README diperbarui.
6. `deploy-vps.sh`, komentar `next.config.ts` & `base-path.ts`.
7. `npx tsc --noEmit`, uji lokal, `npm run graphify`.

### Fase 4 — Cutover ✅ (2026-11-25 ±21:40 WIB)
Hasil: backup DB `~/db-backups/can-freelance-20261125-213915-pre-meetimpro.dump` (84 MB) + env `~/backups/can-freelance.env.20261125-213915-pre-meetimpro`. `.next/standalone/.env`: `APP_URL`/`NEXT_PUBLIC_APP_URL` = domain baru, `GOOGLE_OAUTH_REDIRECT_URI` dikomentari (PM2 tidak meng-override env). Deploy `6d407e6`+docs (`VPS_SSH_PORT=2222 npm run deploy:vps`), healthcheck OK; build VPS sebelumnya (2026-11-16) sudah memuat PIN 4 digit, jadi rilis ini hanya perubahan domain. Uji tanpa login: domain baru `/login` 200, `/production` 307, `/can-freelance/*` 308, API 401, `/api/palette/strip` 200, `/api/uploads/<file>` 200 di kedua domain; domain lama tetap 200. Pemilik menguji setelah rilis: upload, Connect Dropbox, Kirim brief **jalan**. **Gmail**: `email_configs` `impronsite@gmail.com` `RECONNECT_REQUIRED` (`invalid_grant`), sinkron terakhir 2026-11-19, jadi rusak sebelum pindah domain. Penyebab berulang: OAuth app `can-freelance` berstatus **Testing** (External, 1 test user), dan Google mengakhiri refresh token app Testing setelah 7 hari. Perbaikan: Reconnect Gmail dari domain baru; agar tidak kedaluwarsa tiap minggu, app perlu di-Publish (lengkapi halaman Branding; scope `gmail.readonly` tanpa verifikasi tetap bisa dipakai akun sendiri dengan peringatan "unverified app"). **Selesai 2026-11-25 ±22:10**: halaman kebijakan privasi statis `https://meetimpro.site/privacy/can-freelance` (sumber `deploy/meetimpro-site/privacy-can-freelance.html`, di VPS `/www/wwwroot/meetimpro-legal/`, dilayani `location =` di `meetimpro.site.conf` karena situs itu milik app Node tools-impro :3100; backup conf `~/backups/meetimpro.site.conf.20261125-220657-pre-privacy`). Branding diisi home page `https://meetimpro.site` + privacy link itu, lalu app di-**Publish → In production** (External, belum diverifikasi: layar Connect menampilkan peringatan "unverified app", batas 100 user). Refresh token tidak lagi mati tiap 7 hari. Pemilik Reconnect Gmail dari domain baru 2026-11-25 → `auth_status` ACTIVE; sinkron dipicu dari VPS (`/api/email-sync` + cron secret) berhasil: 140 notifikasi (22 baru, terbaru diterima 2026-11-25). Sejak 2026-11-25 22:11 crontab VPS punya `5-59/15 * * * *` → `127.0.0.1:3002/api/email-sync` (Bearer cron secret yang sama dengan sync Notion; backup `~/backups/crontab.20261125-221140-pre-email-sync`). Sebelumnya sinkron email hanya jalan saat tab Email Notifications dibuka. Bila halaman privasi diubah, salin ulang file ke VPS. Log PM2 sebelum rilis sudah berisi Gmail `invalid_grant` (token Gmail kedaluwarsa, perlu Reconnect **dari domain lama** selama Google ⏸️) dan `dropbox-sync … fetch failed` (bukan akibat rilis ini). improstd tidak perlu diubah agar jalan; `core/lib/brief.mjs:112` hanya mengenali host upload lama, jadi URL upload domain baru diambil lewat URL publik (opsional: tambah `portal\.meetimpro\.site` ke regex itu).

Langkah semula:
0. **Cek dulu di VPS** `.next/standalone/.env`: bila ada `GOOGLE_OAUTH_REDIRECT_URI`, hapus atau isi `https://portal.meetimpro.site/api/google/oauth/callback` (override ini menang untuk host selain domain lama; `.env` lokal berisi nilai localhost).
1. Backup DB VPS (`pg_dump` → `~/db-backups/can-freelance-<ts>-pre-meetimpro.dump`) dan `.next/standalone/.env`.
2. VPS `.next/standalone/.env`: `APP_URL` & `NEXT_PUBLIC_APP_URL` = `https://portal.meetimpro.site`.
3. `VPS_SSH_PORT=2222 npm run deploy:vps` (healthcheck loopback).
4. improstd: cek allowlist origin/return URL SSO & `brief.mjs` pengenal URL upload; tambah domain baru, restart improstd.
5. Uji produksi (domain baru): login ID+PIN, Production, upload gambar brief (URL yang dihasilkan = domain baru), Connect Gmail & Dropbox sampai selesai, Kirim brief ke Deck/Doc, email notifikasi (tautan domain baru), push body Notion, cron sync (`pm2 logs`).
6. Extension 1.2.0: reload di 5 profil Chrome; sinkron 14 hari satu brand, cek batch masuk.

### Fase 5 — Domain lama jadi redirect
**Selesai 2026-11-25 22:13 WIB**: `portal.fatchurbeny.com.conf` kini hanya `return 308 https://portal.meetimpro.site$request_uri` (`/can-freelance/...` langsung ke root domain baru, satu kali redirect). **Pengecualian**: `^(/can-freelance)?/api/insights(/.*)?$` tetap di-proxy ke :3002 karena extension Canva Insights masih ≤1.1.3 di profil-profil (terakhir 655 POST ke `/can-freelance/api/insights` pada 2026-11-23); redirect lintas domain membuang header `Authorization` dan 1.1.3 tak punya izin host domain baru. Hapus pengecualian setelah semua profil memakai 1.2.0 (cek `grep -a "POST /.*api/insights" /www/wwwlogs/portal.fatchurbeny.com.log`). Backup: `~/backups/portal.fatchurbeny.com.conf.20261125-221333-pre-redirect`. Uji: `/login`, `/production?x=1`, `/can-freelance/*`, `/api/uploads/*`, callback OAuth lama → 308 ke domain baru; POST ingest lama → 401 dari app (tanpa token); domain baru normal. Sesi login di domain lama hilang (user login ulang di domain baru). Redirect URI lama di Google/Dropbox **belum** dihapus (aman dibiarkan; hapus setelah stabil).

Langkah semula:
1. Nginx `portal.fatchurbeny.com.conf`: `return 308 https://portal.meetimpro.site$request_uri;` (308 menjaga POST dari extension yang belum di-update; menangani `/can-freelance/*` karena domain baru juga mengalihkannya).
2. Hapus redirect URI lama di Google/Dropbox **setelah** Connect dari domain baru terbukti jalan.
3. Umumkan ke user: alamat baru + perlu login ulang.

### Fase 6 — Rewrite URL di DB ✅ (2026-11-25 22:19 WIB, dimajukan atas permintaan pemilik)
Pemindaian semua kolom teks/json/array skema `public`: hanya `tasks.body_text` (Design Brief) yang memuat domain lama, 34 task, semuanya punya halaman Notion; pola `https://portal.fatchurbeny.com/api/uploads/…` (32) dan `…/can-freelance/api/uploads/…` (21). Backup baris: `~/db-backups/tasks-body-text-20261125-221904-pre-domain-rewrite.csv` (kolom `id, body_text`; pulihkan dengan UPDATE dari CSV). Satu transaksi: `/can-freelance/` → root domain baru, lalu domain lama → `https://portal.meetimpro.site`; sisa 0. 53 URL gambar unik di brief semuanya 200. **Notion tidak diubah**: body halaman Notion masih memuat URL lama, dan sync menimpa `body_text` dari Notion saat halaman diedit di Notion / full sync (`src/lib/sync-notion.ts` ±781), jadi sebagian task bisa kembali ke URL lama; tetap jalan lewat redirect 308. Karena itu domain lama **jangan dimatikan** selama body Notion lama masih dipakai.

Langkah semula (opsional, setelah stabil ≥2 minggu):
* Rewrite URL di DB (`UPDATE ... SET ... = replace(..., 'https://portal.fatchurbeny.com', 'https://portal.meetimpro.site')`) per kolom teks yang memuat URL; hitung dulu dengan `SELECT count(*) ... LIKE`, backup dulu.
* Body Notion lama dibiarkan (redirect menangani).
* Hapus `portal.fatchurbeny.com` dari `host_permissions` extension di rilis berikutnya.

## 3. Rollback
* Sebelum Fase 5: kembalikan env `.next/standalone/.env` dari backup, deploy commit sebelumnya; domain lama masih melayani penuh.
* Setelah Fase 5: kembalikan `portal.fatchurbeny.com.conf` dari backup (`~/backups/...-pre-meetimpro`), reload Nginx.

## 4. Risiko
* **Fallback hardcode + env build-time** (lihat tabel) — kalau terlewat, URL upload & tautan Notion tetap domain lama.
* OAuth `redirect_uri_mismatch` bila Fase 2 belum selesai sebelum cutover.
* Cookie `state` OAuth bersifat host-only: Connect harus dimulai dan selesai di domain yang sama.
* Extension di profil yang lupa di-reload tetap kirim ke domain lama → aman selama redirect 308 hidup.
