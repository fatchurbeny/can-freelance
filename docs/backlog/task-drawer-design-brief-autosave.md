# Spec: Task Drawer — Redesign Area Setelah Canva Template Link

> **Executor**: Antigravity · **Role**: `🎨 [Frontend & UI/UX]`
> **Design reference**: https://claude.ai/artifact/TdtGTFGGLVN6DpSFnqsXvP (artboard `Drawer — Redesigned`)
> **File utama**: `src/components/TaskDetailSheet.tsx`, `src/components/TaskBodyEditor.tsx`, `src/components/ImageColorPalettePicker.tsx`
> **Dibuat**: 2026-10-14

## 0. Pre-Execution
Baca `docs/knowledge/index.md`, `docs/knowledge/session-handover.md`, `docs/knowledge/roles.md`, dan ikuti skill `.agents/skills/ui-component-development/` (`TaskDetailSheet.tsx` sudah 853 baris → bagian baru diekstrak ke komponen terpisah).

## 1. Yang TIDAK berubah
Header (judul, open in Notion, close), Last Edited, seluruh baris properti (Design Status … Brand), dan section Canva Template Link — pertahankan persis seperti sekarang.

## 2. Daftar Perubahan

### 2.1 Lebar drawer
`max-w-[540px]` → `max-w-[720px]`.

### 2.2 Dua tab di bawah Canva Template Link
- Tab: `DESIGN BRIEF` (default) dan `COMMENTS (n)`.
- Tab aktif: teks + garis bawah `#ff5e1f`.
- Tab Design Brief berisi konten brief (2.3–2.5); tab Comments berisi daftar komentar + input `KIRIM` yang sekarang.

### 2.3 Design Brief: dua mode — Preview & Edit
- **Preview (default)**: tiap section `bodyText` ditampilkan sebagai kartu bernomor sesuai desain:
  - Reference Image → thumbnail gambar.
  - Color Palette → swatch warna + role + hex.
  - Template Wireframe & Reference → kartu link (badge WIREFRAME / REFERENCE, URL `font-mono`).
  - Keywords → chip/tag.
  - Section lain → teks biasa.
- **Edit**: editor yang ada sekarang (`TaskBodyEditor`: heading `##` + textarea per section + `+ ADD SECTION`).
- Tombol toggle `Edit` / `Preview` di header Design Brief, di samping tombol Copy.
- Data tetap `bodyText` markdown yang sama (tanpa perubahan schema). Preview hanya membaca hasil parse heading `##`.

### 2.4 Urutan section
1. Reference Image
2. Color Palette
3. Template Wireframe & Reference
4. Keywords
5. Section lain (custom) setelahnya

### 2.5 Color Palette uploader
Row "Color Palette" (`ImageColorPalettePicker`) yang sekarang terpisah di atas editor dipindah ke dalam section Color Palette pada mode Edit. Perilaku `onInsertPalette` (termasuk dedup regex dari sesi `#SESS-20261014-06`) tetap sama.

### 2.6 Hapus tombol SAVE → inline auto-save
- Hapus tombol `SAVE` di header beserta alur `saveAllChanges`.
- Setiap field tersimpan otomatis via `updateTaskFieldsAction` (kirim field yang berubah saja):
  - Dropdown / toggle / brand: langsung saat dipilih.
  - Input teks & angka: saat blur / Enter.
  - `bodyText` (mode Edit): debounce saat berhenti mengetik, dan saat keluar dari mode Edit / tutup drawer.
- Indikator status di baris Last Edited: `Menyimpan…` → `Tersimpan ✓`, atau `Gagal menyimpan` jika error.

## 3. Acceptance Criteria
- [ ] Bagian header s/d Canva Template Link tampil sama seperti sebelumnya (minus tombol SAVE).
- [ ] Drawer lebar 720px.
- [ ] Tab Design Brief / Comments berfungsi.
- [ ] Design Brief punya mode Preview (default) dan Edit; data body lama tampil benar di Preview.
- [ ] Urutan section: Reference Image, Color Palette, Template Wireframe & Reference, Keywords.
- [ ] Uploader palet berada di dalam section Color Palette (mode Edit).
- [ ] Tidak ada tombol SAVE; perubahan tersimpan otomatis dengan indikator status.
- [ ] Invariants: Inter (`font-sans`), `font-mono` hanya URL/hex, container `rounded-none`, `"use client"` dipertahankan.
- [ ] `npx tsc --noEmit` dan `npm run build` exit 0.

## 4. Penutupan Sesi
Update `docs/knowledge/session-handover.md` (session signature, file yang diubah, keputusan SAVE → auto-save, hasil verifikasi).
