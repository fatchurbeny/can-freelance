# Extension Chrome: Canva Insights → can-freelance

Extension Manifest V3 untuk Chrome harian. Saat kamu membuka dashboard Creator Canva dan menekan **Sinkronkan sekarang**, extension mengambil Applies/Usages lewat endpoint internal dashboard (dari dalam tab Canva, memakai sesi login-mu) lalu mengirim tiap respons ke API dashboard can-freelance.

Spesifikasi: [`docs/knowledge/canva-insights-spec.md`](../../docs/knowledge/canva-insights-spec.md) §1 (endpoint & field) dan §5 (API & urutan kerja).

Kenapa extension, bukan script terjadwal: Chrome yang dikendalikan Playwright mendapat pemeriksaan anti-bot Cloudflare dari Canva (2026-10-28). Extension berjalan di browser dan sesi aslimu, jadi tidak perlu melewati apa pun, tapi sinkronisasi butuh satu klik per brand.

## Pasang (sekali per profil Chrome)

1. Buka `chrome://extensions`, aktifkan **Developer mode**.
2. **Load unpacked** → pilih folder `tools/canva-insights-extension/`.
3. Buka **Details → Extension options** (atau klik ikon extension → Buka Pengaturan):
   - URL dashboard: `https://portal.fatchurbeny.com/can-freelance` (lokal: `http://127.0.0.1:3002/can-freelance`).
   - Token: nilai `INSIGHTS_INGEST_TOKEN` server (VPS: `.next/standalone/.env`).
   - Nama perangkat: mis. `macbook-beni` (muncul di status sync).
   - Klik **Simpan**, lalu **Uji koneksi**.
4. Pin ikon extension di toolbar.

URL dashboard lain harus ditambahkan dulu ke `host_permissions` di `manifest.json`, lalu extension dimuat ulang.

## Sinkronkan

1. Login ke akun Canva brand (tiap brand = akun Canva sendiri). Bila kamu memakai profil Chrome terpisah per brand, pasang extension di tiap profil.
2. Buka dashboard Creator (`canva.com/creators/template/dashboard/dashboard`) atau klik **Buka dashboard Creator** di popup.
3. Klik ikon extension → **Sinkronkan sekarang**. Brand dikenali otomatis dari dashboard.
   - Sinkron **pertama** tiap brand: centang **Ambil 365 hari**.
   - Selanjutnya cukup tanpa centang (mengambil ulang 14 hari terakhir).
4. Biarkan tab Canva terbuka sampai selesai. Sinkron 14 hari ±5–10 menit per brand; 365 hari ±1 jam (tiap request diberi jeda 1–2 detik). Popup boleh ditutup.

### Membaca status

- **Popup**: kartu status berwarna — *Siap*, *Sedang sinkron* (persen, halaman & baris yang sudah masuk, lama berjalan, langkah aktif dari 6 langkah, mis. "Angka harian per template · grup 19/25"), *Berhasil* (ringkasan + durasi), *Gagal* / *Perlu login* (alasan + "Yang perlu dilakukan"), *Terhenti* (tidak ada kabar > 2 menit: tab Canva ditutup, Chrome dimuat ulang, atau Mac tidur).
- **Badge ikon**: `…` berjalan, `OK` berhasil, `!` gagal; arahkan kursor ke ikon untuk keterangan.
- **Notifikasi Chrome** muncul saat sinkron selesai (berhasil atau gagal).
- **Log teknis** ada di bagian bawah popup (dilipat).

Jangan memuat ulang (reload) extension saat sinkron berjalan: prosesnya terputus. Data yang sudah masuk tetap tersimpan; sinkronkan lagi untuk melanjutkan.

Status per brand juga muncul di dashboard can-freelance (`/insights`, status sync). Sinkronkan tiap brand minimal sekali sehari; data hari terakhir Canva memang terlambat ±1 hari.

## Keamanan

- Token sesi Canva (`x-canva-authz`) hanya disimpan di `chrome.storage.session` (memori, hilang saat Chrome ditutup) dan hanya dikirim ke `canva.com`. Cookie tidak pernah dibaca atau dikirim ke dashboard.
- Token ingest disimpan di `chrome.storage.local` profil Chrome ini.
- Log status tidak memuat header, cookie, atau token.

## Uji

```bash
npm test                          # logika murni: URL, paginasi, urutan kerja per brand
BASE_URL=http://127.0.0.1:3002/can-freelance TOKEN=<token lokal> BRAND=BADxbxKIT_Y node test/background-e2e.mjs
```

`background-e2e.mjs` menjalankan `background.js` dengan `chrome` palsu dan Canva palsu terhadap API dashboard sungguhan (pakai brand tanpa data, lalu hapus barisnya).
