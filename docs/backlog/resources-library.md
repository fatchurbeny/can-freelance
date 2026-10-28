# Backlog: Resources Library (katalog aset Canva)

Status: **Jalur manual + mirror Notion (opsi B) diimplementasikan 2026-10-24** di branch `feat/asset-library` (worktree `.claude/worktrees/asset-library`). Jalur API di bawah tetap ditunda (MFA).

## Jalur manual (dipilih) — Asset Library
Tidak memakai Canva API, jadi tidak butuh MFA. Admin menempel dua link per aset:
- **Link Edit** (`…/edit`): untuk tombol "Buka di Canva"; butuh login akun tim.
- **Public View Link** (`…/view`): preview iframe `…/view?embed`, tanpa login. Validasi: tolak link `/edit` dengan petunjuk "Share → Public view link". Token edit ≠ token view, jadi tidak bisa diturunkan otomatis. CSP `frame-src` harus mengizinkan `https://www.canva.com`.
- Cover: default thumbnail halaman 1 dari Canva (`…/screen?type=thumbnail`, dimuat browser); upload opsional. `og:image` tidak dipakai (hanya logo Canva). Judul otomatis dari oEmbed.
- Integrasi brief: tombol **Ambil dari Library** di `DesignBriefEditorDrawer` (di samping Palet Warna) menyisipkan section markdown `## 📦 Assets` (judul + public link + halaman yang dipakai), sama seperti pola `mergePaletteMarkdown`, sehingga ikut `bodyText` dan ter-push ke Notion. `DesignBriefPreview` merender section ini sebagai kartu aset.
- Skema rencana: `AssetCategory` (tab, urutan, opsional per production) dan `Asset` (judul, kategori, tag, editUrl, previewUrl, cover, pages, catatan, `source` manual|api, `canvaDesignId` opsional agar bisa naik ke jalur API).
- **Notion: opsi B dipilih** — app = sumber utama input, database Notion "Asset Library" (di bawah Impro-Freelance) = mirror dua arah. Properti: Name, Kategori (select), Tag (multi-select), Production (select), Edit URL, Public View URL, Halaman (number), Catatan, Status (Aktif/Arsip). App → Notion saat simpan (+ blok embed Canva di body); Notion → App lewat sync incremental `last_edited_time`; link `/edit` di Public View dari Notion ditandai "Perlu diperbaiki". Cover tetap disimpan di app (URL file Notion kedaluwarsa ±1 jam). Push lewat antrean (rate limit ±3 req/detik).
- **Relation "Assets"** di database task per production → hitungan "Dipakai di N task". Relation tidak bisa menyimpan keterangan halaman, jadi catatan halaman tetap di section `## 📦 Assets` di brief. Production yang sudah ada dibuatkan relation manual (tombol "Buat relation" di Notion Config → Asset Library, karena mengubah skema database live); production baru otomatis.
- Skema tambahan: `Asset.notionPageId`, `syncStatus`, `lastSyncedAt`; `NotionDatabase` didaftarkan dengan kegunaan Asset Library.
- Desain (Artifact, privat): https://claude.ai/artifact/HKviEpNcfcL5V7MD3iYjLj (1 halaman `/assets` interaktif, 2 drawer Tambah Aset, 3 picker di Design Brief, 4 Notion Config → Asset Library).
- **Akses (diputuskan 2026-10-25)**: dua cakupan, **Asset Production** (`productionUnitId` terisi) dan **Asset Library** bersama (`productionUnitId` null) → `Asset` & `AssetCategory` dapat kolom `productionUnitId` opsional. Lihat (`asset.view`): Admin, AD, PM, designer FT & FL. Kelola (`asset.manage`): Admin semua; AD & PM hanya production sendiri; library bersama hanya membership global (Admin). Detail & jebakan `can()`: [`../knowledge/user-role-spec.md`](../knowledge/user-role-spec.md) › Akses aset.
- Belum diputuskan: kategori awal.

## Jalur API (ditunda)

## Ide
Katalog di app untuk designer, tanpa perlu akses Canva Creator. Folder project Canva (contoh: "Mini Illustration Icon Pack", ±47 file bertema) dimuat otomatis; tiap file menampilkan pratinjau halamannya dan tombol **Buka di Canva**. Menggantikan kebiasaan mencari lewat search asset.

- Hanya **1 akun Canva** yang dipakai designer untuk membuat template, jadi cukup 1 koneksi OAuth.
- Designer sudah punya akses ke file Canva; app hanya menampilkan pratinjau + CTA.
- UI: tab per folder. Tab bawaan **Icon** dan **Illustrasi**; admin bisa **+ Tab Baru** (nama + link/ID folder Canva) dan **Hapus Tab** (hanya tab tambahan; file di Canva tidak ikut terhapus).
- Desain (Artifact, privat): https://claude.ai/artifact/WB6GhxgXx6pYVXeBpK2GEW

## Kelayakan (hasil riset, belum teruji)
| Kebutuhan | Endpoint Canva Connect | Catatan |
| :--- | :--- | :--- |
| Isi folder | `GET /folders/{id}/items` | Tipe `design`/`folder`/`image`; ID khusus `root`, `uploads`; paginasi `continuation`, limit 100. Item design: `title`, `page_count`, `thumbnail`, `urls.edit_url`/`view_url`. |
| Pratinjau halaman | `GET /designs/{id}/pages` | Scope `design:content:read`; `thumbnail.url`; limit 200/panggilan. **Berstatus Preview** (bisa berubah tanpa pengumuman; tak masalah untuk integrasi privat 1 akun). |

Batasan: thumbnail kedaluwarsa 15 menit (unduh & simpan sendiri); `edit_url` berlaku 30 hari dan hanya untuk user pemanggil; rate limit 100 request/menit/user; pencarian isi per ikon **tidak** didukung API (hanya judul file atau tag buatan sendiri).

## Blocker saat ini
Canva mewajibkan **MFA aktif** di akun sebelum REST API bisa dinyalakan (dialog "Set up Multi-Factor Authentication" saat klik *Start integrating*). Akun yang sama dipakai bergantian oleh designer, jadi perlu keputusan siapa memegang perangkat authenticator & kode cadangan. **Agenda meeting.**

Terkait: app Canva "can-freelance" sudah dibuat di developer portal (status Draft, tipe Public; Private hanya untuk Enterprise). Belum ada Client ID/Secret. Jangan simpan kredensial di repo/chat.

## Pertanyaan untuk meeting
1. Siapa yang mengelola MFA akun Canva bersama, dan di perangkat mana?
2. Siapa yang boleh menambah/menghapus tab folder (usul: admin saja, mengikuti sistem role)?
3. Cukup pencarian judul file, atau perlu tag manual per file?
4. Folder apa saja yang dimuat di awal selain Mini Illustration Icon Pack?

## Rencana bertahap (setelah dilanjutkan)
- **Fase 0** — Spike API: skrip sudah siap di `scratch/canva-spike.mjs` (belum dijalankan). Redirect URL: `http://127.0.0.1:3456/callback`; nama scope di portal perlu dicocokkan dengan skrip. Jalankan: `node --env-file=.env scratch/canva-spike.mjs <FOLDER_ID>` dengan `CANVA_CLIENT_ID`/`CANVA_CLIENT_SECRET` di `.env`.
- **Fase 1** — Schema: `ResourceFolder` (ID folder, nama tab, tipe, urutan, status sinkron), `ResourceDesign`, `ResourcePage` (thumbnail lokal), `CanvaConnection` (token terenkripsi).
- **Fase 2** — Sinkronisasi cron per folder, bergantian agar di bawah rate limit; hanya file yang `updated_at`-nya berubah.
- **Fase 3** — Halaman `/resources` sesuai desain (tab, grid kartu, panel pratinjau halaman, CTA Buka di Canva).
- **Fase 4** — Akses designer read-only, mengikuti sistem role (lihat `production-tabs-spec.md`).
