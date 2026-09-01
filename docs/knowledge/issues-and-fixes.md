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
* **Aturan**: Komponen canvas HTML5 2D yang berada di luar React DOM tree standar wajib memanfaatkan `MutationObserver` pada `document.documentElement` (filter kelas `dark`) untuk memperbarui warna latar belakang canvas (`#F8FAFC` vs `#0d0e12`), garis link, dan badge overlay secara real-time saat tema berubah.

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





