# Backlog: Master Deck Builder (slide master otomatis untuk production Dropbox)

Status: **⏸️ HOLD sejak 2026-10-29** setelah F1 (Checklist QA) dan F2 (centang dari folder Dropbox) selesai. F3+ belum dikerjakan; arah terakhir: app macOS + dashboard (lihat session handover). Flow: https://claude.ai/artifact/XoQAVhocSqm7r9cHjYMTMM · Desain UI: https://claude.ai/artifact/5vK7jUxXuAWGWZDV76TETE (page **v2 · impro.std**)

Dokumen ini memuat **alur dan keputusan**. Spesifikasi teknis (layar, komponen, data, fase, acceptance criteria) ada di [`../../design-handoff/IMPLEMENTATION-slide-master-builder.md`](../../design-handoff/IMPLEMENTATION-slide-master-builder.md). Bila keduanya berbeda, spec yang berlaku.

## Alur
1. Task dibuat di production dengan `platform.outputType = dropbox_link` → File Request ke `{root}/{bulan}/{task}` (sudah ada, `attachUploadRequest`). Body kartu Notion mendapat section `## ✅ Checklist QA`.
2. Designer mengunggah file **satuan** (tanpa .zip): .pptx, .pdf, .key, .ppt, preview.
3. Status → QA (kanban atau Notion). Production Canva tidak ikut.
4. `enqueueMasterDeckJobs()` mengantrekan job (idempotent per task + `content_hash`). Dipanggil dari jalur perubahan status di app, akhir `syncNotionData` (sebelah `syncDropboxOutputs`), dan Sync Now.
5. Worker (proses PM2 terpisah di VPS, python-pptx + LibreOffice): `files/list_folder` → wajib ada .pptx **dan** .pdf, kalau tidak → `WAITING_FILE` + badge "Menunggu file" → unduh → analisis (heuristik, LLM 9Router opsional) → `READY_REVIEW`.
6. Reviewer (permission `masterdeck.review`) review di halaman global **Slide Master Builder** (`/slide-master-builder`) → rebuild + validasi + diff visual → simpan ke `/_master/` di folder task → item **Master Slides** di checklist tercentang otomatis.
7. Checklist QA 5/5 → boleh pindah ke In Review.
8. QA menolak → In Progress → upload ulang → job baru, job lama `SUPERSEDED`.

Status job: `QUEUED → FETCHING → ANALYZING → READY_REVIEW → REBUILDING → DONE`; cabang `WAITING_FILE`, `DIFF_FAILED`, `SUPERSEDED`, `ERROR`.

## Keputusan (2026-10-29)
* **Checklist QA** (Preview, Master Slides, Keynote, PPT, PPTX) disimpan di **body kartu Notion** sebagai blok to-do di section `## ✅ Checklist QA`. **Tidak ada properti Notion baru**, termasuk tidak ada properti "Master Deck". Konsekuensi: tidak bisa difilter sebagai kolom di view Notion; teks heading section tidak boleh diubah manual.
* **Gerbang In Review**: pindah QA → In Review ditolak di server sampai 5/5, di **semua** jalur ubah status app (lihat spec §5.2). Perubahan status langsung di Notion tidak bisa diblokir → sync memberi badge "Checklist belum lengkap", tidak mengembalikan status diam-diam.
* **Pengisian checklist**: Keynote/PPT/PPTX/Preview tercentang otomatis bila file ada di folder Dropbox (F2), QA mengonfirmasi; Master Slides tercentang otomatis saat job `DONE` (F4). Sampai F4, Master Slides dicentang manual oleh QA.
* **Tampilan per status**: Draft/Not Started = daftar deliverable wajib tanpa checkbox; In Progress = progres n/5 read-only; QA = checklist penuh; In Review/Approved = read-only.
* **Kartu kanban hanya indikator** (ikon checklist + `n/5`: abu 0/5, amber sebagian, hijau 5/5; badge "Menunggu file" bila perlu). Detail ada di drawer, tab ketiga: Design Brief · **Checklist QA** · Comments.
* **Satu Slide Master Builder global** untuk semua production Dropbox: antrean dengan filter Production; isi dibatasi Membership per ProductionUnit (server-side). **Tidak ada** tab Master Deck di halaman production; dari production cukup tautan "Buka di Slide Master Builder →" di tab Checklist QA.
* **PDF wajib** untuk analisis (job menunggu bila .pdf belum ada), tapi bukan item checklist.
* **File satuan, tanpa .zip** (sebutkan di deskripsi File Request; .zip → badge "Menunggu file").

* **Item checklist mengikuti Doctype** (keputusan user 2026-10-29): disimpan di kolom baru `Doctype.qaChecklist`. Doctype presentasi (`PPTX, Slides, Keynote`) membutuhkan lima item di atas; Doctype tanpa daftar = tanpa checklist dan tanpa gerbang. Rincian: spec §5.0.

## Catatan perbaikan (prasyarat F2–F4)
* [x] *(beres, dicek 2026-10-29: refresh token VPS OK)* Dropbox VPS `invalid_client`: periksa app key/secret di `.next/standalone/.env` VPS, hubungkan ulang akun.
* [x] *(sudah ada di lokal & VPS, dicek 2026-10-29)* Tambah scope `files.content.write` di Dropbox App Console, hubungkan ulang akun (lokal + VPS) agar hasil bisa ditulis ke `/_master/`.

## Perubahan yang dibutuhkan
* Skema (F1): `Doctype.qaChecklist String[]` (SQL aditif).
* Skema (F3): `MasterDeckJob` (taskId, sourceHash, status, spec Json, resultPath, error, timestamps); `Task.dropboxFolderPath` (simpan path saat File Request dibuat; path sekarang dihitung dari nama/bulan task dan meleset bila task di-rename).
* Permission baru `masterdeck.review` (Admin, Art Director, Project Manager).
* UI: indikator di kartu kanban, tab Checklist QA di drawer, halaman `/slide-master-builder` + item sidebar.
