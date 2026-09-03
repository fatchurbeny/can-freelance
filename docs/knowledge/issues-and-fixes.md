# Issues, Gotchas & Layout Rules — CAN-Freelance

Dokumen ini mencatat histori bug, edge cases, serta aturan layout CSS/React untuk mencegah bug terulang di masa depan.

---

## ⚡ Gotchas Teknis & Framework Rules

### 1. Preservasi Directive Next.js `"use client"`
* **Masalah**: Refactoring atau rewrite file React Server Component yang membutuhkan React hooks (`useState`, `useEffect`) tanpa `"use client"` akan menyebabkan crash RSC.
* **Aturan**: Wajib mempertahankan directive `"use client"` di baris paling atas file komponen client.

### 2. Prisma Decimal & Date Serialization
* **Decimal Fields**: Field Prisma `Decimal` (`poolScore`, `pages`, `qtySubmit`) BUKAN JS primitive number. Saat mengirim data ke Client Component, WAJIB diserialisasi dengan `JSON.parse(JSON.stringify(data))`.
* **DateTime Fields**: Coerce field tanggal sebelum melakukan perbandingan timestamp:
  ```typescript
  const getTime = (v?: string | number | null) => 
    v == null ? 0 : typeof v === 'number' ? v : new Date(v).getTime();
  return getTime(b.lastEditedTime) - getTime(a.lastEditedTime);
  ```

### 3. Formulasi Pool Score & Harmonisasi Penamaan Notion
* **Masalah**: Istilah "Pool Rate" di UI (Rate Card & Modal Edit) tidak selaras dengan nama properti Notion "Pool Score", dan kalkulasi `poolScore` keliru mengalikan dengan `pages` (`pages * poolRate * qtySubmit`), menyebabkan task 12 halaman ber-score 12 padahal seharusnya 1.
* **Solusi & Aturan**:
  1. Istilah UI di Rate Card & Modal WAJIB menggunakan **`Pool Score`** (atau `Pool Score (Bobot)`).
  2. Perhitungan `poolScore` pada Server Actions (`qa.ts`) WAJIB menggunakan `poolRate * qtySubmit` tanpa mengalikan dengan `pages`.

### 4. Task Card Hover Actions & Event Propagation Guarding
* **Masalah**: Menambahkan tombol aksi interaktif (seperti 3-dots `MoreHorizontal`, `Duplicate`, atau `Delete`) di dalam elemen kartu yang memiliki handler `onClick` dan `onDragStart` (seperti `QACard.tsx`) berisiko memicu pembukaan drawer detail secara tidak sengaja atau memicu dragging saat tombol aksi diklik.
* **Aturan**:
  1. Seluruh handler klik pada tombol aksi hover dan dropdown menu WAJIB menggunakan `e.stopPropagation()` dan `e.preventDefault()`.
  2. Gunakan `relative group` pada container kartu dan `absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity` untuk menyajikan tombol 3 titik yang bersih dan muncul saat hover.

---

## 🎨 Tailwind & UI Layout Rules

### 1. Prevensi Overflow Clipping pada Floating UI
* **Masalah**: Elemen melayang (*floating UI* seperti dropdown/tooltip) terpotong (*clipped*) oleh kontainer induk.
* **Aturan**: Dilarang menempatkan elemen melayang berposisi `absolute` di dalam kontainer induk yang menggunakan `overflow-hidden`, `overflow-auto`, atau `overflow-scroll`.

### 2. Prevensi Stacking Context Trap
* **Masalah**: Penggunaan `opacity-*`, `transform`, `grayscale`, atau `backdrop-blur` pada kontainer induk membuat stacking context baru yang menjebak dropdown di bawah baris berikutnya.
* **Aturan**: Terapkan kelas visual state langsung ke elemen anak spesifik (teks/avatar), bukan pada pembungkus induk tempat dropdown berada.

### 3. Sidebar Desktop Default State (Mini Rail ~72px)
* **Aturan Layout**: Pada layar desktop (`md:` breakpoint), Sidebar berstatus default mini icon rail (~72px) yang selalu tampil di dalam flow flex row (`md:translate-x-0`). Jangan pernah meng-unmount atau memberikan `-translate-x-full` pada desktop.

### 4. Continuous Cloudflare Card Layout & Prevensi Double Border
* **Aturan**: Saat menggabungkan header (seperti Tab Bar) dan panel konten ke dalam 1 continuous card (`border border-[#f0f0f0] dark:border-[#272a34] divide-y`), hapus border luar ganda (`border`) dari komponen visualizer anak agar menyatu rapi tanpa tepi berlipat.

### 5. Dynamic 2D Canvas Light/Dark Theme Rendering

### 6. Standardisasi Typography & Ukuran Teks Tab Navigation Bar (`text-xs`)
* **Masalah**: Penggunaan `text-sm` (14px) atau `uppercase` pada bilah navigasi tab membuat teks judul tab ("DESIGNER TEAM") terlihat terlalu besar, tidak proporsional, dan berbeda dengan bilah navigasi referensi (`ProductionTabNav.tsx`).
* **Aturan**:
  - Ukuran teks tab navigasi WAJIB konsisten **`text-xs font-sans`** (12px) dengan format **Title Case** (`Designer Team (6)`, `Canva Accounts / Brands (6)`).
  - Padded height: `px-4 py-2.5` (atau `px-5 py-3 text-xs`).
  - Casing `uppercase` HANYA diperbolehkan pada tombol aksi CTA berwarna oranye di sudut paling kanan (`+ ADD TEAM/ACCOUNT`).
  - Aturan ini telah didokumentasikan permanen di `.agents/AGENTS.md` agar seluruh AI agent dan developer tidak membuat variasi ukuran teks near-miss.

### 7. Flat Continuous Table Toolbar & Dropdown Sort/Filter Protocol
* **Masalah**: Tombol filter status melayang atau tombol segment horizontal membuat antarmuka toolbar tidak konsisten dengan komponen sorting tabel lain (`SortControl.tsx`).
* **Aturan**:
  - Input pencarian WAJIB disusun sebagai sel header flat (`h-11 px-3.5 flex items-center border-b border-[#272a34] bg-white dark:bg-[#0d0e12]`) tanpa margin padding internal.
  - Filter status desainer (`ALL Status`, `Active Only`, `Inactive Only`, `Resign Only`) dan sorting disajikan sebagai **Dropdown Menu Terintegrasi Sel Header Flat** (`h-full px-4 flex items-center gap-2 text-xs font-sans font-medium border-r border-[#272a34]`). Panel dropdown melayang (`bg-white dark:bg-[#16181d] p-1.5 shadow-xl border-[#272a34]`) dilengkapi **Cloudflare Checkbox** di sebelah kanan (`w-4 h-4 rounded-[5px] border flex items-center justify-center`).
  - Badge informasi non-interaktif (seperti `LEADERBOARD #1: Putery`) adalah label tag independen (`px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20`), TIDAK PERLU dipaksakan menjadi sel tabel simetris.

### 6. Cloudflare Checkbox Contrast Inversion Rule
* **Aturan**: Native & custom checkboxes mengikuti kontras Cloudflare. Mode Terang: `bg-black border-black text-white`. Mode Gelap: `bg-white border-white text-black`. Native inputs diatur otomatis di `src/app/globals.css`.

### 7. Cloudflare Translucent Pill Badges & Property Pills
* **Aturan**: Badge statistik (`AVG. X PAGES`, `X TEMPLATE`, `🏆 Top Performer`) dan property pills (`QACard`) wajib menggunakan `font-mono text-[10px] font-bold uppercase rounded-full px-2.5 py-0.5` dengan transparansi 10% background (`bg-color/10`), 20% border (`border-color/20`), dan teks solid.

### 8. Outer Container vs. Control Rounding Invariant
* **Aturan Layout**: Kontainer utama luar (*continuous card*) menggunakan `rounded-none` tanpa gap. Namun, elemen kontrol interaktif di dalamnya (sakelar toggle, badge status, pill count, tombol aksi, dan tempat logo) WAJIB MEMPERTAHANKAN bentuk melengkungnya (`rounded-full`, `rounded-lg`, `rounded`) agar tidak tampil *boxy* (kotak kaku).

### 9. Notion Auto Sync Countdown Protocol & Initial Delay Invariant
* **Masalah**: Mengaktifkan atau menyimpan jadwal Auto Sync sebelumnya dapat memicu *instant sync* tidak terduga jika sync terakhir terjadi di masa lalu.
* **Aturan Mutlak (Dilarang Terulang)**:
  1. **Initial Countdown Guarantee**: Pengaktifan atau pengubahan jadwal Auto Sync (`autoSync` & `syncInterval`) WAJIB memicu hitung mundur (*countdown*) interval penuh terlebih dahulu (misal: `15:00` $\rightarrow$ `14:59` $\rightarrow$ ... $\rightarrow$ `00:00`). TIDAK BOLEH memicu sync instan saat tombol simpan diklik.
  2. **Timestamp Reference**: `referenceStartTime` di `/api/sync/cron/route.ts` WAJIB memprioritaskan `config.updatedAt` saat jadwal diaktifkan/diubah agar sisa waktu dihitung dari durasi interval penuh.
  3. **Return `nextSyncInMs`**: `/api/sync/cron/route.ts` WAJIB mengembalikan field `nextSyncInMs: intervalMs` pada respon eksekusi sukses.
  4. **Guarding `SyncButton.tsx`**: Dilarang melakukan fallback `setCountdownMs(0)` saat refetch status cron. setCountdownMs hanya bernilai 0 jika timer hitung mundur alami telah habis.

### 11. Force Graph Simulation Hover Isolation & State Ref Binding
* **Masalah**: Pada komponen canvas 2D Force Graph (`GraphifyVisualizer.tsx`), memasukkan state `hoveredNode`, `selectedNode`, atau `isDark` ke dalam dependency array `useEffect` simulasi fisik menyebabkan efek dibersihkan (*cleanup*) dan dieksekusi ulang dari awal setiap kali kursor tetikus menyentuh node (`setHoveredNode`). Hal ini mereset koordinat `x, y` secara acak (`Math.random()`) dan mereset energi simulasi (`alpha = 1`), sehingga grafik bergetar/melompat hebat saat di-hover.
* **Aturan Solusi**:
  1. Tempatkan `hoveredNode`, `selectedNode`, dan `isDark` ke dalam `useRef` (seperti `hoveredNodeRef.current = hoveredNode`).
  2. Dependency array `useEffect` yang menginisialisasi simulasi gaya fisik WAJIB strictly dibatasi pada data grafik (`[data]`) saja.
  3. Loop animasi `requestAnimationFrame(simulate)` di dalam `renderCanvas` membaca nilai dari `hoveredNodeRef.current` secara real-time untuk merender sorotan (*glow ring*) tanpa pernah mereset posisi node atau fisika simulasi.

### 12. Cloudflare Modal Popup Structure & Layout Standard
* **Aturan Structure & Layout Modal**: Seluruh modal pop-up (`AddDoctypeButton.tsx`, `ContractRateEditor.tsx`, `SyncButton.tsx`) WAJIB mengikuti standar tata letak Cloudflare Continuous Card:
  1. **Kontainer Luar**: `rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-2xl overflow-hidden font-sans`. Dilarang menggunakan `rounded-2xl` atau kontainer melayang ber-border terpisah.
  2. **Header Cell**: `p-4 sm:p-5 bg-gray-50/50 dark:bg-[#16181d]/50 flex items-start justify-between gap-4`. Judul font-mono uppercase `text-xs font-bold`, tombol penutup `X` flat.
  3. **Body Form Cell**: `p-4 sm:p-5 space-y-4 bg-white dark:bg-[#0d0e12]` dengan wrapper label `flex flex-col gap-2.5 font-mono text-xs font-bold uppercase` dan input `rounded-lg border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-3.5 py-2.5`.
  4. **Action Footer Row**: `grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]`. Tombol `CANCEL` (kiri 50% `bg-gray-50/50 dark:bg-[#16181d]/50`) dan `SAVE` (kanan 50% `bg-[#ff5e1f] hover:bg-[#ff7038] text-white`).

### 13. Prevensi Double Border Lines pada Kontainer `divide-y`
* **Masalah**: Terjadi tumpukan 2 garis horizontal tebal di antara blok KPI Grid dan Banner Kontrak.
* **Penyebab**: Kontainer induk (*Continuous Card*) sudah menerapkan `divide-y divide-[#f0f0f0] dark:divide-[#272a34]`, namun blok child di dalamnya secara eksplisit masih menambahkan `border-t` atau `border-b`.
* **Aturan Solusi**: Seluruh blok child langsung di dalam kontainer `divide-y` DILARANG mendeklarasikan `border-t` atau `border-b` horizontal tambahan. Serahkan garis pembatas horizontal secara bersih kepada `divide-y`.

### 14. Proportional Navigation Tabs vs Grid Column Precision
* **Masalah**: Memaksa tab navigasi (`Summary` & `Approval Payroll`) ke dalam kolom grid sempit 25% (`lg:w-1/4 grid-cols-2`) menyebabkan teks tab terpotong (`Approval Pay...`) atau mepet ke border line.
* **Aturan Solusi**: 
  - **Data Cards / KPI Grid / Table Action Buttons**: Wajib mengikuti grid simetris presisi 25% (`lg:w-1/4` / `lg:grid-cols-4`) atau 50% (`lg:w-1/2` / `lg:grid-cols-2`).
  - **Tab Navigasi Utama**: Mengutamakan keterbacaan penuh teks label & *breathing room* proporsional (`px-5 sm:px-6 py-3.5 whitespace-nowrap gap-2`) tanpa memotong teks label context.

### 15. Knowledge Graph Full-Domain Mapping Protocol
* **Masalah**: Membatasi node Knowledge Graph hanya pada file kode (pages/components/models) membuat item pengetahuan domain (rumus bisnis, gotchas layout, alur sync, handover log) terpisah sebagai teks saja.
* **Aturan Solusi**:
  1. Skrip parser (`scripts/graphify-parser.ts`) WAJIB memparsing dokumen `docs/knowledge/*.md` menjadi **Nodes** & **Edges inter-cluster** (`enforces`, `queries`, `invokes`, `renders`).
  2. Kelompokkan ke dalam **8 Kluster Komunitas Berwarna** dengan dukungan penyaringan interaktif pada canvas 2D force graph (`GraphifyVisualizer.tsx`).

### 16. Prevensi Native Basic Auth Login Popup pada RSC & Auto Sync di Vercel
* **Penyebab**: Saat Auto Sync aktif dan pengguna berpindah halaman, browser mengirimkan background request RSC (`rsc: 1`, `next-action`) dan background fetch tanpa menyertakan header `Authorization: Basic`. Jika middleware `proxy.ts` mengembalikan respon 401 beserta header `WWW-Authenticate: Basic realm="..."`, browser secara otomatis mencegat respon dan menampilkan popup dialog login native (`Sign in https://can-freelance.vercel.app`).
* **Aturan Solusi**:
  1. Di `src/proxy.ts`, deteksi request RSC / Server Action (`isRsc`).
  2. Jika request bersifat RSC / background fetch dan autentikasi gagal, kembalikan `401 Unauthorized` **TANPA HEADER `WWW-Authenticate`**. Hal ini mencegah browser menampilkan dialog pop-up login native pada transisi halaman/auto sync.
  3. Jika `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` tidak terkonfigurasi di Vercel Environment Variables, bypass middleware (`NextResponse.next()`).

### 17. Incremental-Only Auto Sync & Stale Log Auto-Clearing Protocol
* **Masalah**: Menarik seluruh database Notion (400+ kartu) saat auto sync berjalan menyebabkan Vercel Serverless Function mati karena timeout (10-15 detik), meninggalkan log `status: 'running'` yang mengunci dashboard selamanya di status `Sedang Berjalan...`.
* **Aturan Solusi**:
  1. **Incremental-Only Sync**: Auto sync / cron WAJIB menggunakan `mode: 'incremental'` dengan filter `last_edited_time: { on_or_after: lastSyncTime }` agar hanya menarik kartu yang di-update di Notion. Durasi eksekusi selesai cepat dalam < 2 detik.
  2. **Stale Log Auto-Clearing**: Di `/api/sync/cron/route.ts`, otomatis ubah seluruh `SyncLog` berstatus `'running'` yang berumur **> 2 menit** menjadi `'failed'` (`Serverless Function Timeout`) sebelum pengecekan dimulai.
  3. **Native Vercel Cron**: Konfigurasikan file `vercel.json` untuk mendaftarkan cron job native Vercel.

### 18. Vercel Hobby Daily Cron (00:00 WIB) & Clean Passive UI Protocol
* **Masalah**: Vercel Hobby Plan menolak jadwal cron interval menit (misal `*/15 * * * *`) pada `vercel.json` dan membatalkan build (`❌ 0/1`). Selain itu, client-side polling interval di browser dapat memicu timeout/basic auth popup.
* **Aturan Solusi**:
  1. **Daily Cron Schedule**: `vercel.json` WAJIB menggunakan jadwal harian yang valid untuk Vercel Hobby: `"schedule": "0 17 * * *"` (pukul 17:00 UTC = 00:00 WIB pergantian hari Jakarta).
  2. **No Client Polling Loops**: Menghapus seluruh `setInterval` auto-trigger `fetch('/api/sync/cron')` dari `SyncButton.tsx`. Browser hanya membaca status pasif dari DB via `getLatestSyncStatus()`.
  3. **Clean UI Banner**: Di `/notion-config`, bentuk dropdown interval digantikan dengan kartu informasi bersih **"Daily Auto Sync Active (00:00 WIB)"**, serta tombol **Sync Now** untuk sync manual instan.

### 19. Universal Inter Typography Standardization & Monospace Quarantine Protocol
* **Masalah**: Inkonsistensi font visual di mana headings menggunakan Google Font Outfit (`font-display`), elemen UI umum dan badge memakai `font-mono`, dan body memakai `font-sans`, sehingga aplikasi terasa berantakan dan memiliki lebih dari 2 kombinasi font.
* **Aturan Solusi**:
  1. **Universal Primary Font (`Inter`)**: Seluruh elemen UI (headings, KPI metrics, buttons, tabs, tables, toolbars, badges, modals, form controls) WAJIB menggunakan **`Inter`** (`font-sans`).
  2. **Eliminasi Outfit**: Google Font `Outfit` dihapus sepenuhnya dari `layout.tsx`, dan token `--font-display` dialiaskan ke `var(--font-inter)`.
  3. **Isolasi Monospace (`font-mono`)**: `font-mono` HANYA diizinkan untuk **technical quote fields & code snippets**:
     - Blok kutipan URL/Database ID Notion (contoh: `notion.so/workspace/2f40e19aa1358026a0e1d9caab5cdbb7?v=...`).
     - Secret tokens, API keys, dan hash string.
     - Inline `<code>` tags dan block `<pre><code>`.
     - Terminal output console dan sync process logs.
  4. Komponen UI standar (tabel, badge, pill, dropdown, modal) DILARANG menggunakan `font-mono`.
  5. **Audit Wajib Pasca-Migrasi**: Setelah menerapkan aturan tipografi ini pada satu file, WAJIB menjalankan `grep_search` untuk pola `font-mono` di seluruh direktori `src/` guna memastikan tidak ada sisa penggunaan yang lolos di file lain (contoh kasus lolos: `account-team/page.tsx`, `billing-statement/page.tsx`, `DesignerStatusSelect.tsx`). Jangan mengandalkan ingatan file yang "sudah pernah diubah" saja.

### 20. Prohibition of Native Select Controls & Dedicated Far-Right Action Column Protocol
* **Masalah 1 (Native Select)**: Penggunaan tag HTML `<select>` native pada form atau filter menghasilkan menu popover bawaan OS dengan highlight biru dan gaya visual yang merusak estetika *dark mode* dan *Cloudflare Design Tokens*.
* **Masalah 2 (Mixed Status & Actions)**: Menempatkan tombol aksi (seperti `Edit` atau `Promote`) di dalam sel badge status membuat sel tabel padat dan tidak simetris.
* **Aturan Solusi**:
  1. **Custom Cloudflare Dropdown Panel**: Seluruh dropdown pilihan di dalam form, modal, maupun filter WAJIB menggunakan komponen custom *Cloudflare Dropdown Panel* (`bg-white dark:bg-[#16181d] border-[#272a34] shadow-xl p-1.5`) yang dilengkapi dengan **Cloudflare Contrast Checkbox** di sebelah kanan (`w-4 h-4 rounded-[5px] border flex items-center justify-center`). Dilarang keras menggunakan tag HTML `<select>` native.
  2. **Dedicated Far-Right Action Column**: Sel status (`STATUS`) hanya berisi *status badge select dropdown*. Tombol aksi baris (seperti `PROMOTE` atau `EDIT`) WAJIB berada di kolom dedicated paling kanan (**`ACTION`**) dengan format *full-height table cell* (`w-[120px] p-0 h-full min-h-[44px] align-stretch border-l border-[#272a34]`).

### 21. Mandatory Post-Execution UI Grep Audit Protocol (Zero Open Question Invariant)
* **Aturan Persistence & Consistency Mutlak**:
  1. **Otomatis Tanpa Open Question**: Saat membuat atau mengedit halaman/form/tabel baru (CRUD), LLM **DILARANG KERAS** menanyakan *open question* tentang pilihan dropdown atau font. LLM WAJIB langsung menerapkan custom Cloudflare Dropdown dan Inter `font-sans` secara mandiri.
  2. **Mandatory Post-Execution Grep Audit**: Sebelum mengakhiri tugas pembuatan/pengeditan UI, LLM WAJIB menjalankan perintah `grep_search` untuk memeriksa file yang diubah:
     - Pastikan **0 tag `<select>` native** (gunakan komponen custom `CategorySelectCell`, `RoleSelectCell`, atau dropdown panel custom).
     - Pastikan **0 `font-mono`** pada teks tabel, handle nama, subtitle identifier, aspek rasio, currency numbers (`Rp 15.000`), dan input form standar.

### 22. Notion Status Case-Insensitive Matching & Real-Time Direct Write-Through Protocol
* **Masalah 1 (Case Sensitivity Mismatch)**:
  - Database Notion menggunakan opsi status dengan variasi huruf besar/kecil alami (`"In progress"`, `"Not started"`, `"Aproved"`).
  - Ketika kartu digeser di Kanban, sistem mencari opsi menggunakan strict case-sensitive equality (`option.name === statusNotionKey`), yang menyebabkan error `Notion status "In Progress" not found` dan membatalkan pemindahan kartu.
* **Masalah 2 (Omitted Status in Slide-over Editor)**:
  - Pengeditan field task via slide-over drawer modal (`TaskDetailSheet`) memanggil `updateTaskFieldsAction`.
  - Fungsi tersebut berhasil mengupdate PostgreSQL lokal, namun properti `'Design Status'` (serta Designer, Doctype, Brand, Template Link) tertinggal dan tidak dimasukkan ke dalam payload `notionProperties`. Akibatnya, status berpindah di aplikasi tapi di Notion tidak pernah berubah.
* **Aturan Solusi**:
  1. **Flexible Status Option Resolver (`findNotionStatusOption`)**:
     Pencarian opsi status Notion WAJIB mendukung:
     - Case-insensitive exact name match (`opt.name.toLowerCase() === targetKey.toLowerCase()`).
     - Alphanumeric normalized match (`"in progress"` ↔ `"inprogress"`).
     - Alias-aware rules (`qa` / `q&a`, `approved` / `aproved`, `in progress`, `not started`).
     - Selalu kirim opsi status ke Notion menggunakan option ID resmi (`{ status: { id: opt.id } }`).
  2. **Comprehensive Direct Write-Through**:
     Setiap perubahan task via `updateTaskFieldsAction` di slide-over editor WAJIB memetakan seluruh field ke `notionProperties` (`Design Status`, `Designer`, `Doctype`, `Brand/Account`, `Template Link`, `Pool Score`, `Pages`, `QTY Submit`, `Task Month`, `Priority`, `License`), sehingga pengeditan apapun dari aplikasi langsung tembus dan tersinkronisasi ke Notion secara *real-time*.

### 24. Vercel Serverless PostgreSQL SSL Connection Pooling & Error Boundary Protocol
* **Masalah**: Vercel Production menampilkan layar error hitam `This page couldn't load. A server error occurred. ERROR 1692628630` saat diakses via URL live.
* **Penyebab (Root Cause)**:
  1. Instansiasi `new Pool({ connectionString })` di top-level `src/lib/prisma.ts` tanpa konfigurasi SSL `ssl: { rejectUnauthorized: false }` pada serverless function Vercel menyebabkan kegagalan koneksi (*connection drop*) saat terhubung ke database PostgreSQL cloud (Neon/Supabase/Vercel Postgres/RDS).
  2. Module `prisma` di `src/lib/prisma.ts` sebelumnya hanya menyimpan singleton pada `globalThis` saat `NODE_ENV !== 'production'`, sehingga di Vercel Production setiap request membuat koneksi pool baru (*connection exhaustion*).
  3. Aplikasi tidak memiliki komponen root `error.tsx`, sehingga unhandled server error menjatuhkan seluruh render pohon App Router ke layar hitam Vercel.
* **Aturan Solusi**:
  1. **Defensive SSL Pool Connection**: `src/lib/prisma.ts` WAJIB mengaktifkan `ssl: { rejectUnauthorized: false }` untuk koneksi PostgreSQL cloud di lingkungan serverless/production.
  2. **Production Global Singleton**: Cache instans `PrismaClient` ke `globalThis.prismaGlobal` baik di development maupun production serverless contexts.
  3. **Global App Error Boundary**: Tambahkan `src/app/error.tsx` untuk menyajikan UI fallback interaktif yang ramah pengguna jika terjadi kendala jaringan/koneksi DB sementara.


