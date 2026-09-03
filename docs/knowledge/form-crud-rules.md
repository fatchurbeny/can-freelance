# Master Standard: Form Input, Slide-over Modals, Dropdowns & CRUD Layouts — CAN-Freelance

Dokumen ini merupakan **Aturan Standar Resmi (Single Source of Truth)** untuk perancangan, pengembangan, dan modifikasi fitur berwujud **Form Input, Slide-over Drawer Modal, Custom Dropdown, Symmetrical Table Layout, dan CRUD Views** pada proyek `can-freelance`.

Seluruh LLM (Gemini, Claude, GPT) dan Code Editor (Antigravity IDE, Cursor, VS Code, Claude Code) **WAJIB mematuhi standar ini secara otomatis** tanpa meminta penjelasan atau spesifikasi desain ulang dari pengguna.

---

## 🏛️ 1. Slide-over Drawer Modal Architecture

Setiap dialog tambah/edit data (*create/edit modal*) yang dipanggil dari aksi tabel atau tombol utama **HARUS menggunakan struktur Slide-over Drawer Right Side**:

### Structure & Container Tokens
* **Overlay Backdrop**: `fixed inset-0 z-70 bg-black/40 cursor-pointer`
* **Drawer Panel**: `absolute right-0 top-0 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]`
* **Header Bar**: 
  - Class: `flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 shrink-0`
  - Ikon Judul: `w-8 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] flex items-center justify-center shrink-0`
  - Judul: `font-sans text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider`
  - Tombol Close `X`: `flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer`

---

## 📐 2. Continuous 2-Column Symmetrical Table Grid Form Body

Form input **DILARANG KERAS** menggunakan form melayang terpisah dengan margin/padding kotak (`p-4 sm:p-5 rounded-lg border`). Seluruh input disajikan sebagai **Edge-to-Edge Continuous Symmetrical Table Grid**:

### Baris Grid Form (`divide-y divide-[#f0f0f0] dark:divide-[#272a34]`)
* **Outer Row Container**: `flex items-stretch text-xs font-sans min-h-[44px]`
* **Sel Label Kiri (Wajib Fixed 150px)**:
  - Class: `w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap`
  - Dilengkapi ikon Lucide 14px (`FileText`, `Code`, `FolderGit2`, `Maximize2`, `Ratio`, `Percent`, `Copy`, `DollarSign`, `Calculator`, `AlignLeft`, `CheckCircle2`).
* **Aturan Slim Label Height (Dilarang Membawa Asterisk `*`)**:
  - DILARANG menempelkan tanda asterisk `*` pada teks label yang menyebabkan kata berpindah ke baris kedua.
  - Teks label HARUS berada dalam 1 baris utuh (`whitespace-nowrap`) agar tinggi baris tabel tetap ramping & compact (`min-h-[44px]`).
* **Sel Input / Kontrol Kanan**:
  - Class: `flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]`
  - Input Field: `w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors`

---

## 🔽 3. Cloudflare Custom Dropdowns Standard

DILARANG KERAS menggunakan elemen native HTML `<select>`. Setiap pilihan dropdown form HARUS menggunakan **Custom Cloudflare Dropdown Component** (`CategorySelectCell.tsx`, `RoleSelectCell.tsx`):

### Spesifikasi Component Dropdown
* **Trigger Cell**:
  `w-full h-full min-h-[44px] flex items-center justify-between px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-sans font-bold text-gray-900 dark:text-white transition-colors cursor-pointer select-none`
* **Dropdown Floating Panel**:
  `absolute left-0 right-0 top-full z-50 mt-0 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl font-sans text-xs flex flex-col p-1.5 space-y-0.5 max-h-60 overflow-y-auto`
* **Cloudflare Contrast Checkbox**:
  Item terpilih dilengkapi kotak centang di sisi kanan: `w-4 h-4 rounded-[5px] border flex items-center justify-center bg-black border-black text-white dark:bg-white dark:border-white dark:text-black` dengan ikon `<Check className="w-3 h-3 stroke-[3]" />`.
* **Opsi Input Kustom**:
  Menyediakan opsi penulisan manual di baris paling bawah panel: `<button type="button">` berlabel `Ketik ... Kustom...` dengan ikon `<Edit3 className="w-3.5 h-3.5" />` berwarna `text-[#ff5e1f]`.

---

## 🔘 4. Segmented Option Buttons Grid

Untuk pilihan opsi berjarak pendek (seperti Aspek Rasio, Bobot Pool Rate, atau Status), gunakan **Full-Height Segmented Grid**:

* **Container**: `grid grid-cols-N divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch`
* **Keadaan Inaktif**: `bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300 font-sans text-xs font-bold uppercase`
* **Keadaan Aktif Sesuai Warna Standard**:
  - Pilihan utama / Rasio: `bg-[#ff5e1f] text-white font-bold`
  - Opsi Sekunder / 1.0x: `bg-[#615fff] text-white font-bold`
  - Status `ACTIVE`: `bg-[#00a67d] text-white font-bold`
  - Status `INACTIVE` / `RESIGN`: `bg-[#6e7687] text-white font-bold`

---

## 🎨 5. Standard Color Tokens Palette

| Peran Warna | Hex / Tailwind Token | Penerapan dalam UI Form & CRUD |
| :--- | :--- | :--- |
| **Primary Accent Orange** | `#ff5e1f` (`hover:bg-[#ff7038]`) | Tombol aksi simpan utama (`SAVE`), Header icon box, kalkulasi total payout, kode identifier text, tombol rasio aktif. |
| **Secondary Accent Purple** | `#615fff` | Tombol segmented opsi sekunder (seperti `1.0x` / `Freelance`). |
| **Active Emerald Green** | `#00a67d` | Status badge & tombol status `ACTIVE`. |
| **Neutral Dark Gray** | `#6e7687` | Status badge & tombol status `INACTIVE` / `RESIGN`. |
| **Dark Mode Base Card** | `#0d0e12` | Latar belakang panel utama slide-over modal dan continuous card. |
| **Dark Mode Surface & Input** | `#16181d` | Latar belakang sel header, sel label kiri, dropdown panel, dan input area. |
| **Dark Mode Border** | `#272a34` | Garis pembatas sel tabel simetris (`divide-[#272a34]`). |
| **Light Mode Border** | `#f0f0f0` | Garis pembatas sel tabel terang (`divide-[#f0f0f0]`). |

---

## 💾 6. Action Footer (2-Column Full-Width Row)

Di bagian bawah Slide-over Modal, footer tombol aksi disusun sebagai **Symmetrical 2-Column Table Row**:

* **Container**: `grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-t border-[#f0f0f0] dark:border-[#272a34] shrink-0`
* **Sisi Kiri (50% CANCEL)**:
  `w-full py-3.5 px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] font-sans text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors cursor-pointer text-center`
* **Sisi Kanan (50% + SAVE DATA)**:
  `w-full py-3.5 px-4 bg-[#ff5e1f] hover:bg-[#ff7038] font-sans text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer text-center`

---

## ⚡ 7. Otomatisasi & Dynamic Computations

Jika suatu form membutuhkan komputasi (seperti pendeteksian rasio dari dimensi canvas atau komputasi total payout), buat pendeteksi otomatis secara *real-time*:

```ts
// Contoh: Deteksi Aspek Rasio otomatis dari input Dimensi Canvas
function detectAspectRatio(dimStr: string): string | null {
  if (!dimStr) return null;
  const match = dimStr.match(/(\d+)\s*[\timesxX\*\:\/]\s*(\d+)/);
  if (!match) return null;
  const w = parseFloat(match[1]);
  const h = parseFloat(match[2]);
  if (!w || !h || h === 0) return null;
  const ratio = w / h;
  if (Math.abs(ratio - (16 / 9)) < 0.08) return '16:9';
  if (Math.abs(ratio - (1 / 1)) < 0.08) return '1:1';
  if (Math.abs(ratio - (4 / 5)) < 0.08) return '4:5';
  if (Math.abs(ratio - (9 / 16)) < 0.08) return '9:16';
  return null;
}
```

---

## 🔤 8. Typography Standard (`font-sans` Only)

Seluruh antarmuka UI (tabel data, subtitle handle brand/doctype, nominal mata uang `Rp 15.000`, aspek rasio `16:9`, input form, tombol, dan dialog) **WAJIB menggunakan font `Inter` (`font-sans`)**.

- **Dilarang keras** menggunakan `font-mono` untuk subtitle handle nama, identifier doctype, atau nominal mata uang pada tabel/form UI.
- `font-mono` HANYA diizinkan secara terbatas pada **Notion Database ID / UUID**, **Secret Token / API Key**, **Blok Kode (`<code>`)**, dan **Terminal Sync Console Logs**.

