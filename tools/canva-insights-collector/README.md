# Canva Insights Collector

Script Node + Playwright yang membuka dashboard Canva Creator di Google Chrome (satu profil per brand), mengambil Applies/Usages lewat endpoint internal dashboard, lalu mengirim tiap respons ke API dashboard can-freelance (`POST /can-freelance/api/insights/ingest`).

Spesifikasi lengkap: [`docs/knowledge/canva-insights-spec.md`](../../docs/knowledge/canva-insights-spec.md) §1 (endpoint & field) dan §5 (API & urutan kerja).

- Server dashboard **tidak pernah** memanggil Canva dan tidak menyimpan cookie/token Canva. Sesi Canva hanya ada di profil Chrome di Mac ini.
- Request berjalan berurutan dengan jeda 1–2 detik, read-only, data akun sendiri, 1× sehari.
- Log: `~/Library/Logs/canva-insights-collector.log` (tanpa header, cookie, atau token).

## Instalasi (iMac rumah)

1. Pasang Node 20+ (mis. `brew install node`) dan Google Chrome.
2. Salin folder `tools/canva-insights-collector/` ke iMac (atau clone repo), lalu:
   ```bash
   cd tools/canva-insights-collector
   npm install
   ```
   `npx playwright install` **tidak** perlu: collector memakai Google Chrome yang terpasang (`channel: "chrome"`).
3. `cp config.example.json config.json`, lalu isi:
   - `ingestUrl`, `runsUrl`, `knownIdsUrl`: URL dashboard, mis. `https://<domain>/can-freelance/api/insights/ingest`.
   - `token`: nilai `INSIGHTS_INGEST_TOKEN` di server (VPS: `.next/standalone/.env`).
   - `host`: nama mesin untuk status sync, mis. `imac-rumah`.
   - `brands[].profileDir` opsional; default `~/Library/Application Support/canva-insights-collector/profiles/<slug>`.
   - `headless`: biarkan `false` (Canva lebih andal dengan jendela Chrome biasa).
   - `paginationParam`: diisi otomatis saat parameter paginasi pertama kali terdeteksi.

## Login (sekali per brand, ulangi bila sesi habis)

```bash
node collect.mjs login chital
node collect.mjs login zahra
node collect.mjs login impro
node collect.mjs login uicreative
node collect.mjs login antler
```

Jendela Chrome terbuka di halaman login Canva. Login ke akun brand itu, selesaikan MFA, buka dashboard Creator sekali, lalu tekan Enter di terminal. Profil tiap brand terpisah, jadi lima akun bisa login bersamaan.

## Menjalankan

```bash
node collect.mjs run --brand zahra --dry-run   # respons ditulis ke ./out/zahra/, tanpa kirim ke server
node collect.mjs run --brand zahra             # satu brand, kirim ke server
node collect.mjs run                           # semua brand
node collect.mjs run --backfill                # run pertama: sejarah 365 hari (dipecah per 90/45 hari)
```

Per brand: BY_BRAND 90 hari → gabung dengan template yang dikenal server → BY_CONTENT 14 hari terakhir (per 50 template, Free/Pro) → breakdowns → tier → metadata template baru. Semua halaman diikuti lewat token `B`.

Status run dilaporkan ke `/api/insights/runs`: `OK`, `NEEDS_LOGIN` (jalankan `login` lagi), atau `ERROR` (lihat log). Exit code ≠ 0 bila ada brand yang tidak `OK`.

**Pemeriksaan Cloudflare ("Just a moment…")**: Canva kadang menampilkan halaman pemeriksaan anti-bot ke Chrome yang dikendalikan Playwright (terlihat saat uji dengan profil yang belum login, 2026-10-28). Collector **tidak** mencoba melewatinya: bila halaman itu bertahan > 15 detik, brand dilaporkan `ERROR` dengan pesan "pemeriksaan Cloudflare". Jalankan `node collect.mjs login <slug>`, selesaikan pemeriksaan sendiri di jendela Chrome, lalu ulangi `run`. Bila ini terjadi setiap hari, jadwal otomatis tidak bisa dipakai untuk brand itu.

File di `out/<slug>/` hasil `--dry-run` bisa diimpor manual ke dashboard: satu file = satu respons dengan `brandId`, cocok untuk `npx tsx scripts/import-canva-insights.ts <file>` di repo.

## Jadwal harian (launchd)

1. Isi placeholder di `launchd/com.kelaskreator.canva-insights.plist`: `__NODE__` (`which node`), `__DIR__` (path folder ini), `__HOME__` (path home).
2. Pasang:
   ```bash
   cp launchd/com.kelaskreator.canva-insights.plist ~/Library/LaunchAgents/
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.kelaskreator.canva-insights.plist
   launchctl kickstart -k gui/$(id -u)/com.kelaskreator.canva-insights   # uji jalan sekarang
   ```
   Hapus: `launchctl bootout gui/$(id -u)/com.kelaskreator.canva-insights`.
3. Jadwal 08:15 **waktu lokal Mac**: pastikan zona waktu Mac Asia/Jakarta (hari UTC berganti 07:00 WIB).
4. User harus tetap login di Mac (LaunchAgent jalan di sesi GUI). Cegah tidur:
   - System Settings → Energy: "Prevent automatic sleeping when the display is off" dan "Start up automatically after a power failure".
   - Atau bangunkan terjadwal: `sudo pmset repeat wakeorpoweron MTWRFSU 08:10:00`.

## Uji

```bash
npm test
```

Menguji logika tanpa browser: susunan URL, prefix JSON, potongan tanggal, deteksi paginasi, dan urutan kerja satu brand dengan Canva palsu.
