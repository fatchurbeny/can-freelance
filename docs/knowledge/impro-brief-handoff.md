# Kirim brief ke Deck/Doc (improstd) — sisi can-freelance

Kontrak bersama: **I-22** di `improstd/knowledge/DECISIONS.md` (repo `~/Documents/Claude-Code/improstd`, app `impro.fatchurbeny.com`). Ubah bentuk data hanya bila sisi improstd ikut diubah.

## Alur
1. Task drawer → tombol **Kirim ke Deck / Kirim ke Doc** (`task-detail/SendBriefButton.tsx`). Tampil bila doctype task punya `studio` (`deck`|`doc`, diatur di Rate Card › Doctype › Studio), user punya `task.edit`/`task.edit.own`, login sesi aktif, dan bukan mode "Lihat sebagai".
2. `GET /api/impro/handoff?task=<id>` (sesi `cf_session`) → cek kepemilikan task (`canUseTaskBrief`), tolak akun Full-time ber-ID `FT-*` (harus ID PRO) → tiket HS256 → 303 ke `${IMPRO_URL}/sso/can-freelance?t=…`. Error tampil sebagai halaman HTML kecil (tombol dibuka di tab baru).
3. improstd memverifikasi tiket (jti sekali pakai di sisinya), lalu memanggil server-ke-server di VPS yang sama (`http://127.0.0.1:3002/can-freelance`):
   - `GET /api/brief/<taskId>` → JSON brief (`src/lib/brief-extract.ts`).
   - `POST /api/brief/<taskId>/outputs` `{ url, source, improProjectId, title }` → tabel `task_design_outputs`, ditampilkan di drawer task (`DesignOutputsList.tsx`).

## Tiket (src/lib/impro-sso.ts)
JWS compact HS256 dengan `SSO_SECRET`. Payload `{ iss:"can-freelance", aud:"improstd", sub:userCode (PRO.. / FL-xxx), name, emp, brand:boolean (account.view di production task), task, target, iat, exp=iat+60, jti (18 byte acak) }`.

## API brief
- Header `Authorization: Bearer <BRIEF_API_KEY>` + `X-Acting-User: <userCode>`. Izin dicek ulang setiap panggilan: 401 key salah, 403 user tak dikenal/nonaktif/PIN awal/tak berhak atas task, 404 task tidak ada. Body error `{ error: { message } }`.
- Brief diambil dari markdown `tasks.body_text`, section diklasifikasi `brief-parser.ts` (`classifyHeading`; jenis `prompt` = heading berisi kata "Prompt"). Tanpa section Prompt, `prompt` disusun dari judul + section bebas + keywords. Gambar `/uploads/…` diberi URL absolut `<origin request>/api/uploads/<file>` (app di root domain sejak 2026-11-14) (`external:false`).
- `brand` null bila user tanpa `account.view` (freelance, viewer).

## Env
`SSO_SECRET`, `BRIEF_API_KEY` (min 16 karakter, **nilai sama** dengan improstd), `IMPRO_URL` (bawaan `https://impro.fatchurbeny.com`; lokal `http://127.0.0.1:8790`). Di VPS isi di `.next/standalone/.env`.

## 🧩 Elemen dari katalog improstd (kontrak I-23)
* Drawer **Edit Design Brief** punya tombol **Ambil Elemen** → `task-detail/ElementPicker.tsx` (panel di dalam drawer; Escape menutup panel saja). Pilih set per kategori (maks. 4), lalu tulis section `## 🧩 Elemen` dengan baris `- <Kategori>: <nama set> (EB:<brandId>/<setId>)` (`src/lib/element-categories.ts`: `buildElementsSection`, `mergeElementsMarkdown`, `parseElementLines`).
* Katalog: server action `getElementLibraryAction` (`actions/elements.ts`) memanggil `GET {IMPRO_INTERNAL_URL}/api/elements/library` (cache 60 dtk) dengan `ELEMENTS_API_KEY`. Hanya untuk `task.edit`/`task.edit.own`. Tanpa `account.view`: nama/handle brand tidak dikirim (`brands: null`), set & thumbnail tetap tampil.
* Thumbnail diproksikan `GET /api/elements/thumb/<mediaId>` (kunci tetap di server; hanya png/jpeg/webp/gif, `private, max-age=86400`).
* Brief JSON I-22 dapat field `elements: { brand, picks: { <kunci kategori>: ["<brandId>/<setId>"] } }` atau `null` (`toElements` di `brief-extract.ts`); dikirim juga untuk user tanpa `account.view` (isinya id). Kind `elements` di `brief-parser.ts` (urutan setelah `assets`); preview menampilkan baris tanpa ref `(EB:…)`.
* Env: `ELEMENTS_API_KEY` (≥32 karakter, sama dengan improstd), `IMPRO_INTERNAL_URL` (bawaan `http://127.0.0.1:8790`, sama untuk lokal dan VPS).

## Belum
- Opsi "sembunyikan brand" per share link publik (`/share/t/<token>` menampilkan Brand).
