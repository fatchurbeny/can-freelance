# Implementation Spec — Slide Master Builder + Checklist QA

Status: **siap diimplementasikan bertahap**, belum ada kode. Rencana & keputusan: [`../docs/backlog/master-deck-builder.md`](../docs/backlog/master-deck-builder.md).

## 0. Referensi desain

| Referensi | Link / file | Isi |
| :--- | :--- | :--- |
| **Desain UI (target)** | https://claude.ai/artifact/5vK7jUxXuAWGWZDV76TETE — page **v2 · impro.std** | 5 layar: Kanban SC_Elements + drawer, Antrean, Review Overlay, Layout & Theme, Ekspor & Verifikasi |
| Desain UI (pembanding) | artifact yang sama — page **v1 · Sebelumnya (master.deck)** | versi standalone sebelum masuk dashboard; jangan diimplementasikan |
| **Diagram alur** | https://claude.ai/artifact/XoQAVhocSqm7r9cHjYMTMM | swimlane Kanban · Dropbox · Worker · Reviewer, status job, keputusan teknis |
| Source wireframe | [`slide-master-builder/`](slide-master-builder/) | salinan `.dc.html` tiap artboard + `flow.html`. Hanya referensi markup/token; `.dc.html` butuh runtime Claude Design (`support.js`) untuk dirender, buka lewat link artifact di atas |

> **Sumber kebenaran UI = canvas artifact**, bukan salinan lokal. Salinan disamakan dengan canvas versi `1793257954-053f` pada 2026-10-29 (hanya `Main.dc.html` yang berubah: filter "Semua Production" + teks "tempat Anda menjadi anggota"). Bila canvas diedit lagi, ambil ulang lewat `Artifact read` (`project/*.dc.html`) sebelum mengimplementasikan layar terkait.

Artboard → file:

| Artboard | File | Target implementasi |
| :--- | :--- | :--- |
| 0 · Kanban SC_Elements · checklist QA | `Kanban.dc.html` | `QACard.tsx`, `TaskDetailSheet.tsx`, `task-detail/DesignBriefSection.tsx` |
| 1 · Antrean | `Main.dc.html` | halaman baru `/slide-master-builder` |
| 2 · Review overlay | `Review.dc.html` | `/slide-master-builder/[taskId]` tab Review |
| 3 · Layout & Theme | `Layouts.dc.html` | tab Layout & Theme |
| 4 · Ekspor & Verifikasi | `Export.dc.html` | tab Ekspor & Verifikasi |

> Shell di wireframe (sidebar, top bar) adalah tiruan. **Ikuti komponen yang ada** (`Sidebar.tsx`, `TopBar`, `ProductionTabNav`); sidebar asli punya item tambahan (Asset Report, Asset Library, Profil, Knowledge Graph) yang tidak digambar.

---

## 1. Tujuan

1. Task di production **output Dropbox** yang masuk **QA** otomatis diantrekan untuk dibuatkan slide master dari file .pptx/.pdf di folder Dropbox task.
2. QA memakai **Checklist QA** (Preview, Master Slides, Keynote, PPT, PPTX) sebagai **syarat pindah ke In Review** (siap submit ke platform).
3. Production Canva tidak terdampak.

## 2. Fase implementasi (urutan disarankan)

| Fase | Isi | Bergantung pada |
| :--- | :--- | :--- |
| **F1** | Checklist QA di body Notion + tab di drawer + indikator kartu + gerbang In Review | — |
| F2 | Auto-centang format dari isi folder Dropbox | perbaikan Dropbox VPS (§8) |
| F3 | `MasterDeckJob` + worker + halaman Slide Master Builder (Antrean, Review, Layout & Theme) | F2 |
| F4 | Rebuild + diff visual + simpan `/_master/` + centang Master Slides | scope `files.content.write` (§8) |

F1 bisa dikirim sendiri: Master Slides dicentang manual oleh QA sampai F4 selesai (flag sementara).

---

## 3. Layar & komponen

### 3.1 Kartu kanban — indikator saja (`QACard.tsx`)

```
[📄 Business Proposal Deck]
[1][Putery][@12p][Chital Graphic][ENG][Regular-Presentation][High][Pro] [☑ 3/5] [Menunggu file]
```

* Indikator = pill terakhir di baris pill: ikon checklist + `n/5`. Warna: **0/5 netral**, **1–4 amber**, **5/5 hijau** (palet §4).
* Klik indikator → buka drawer langsung di tab **Checklist QA**. Klik judul → drawer di tab default (§3.2).
* Badge **"Menunggu file"** (oranye) hanya bila job `WAITING_FILE`.
* Tidak ada checklist detail, progress bar, atau tombol di kartu.
* Tampil di semua status (Draft → Approved) untuk production Dropbox saja.

### 3.2 Drawer task — tab baru (`DesignBriefSection.tsx`, `TaskDetailSheet.tsx`)

Urutan tab: **DESIGN BRIEF · CHECKLIST QA `n/5` · COMMENTS (n)** (3 kolom sama lebar, gaya tab sekarang).

* `activeTab`: `'brief' | 'checklist' | 'comments'`. Default: `'checklist'` bila status QA, selain itu `'brief'`. Hanya untuk production Dropbox.
* Label tab memuat pill `n/5` dengan warna indikator.
* **Design Status** (baris properti): bila status QA dan `n < 5`, tampilkan sub-teks oranye "In Review terkunci sampai Checklist QA 5/5"; opsi In Review di dropdown disabled.
* Properti lain dan bagian DROPBOX tidak berubah. **Tidak ada properti Notion baru** untuk checklist.

Isi tab Checklist QA (latar `#F7F7F8`, kartu putih `rounded-none`):

```
CHECKLIST QA                                   [3/5]
Syarat pindah ke In Review
[📄 Tersimpan di body kartu Notion · bagian ✅ Checklist QA]
<catatan sesuai status>
┌──────────────────────────────────────────────┐
│ ☑ Preview          [Dropbox]                 │
│ ☐ Master Slides    [Siap review]  (terkunci) │
│ ☑ Keynote          [Dropbox]                 │
│ ☐ PPT              [Belum ada]               │
│ ☑ PPTX             [Dropbox]                 │
└──────────────────────────────────────────────┘
┌ Slide Master  [Siap review]   Buka di Slide Master Builder → ┐
┌ File di Dropbox (n file): PPTX / PPT / KEY / PDF / PNG + nama file ┐
[ PINDAH KE IN REVIEW ]  (aktif hanya QA + 5/5)
<hint>
```

| Status task | Catatan | Checkbox | Label sumber |
| :--- | :--- | :--- | :--- |
| Draft / Not Started | "Daftar ini adalah deliverable yang wajib diunggah designer." | read-only, kosong | `Wajib` |
| In Progress | "Tercentang otomatis saat designer mengunggah file." | read-only | `Dropbox` / `Belum ada` |
| QA | "Format file tercentang otomatis dari folder Dropbox, lalu QA mengonfirmasi…" | bisa dicentang QA; **Master Slides terkunci mulai F4** (selama F1–F3 dicentang manual oleh QA) | `Dropbox` / `Belum ada` / status job |
| In Review / Approved | "Checklist sudah lengkap." | read-only | — |

Tab Design Brief: tambahkan blok **Deliverable** (PPTX, PPT, Keynote, PDF, Preview; "file satuan, tanpa .zip").

### 3.3 Sidebar (`Sidebar.tsx`)

Tambah item di `menuItems`, grup `GET STARTED`, setelah Production:

```ts
{ name: 'Slide Master Builder', icon: Presentation, href: '/slide-master-builder',
  active: pathname.startsWith('/slide-master-builder'), group: 'GET STARTED' }
```

* Badge jumlah job yang butuh perhatian (`WAITING_FILE` + `READY_REVIEW`), pill oranye solid.
* Label satu baris (`whitespace-nowrap`). Disembunyikan bila role tanpa permission `masterdeck.review`.
* Permission **belum ada**: tambahkan `'masterdeck.review'` ke tipe `Permission`, `ALL`, dan `MANAGEMENT` di `src/lib/permissions.ts` (Admin, Art Director, Project Manager), lalu perbarui wireframe matriks role (https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL). Item sidebar baru juga perlu aturan pola dropdown di [`../docs/knowledge/sidebar-dropdown-pattern.md`](../docs/knowledge/sidebar-dropdown-pattern.md).

### 3.4 Halaman `/slide-master-builder`

Panel standar (border `#E4E4E7`, `rounded-none`, latar `bg-grid-pattern`), tab: **Antrean `n` · Review Overlay · Layout & Theme · Ekspor & Verifikasi**. Breadcrumb: `Slide Master Builder / <nama task>`. Toolbar flat: search · sort · filter · CTA oranye uppercase di kanan.

* **Satu Slide Master Builder untuk semua production** (keputusan 2026-10-29): antrean global, bukan tab per production. Hanya production `outputType = dropbox_link` yang masuk.
  * **Filter Production** di toolbar Antrean (default "Semua Production" + jumlah production Dropbox yang bisa diakses).
  * **Isi dibatasi Membership**: user hanya melihat job dari ProductionUnit tempat ia menjadi anggota (aturan akses production yang sama; server tetap memfilter, bukan hanya UI). Badge sidebar ikut dihitung dari job yang terlihat.
  * Dari production cukup lewat tab Checklist QA di drawer ("Buka di Slide Master Builder →"); tidak ada tab Slide Master di halaman production.
* **Antrean** (`Main.dc.html`): board 5 kolom `Menunggu File · Dianalisis · Siap Review · Rebuild · Selesai`. Kartu: pill production, designer, pill `PPTX ✓`/`PDF ✗`, progres parse, catatan. Toolbar: search · sort · **Production** · filter · CTA "CEK DROPBOX".
* **Review Overlay** (`Review.dc.html`): kolom `Slide (rail 150px) | Kanvas | Elemen (330px)`. Overlay di atas render PDF (pdf.js) atau wireframe. Toggle layer Master/Layout/Konten, Render PDF/Wireframe. Detail elemen: keyakinan, alasan, posisi, gaya, Terima/Tolak/Pindah. CTA "TERIMA SEMUA ≥ 90%".
* **Layout & Theme** (`Layouts.dc.html`): board 4 kolom `Master · Layout · Usulan LLM · Audit Theme`.
* **Ekspor & Verifikasi** (`Export.dc.html`): kolom `Langkah Rebuild · Diff Visual (grid 20) · Detail selisih`. CTA "UNDUH .PPTX".

---

## 4. Token visual

* Font: **Inter** untuk semua UI. Mono (JetBrains Mono / `font-mono`) **hanya** untuk nama file, path Dropbox, ID, dan kode (aturan CLAUDE.md).
* Aksen: `#FF5B1F` (CTA, tab aktif, ikon menu). Teks `#18181B`, muted `#71717A`, garis `#E4E4E7`.
* Pill: `text-xs px-[7px] py-px rounded-[5px] border`.

| Peran | Border | Latar | Teks |
| :--- | :--- | :--- | :--- |
| Netral / 0/5 / Konten | `#E4E4E7` | `#FAFAFA` | `#3F3F46` |
| Amber / sebagian / QA | `#FDE68A` | `#FFFBEB` | `#A16207` |
| Hijau / 5/5 / Layout | `#BBF7D0` | `#F0FDF4` | `#15803D` |
| Merah / Belum ada / Berbeda | `#FECACA` | `#FEF2F2` | `#DC2626` |
| Oranye / Menunggu file / Audit | `#FED7AA` | `#FFF7ED` | `#C2410C` |
| Biru / Dropbox | `#BFDBFE` | `#EFF6FF` | `#1D4ED8` |
| Indigo / Master | `#C7D2FE` | `#EEF2FF` | `#4F46E5` |
| Ungu / LLM | `#E9D5FF` | `#FAF5FF` | `#9333EA` |

Overlay Review: Master = garis solid indigo, Layout = garis putus hijau, Konten = titik abu, chip usulan LLM ungu, elemen terpilih outline oranye.

---

## 5. Data & format

### 5.0 Item checklist mengikuti Doctype (keputusan 2026-10-29)

Item checklist **ditentukan oleh Doctype task**, bukan daftar tetap. Doctype presentasi saat ini (`PPTX, Slides, Keynote`, kategori `Presentation`, platform Envato Elements) membutuhkan lima item: **Preview, Master Slides, Keynote, PPT, PPTX**. Semua `n/5` di dokumen ini berarti `n/total` milik Doctype tersebut.

* Skema: kolom baru `Doctype.qaChecklist String[] @default([]) @map("qa_checklist")`, urutan array = urutan tampil. Array kosong = Doctype tanpa checklist: tidak ada section, indikator, maupun gerbang.
* Isi awal: lima item di atas untuk Doctype kategori `Presentation` di platform `dropbox_link`. Kolom ini **aditif**; terapkan dengan SQL aditif (`ALTER TABLE doctypes ADD COLUMN qa_checklist text[] NOT NULL DEFAULT '{}'`) + `UPDATE`, bukan `db push` dari branch yang skemanya tidak lengkap (lihat gotcha DB bersama di session handover).
* Diedit di `DoctypeSlideModal.tsx` (daftar item: tambah, hapus, ubah urutan), hanya untuk Doctype platform Dropbox.
* Kaitan ke otomatisasi: item bernama **Master Slides** dicentang oleh job (F4); item yang cocok dengan format file (**PPTX**, **PPT**, **Keynote** → `.key`, **Preview** → gambar) dicentang dari isi folder Dropbox (F2). Item lain hanya bisa dicentang manual oleh QA.
* **Section dibuat** dari `doctype.qaChecklist` saat task dibuat. Bila Doctype task diganti selagi status Draft/Not Started, section dibuat ulang dari Doctype baru; setelah itu section tidak diubah otomatis (centang yang ada dipertahankan).
* **Task lama** tanpa section: section dibuat saat task masuk QA (atau lewat skrip backfill). Sampai section ada, gerbang menghitung `0/total` dari Doctype, sehingga tidak ada task yang lolos hanya karena section belum dibuat.

### 5.1 Checklist di body Notion

Section di body kartu (dibuat dari `doctype.qaChecklist`; contoh untuk Doctype presentasi):

```markdown
## ✅ Checklist QA
- [ ] Preview
- [ ] Master Slides
- [ ] Keynote
- [ ] PPT
- [ ] PPTX
```

* **Pull**: sudah jalan — blok `to_do` → `- [x] …` di `Task.bodyText` (`sync-notion.ts`).
* **Push**: **perlu ditambah** — `markdownToNotionBlocks` (`actions/qa.ts`) harus mengubah `- [ ] x` / `- [x] x` menjadi blok `to_do` (`checked`), bukan bullet.
* Parser `parseChecklistSection(bodyText)` mengikuti pola `parseAssetSection` (`lib/asset-brief.ts`); cocokkan heading tanpa peka huruf/emoji, item by label.
* Centang dari app/worker = ubah baris di `bodyText` lalu antrekan push (`notion-body-push.ts`, mengganti seluruh body).
* Tab Design Brief **tidak** menampilkan section ini (disaring dari preview brief).
* **Urutan section**: `markdownToNotionBlocks` selalu memanggil `orderBriefMarkdown` (`task-detail/brief-parser.ts`). Heading checklist kini jatuh ke kind `custom` (rank 6) dan akan dipindah ke tengah body. Tambahkan kind `checklist` di `classifyHeading` + `BRIEF_ORDER` dengan rank paling akhir.
* **Autosave brief jangan menghapus checklist**: karena tab Design Brief menyaring section ini, setiap simpan `bodyText` dari editor brief (`updateTaskFieldsAction({ bodyText })`) harus menyambung kembali section checklist dari `bodyText` terakhir di server. Lakukan di server (gabungkan sebelum simpan), bukan di client.

#### Risiko push seluruh body

`pushBodyToNotion` menghapus lalu menulis ulang semua blok. Untuk centang satu kotak ini berarti: blok gambar palet ikut dibuat ulang, dan centang yang dibuat di Notion tapi belum ter-sync **tertimpa** `bodyText` lama dari app. Mitigasi F1: tarik body terbaru dari Notion tepat sebelum mengubah centang (baca → ubah satu baris → push). Opsi lebih baik (bisa menyusul): simpan `block_id` tiap to-do saat pull, lalu ubah via `blocks.update({ to_do: { checked } })` tanpa mengganti body.

### 5.2 Gerbang In Review

Ada **dua jalur** ubah status di app, keduanya wajib dicek:

| Jalur | Pemanggil |
| :--- | :--- |
| `updateTaskStatusAction(taskId, statusNotionKey)` | drag kanban (`SortableTaskLists.tsx`), tombol aksi kartu di drawer (`TaskDetailSheet.tsx`) |
| `updateTaskFieldsAction(taskId, { designStatusId })` | dropdown Design Status di drawer (`TaskDetailSheet.tsx`, autosave) |

Buat satu helper server, panggil di keduanya sebelum update lokal:

```ts
// lib/checklist-qa.ts
export async function assertChecklistAllowsStatus(taskId: string, targetStatusId: string): Promise<string | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { designStatus: true, doctype: true, productionUnit: { include: { platform: true } } },
  });
  const target = await prisma.designStatus.findUnique({ where: { id: targetStatusId } });
  if (!task || !target || task.productionUnit.platform.outputType !== 'dropbox_link') return null;
  if (!isQaStatus(task.designStatus) || !isInReviewStatus(target)) return null;
  const required = task.doctype?.qaChecklist ?? [];
  if (required.length === 0) return null; // Doctype tanpa checklist
  const c = parseChecklistSection(task.bodyText, required); // item yang belum ada di section = belum tercentang
  return c.done < c.total ? `Checklist QA belum lengkap (${c.done}/${c.total})` : null;
}
```

* `isQaStatus` / `isInReviewStatus` **belum ada**. Kenali status dari nama, dengan aturan yang sama seperti `sync-notion.ts` (`isQaVariant`: `qa`, `q&a`, `in qa`, `quality assurance`). Pindahkan aturan itu ke helper bersama agar sync dan gerbang tidak berbeda.
* `updateTaskStatusAction` saat ini hanya memuat `productionUnit.fieldMapping`; helper di atas memuat sendiri platform dan status sekarang.

Perubahan status langsung di Notion tidak bisa diblokir → saat sync, tandai kartu "Checklist belum lengkap" (badge), **jangan** kembalikan status diam-diam.

### 5.3 Job (F3+)

`MasterDeckJob { id, taskId, sourceHash, status, spec Json?, resultPath?, error?, createdAt, updatedAt }`, status: `QUEUED → FETCHING → ANALYZING → READY_REVIEW → REBUILDING → DONE`, cabang `WAITING_FILE`, `DIFF_FAILED`, `SUPERSEDED`, `ERROR`. Idempotent per `taskId + content_hash`. Plus `Task.dropboxFolderPath` (path disimpan saat File Request dibuat).

---

## 6. Interaksi & edge case

* Klik indikator kartu → drawer tab Checklist QA; klik di luar drawer / tombol X → tutup.
* Master Slides tidak bisa dicentang manual (setelah F4); tooltip "Tercentang otomatis setelah deck master selesai".
* Upload ulang setelah QA menolak → job lama `SUPERSEDED`, format di checklist dihitung ulang dari folder.
* File `.zip` di folder → tidak dihitung; badge "Menunggu file" dengan alasan.
* PDF wajib untuk analisis; tidak termasuk checklist, tapi tanpa PDF job `WAITING_FILE`.

## 7. Acceptance criteria (F1)

**Status 2026-10-29: F1 diimplementasikan.** Diverifikasi di dev `AUTH_MODE=off` (port 3013): alur app dengan task `app_created_`, lalu push/pull Notion dengan task Notion asli "Test Fase 6 Task" (SC-Element; dikembalikan ke kondisi awal setelah uji).

- [x] `Doctype.qaChecklist` ada (SQL aditif `prisma/sql/2026-10-29-doctype-qa-checklist.sql`), Doctype presentasi berisi 5 item, dan bisa diedit di `DoctypeSlideModal` (satu item per baris).
- [x] Production Dropbox: kartu kanban menampilkan indikator `n/total` sesuai Doctype dengan warna sesuai; production Canva dan Doctype tanpa checklist tidak.
- [x] Drawer punya 3 tab berurutan Design Brief · Checklist QA · Comments; default Checklist QA saat status QA.
- [x] Centang di app tersimpan sebagai blok to-do di body Notion (heading_2 + `to_do` checked), dan section dibuat saat Doctype dipilih.
- [x] Centang di Notion muncul di app setelah sync (incremental Sync Now).
- [x] Centang di Notion yang belum ter-sync tidak tertimpa saat QA mencentang item lain dari app (`toggleChecklistItemAction` membaca checklist Notion dulu). **Batas**: dalam 2 menit setelah push body dari app (`isBodyPushBusy`), pembacaan ini dilewati, sama seperti pull sync.
- [x] Pindah QA → In Review ditolak sampai 5/5, ditolak di server: dropdown Design Status dan tombol "Pindah ke In Review" diuji; drag kanban memakai `updateTaskStatusAction` yang sama (gerbang diuji lewat unit check, tidak lewat drag manual).
- [x] Mengedit dan menyimpan Design Brief tidak menghapus section Checklist QA (app, DB, dan body Notion).
- [x] Section Checklist QA tetap di akhir body Notion setelah push brief (template struktur → Template Wireframe, Keywords, lalu Checklist QA).
- [x] Tidak ada properti baru di database Notion.
- [x] `npx tsc --noEmit` lulus; Inter di semua UI baru.

Belum termasuk F1 (menunggu F2/F3): kartu "Slide Master" + tautan "Buka di Slide Master Builder", daftar "File di Dropbox", badge "Menunggu file", dan blok Deliverable di tab Design Brief.

Acceptance criteria (F3): Antrean global punya filter Production dan hanya memuat job dari production tempat user menjadi anggota (diverifikasi via "Lihat sebagai").

## 8. Catatan perbaikan (prasyarat F2–F4)

- [x] *(beres, dicek 2026-10-29: refresh token VPS OK)* Dropbox VPS `invalid_client`: periksa app key/secret di `.next/standalone/.env` VPS, hubungkan ulang.
- [x] *(sudah ada di lokal & VPS, dicek 2026-10-29)* Tambah scope `files.content.write` di Dropbox App Console, hubungkan ulang akun (lokal + VPS).

## 9. Pertanyaan terbuka

* ~~Item tetap lima atau ikut Doctype?~~ **Diputuskan 2026-10-29: ikut Doctype** (§5.0).
* Task Dropbox yang **sudah ada** sebelum F1: pilih backfill sekali jalan (pola `scripts/backfill-*.ts`) atau cukup dibuat saat masuk QA (§5.0). Default: dibuat saat masuk QA.
