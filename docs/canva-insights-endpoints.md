# Canva Creator Insights — Pemetaan Endpoint (dari HAR, 28 Okt 2026)

> Salinan dari dokumen project claude.ai "Can-Product Monitor" (versi 28 Okt 2026, 17:00 WIB). Isinya sudah disamakan dengan [`knowledge/canva-insights-spec.md`](knowledge/canva-insights-spec.md) §1 (28 Okt 2026). Temuan baru dicatat di **keduanya**; bila ternyata berbeda, cek ulang ke fixture `scratch/canva-insights-fixtures/`.

Sumber: HAR dashboard Creator (`https://www.canva.com/creators/template/dashboard/dashboard`) untuk kelima brand. Dikonfirmasi dengan template `EAHYiT2kBI4` (Startup Pitch Deck Presentation): dashboard Applies 82 / Usages 9 = HAR C 82 / D 9.

## Endpoint utama
| Endpoint | `x-canva-request` | Isi |
|---|---|---|
| `GET /_ajax/creatorinsight/content/usages?type=BY_CONTENT&brandId=…&contentType=B&rollupPeriod=B&fromDate=…&toDate=…&limit=…&contentIds=…(≤50)&contentRoyalties=B&contentRoyalties=C` | `findcontentusagesv2` | Baris harian per template (data utama) |
| `GET /_ajax/creatorinsight/content/usages?type=BY_BRAND&brandId=…&fromDate=…&toDate=…&contentType=B&sortOrder=C&orderBy=B&limit=50` | `findcontentusagesv2` | Total per template dalam rentang; `orderBy=B` = urut tanggal publish |
| `GET /_ajax/creatorinsight/brand/usage/breakdowns?brandId=…&rollupPeriod=B&fromDate=…&toDate=…&limit=100&contentType=B&contentRoyalties=B&contentRoyalties=C` | `findbrandusagebreakdownsv2` | Total harian akun, 2 baris per hari (`F`=B, `F`=C) |
| `GET /_ajax/creatorinsight/tier_scores?brand=…&after=…&limit=100` | `findtierscores` | Tier harian |
| `GET /_ajax/template/templates?id=…(≤50)&…` | `findtemplatesapi` | Metadata template |

## Mapping field per endpoint

**Huruf yang sama punya arti berbeda di tiap endpoint** — parser harus memetakan per endpoint. `A?` di setiap baris = penanda tipe union, diabaikan. Semua timestamp ms UTC; rollup harian = hari UTC (dikonfirmasi user).

### content/usages (`BY_BRAND`, `BY_CONTENT`)
| Field | Arti | Status |
|---|---|---|
| `e` | template ID (`EAH…`) | pasti |
| `C` | **Applies** | terkonfirmasi |
| `D` | **Usages** | terkonfirmasi |
| `F` | jenis royalti, hanya ada dengan `contentRoyalties=B&C`: `C` = Pro, `B` = Free | `C`=Pro hampir pasti; `B`=Free belum dicek |
| `j` | waktu publish | pasti |
| `k` / `l` | awal / akhir hari rollup — **hanya `BY_CONTENT`** | pasti |
| `E` | aktivitas terakhir | dugaan kuat |
| `B` (top-level) | token halaman berikutnya | pasti |

### brand/usage/breakdowns
| Field | Arti | Status |
|---|---|---|
| `e` / `f` | awal / akhir hari — **bukan template ID** | pasti |
| `C` / `D` | Applies / Usages akun hari itu | pasti |
| `F` | jenis royalti (`B` Free / `C` Pro) | sama dengan atas |
| `E` | waktu akhir agregasi (`…T23:59`), bukan aktivitas terakhir | dugaan kuat |

### tier_scores
| Field | Arti | Status |
|---|---|---|
| `B` | tanggal (langkah 24 jam) | pasti |
| `C` | label tier, mis. `"LOW"` | pasti |
| `H` | waktu skor dihitung (2–5 hari setelah `B`) | dugaan kuat |
| `F` | rasio 0–1 — kandidat skor | dugaan |
| `A` | selalu `2` | belum diketahui |
| `D`, `E`, `G` | bilangan bulat | belum diketahui |

Simpan baris utuh sebagai `raw`. Tier terlambat lebih lama (diambil 28 Okt → baris terakhir 24 Okt).

### template/templates
| Field | Arti | Status |
|---|---|---|
| `A` | template ID | pasti |
| `I` | **ID desain sumber (`DAH…`)**, ada di semua template — untuk tautan ke task | pasti |
| `R` / `T` | judul / keyword[] | pasti |
| `0` | lisensi `canva_pro` / `none` (Free) | pasti |
| `D` / `E` | brandId / user ID | pasti |
| `d` | jumlah halaman | dugaan |
| `N` / `O` | timestamp | belum diketahui |
| `m[0].C[0].A` | URL thumbnail | pasti |

## Kelengkapan data terbaru
- Respons terlambat ±1 hari (breakdowns diambil 28 Okt → baris terakhir 27 Okt).
- Dashboard Canva sendiri menulis **"Data shown may exclude the last 7 days"**: angka 7 hari terakhir masih bisa bertambah/direvisi. Contoh: breakdowns zahra.art hari terakhir (27 Okt) berisi Applies `0` tetapi Usages `796`.
- Karena itu collector mengambil ulang **14 hari terakhir** tiap run, server upsert, dan UI menandai **7 hari terakhir sebagai "sementara"**.

## Paginasi
- Respons `content/usages` membawa `"B": "<token>"` (mis. `"1e"`) bila masih ada halaman berikutnya; tanpa `B` = halaman terakhir.
- **`limit` menghitung baris, bukan template.** Contoh nyata (HAR zahra.art): `BY_CONTENT` 50 template, rentang 29 Agu–29 Sep (31 hari), `limit=50` → hanya **50 baris yang mencakup 3 hari pertama (29–31 Agu) untuk 26 template**, plus `B="1e"`. Tanpa mengikuti token, 28 hari sisanya hilang tanpa error.
- Nama parameter untuk mengirim token belum terlihat di HAR mana pun; collector akan mendeteksinya (coba `continuation`, `continuationToken`, `cursor`, `pageToken`).

## Brand yang dipantau (5)
| Brand | Canva brandId | Canva user |
|---|---|---|
| Chital | `BADxbxKIT_Y` | ? |
| zahra.art | `BAEtJgfxnTk` | `UAEtJk0nWyo` |
| impro (improstd) | `BAEUTwNzf0Y` | `UAEUTz1VWXU` |
| UiCreative.net | `BAEWutmc71I` | `UAEWuhxa1S0` |
| Antler | `BAEZG0o0gf4` | `UAEZG851wAs` |

Tiap brand = akun login Canva sendiri → 1 profil Chrome per brand.

## Header
Cookie sesi + `x-canva-authz`, `x-canva-user`, `x-canva-brand`, `x-canva-app` (`home`), `x-canva-request`, `x-canva-accept-prefix: no-prefix`. Token sesi tidak pernah disimpan.

## Keputusan arsitektur (28 Okt 2026)
- Dashboard can-freelance tidak memanggil Canva. Data diambil di browser lalu di-POST ke `/can-freelance/api/insights/ingest` (`INSIGHTS_INGEST_TOKEN`).
- Collector = script Node + Playwright (Google Chrome, 5 profil) dijadwalkan launchd di iMac rumah, 08:15 WIB.
- Halaman `/insights` meniru "Template usages" Canva: filter brand / Free & Pro / rentang tanggal, KPI + delta, grafik area, tabel berhalaman (10/25/50/100), status sync per brand.
- Fixture HAR bersih: `scratch/canva-insights-fixtures/*.json` (zahra-art, impro, uicreative, antler; Chital belum ada).

## Pertanyaan terbuka
- Nama parameter token paginasi.
- Konfirmasi `F=B` = Free.
- Arti `d`, `N`, `O` (templates) dan `A`, `D`, `E`, `G` (tier_scores).
- Apakah link Canva di task = desain sumber template.

## Keamanan
HAR berisi cookie/token aktif → logout & login ulang Canva di kelima akun; jangan commit HAR ke repo.
