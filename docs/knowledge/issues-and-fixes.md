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

### 5. Dual-Source Hybrid Sync & Outbound Local-First Architecture
* **Masalah**: Melakukan pemanggilan Notion API secara synchronous/real-time saat manajer mengedit `payrollMonth`, status, atau doctype dari App UI menyebabkan latency UI lambat dan rentan gagal jika nama kolom Notion sedikit berbeda.
* **Aturan & Solusi**:
  1. Perubahan dari App UI WAJIB disimpan ke PostgreSQL DB lokal terlebih dahulu secara instan (`syncStatus = 'PENDING_PUSH'`).
  2. Outbound engine (`pushPendingLocalChangesToNotion`) pada batch cron jam 17:00 WIB (10:00 UTC) mem-push data yang tertunda ke Notion dengan pemeriksa skema dinamis (handling alias `Payroll Month` / `Payroll-Month`, `QTY-Submit` / `QTY Submit`, `IND/ENG` / `IND\ENG`, `Brand` / `Account`), kemudian meng-update status lokal menjadi `SYNCED`.
  3. Notion tetap berfungsi sebagai *Source of Truth* utama untuk penambahan Task baru dari desainer.

### 6. Month Standardization: Same Label, Different Business Meaning
* **Masalah**: `taskMonth` dan `payrollMonth` bisa memakai penulisan UI yang sama (`September-2026`), tetapi keduanya punya makna bisnis berbeda.
* **Aturan**:
  1. **Satu format label UI**: seluruh month picker / filter WAJIB menampilkan format penuh `Month-Year`, misalnya `September-2026`.
  2. **Dua field tetap dipisah**: `taskMonth` = bulan task turun, `payrollMonth` = bulan pembayaran.
  3. **Satu helper normalisasi**: semua query, filter, dan revalidation WAJIB melalui helper period canonical, bukan string compare mentah.
  4. **Auto-create bulan baru**: jika bulan belum terdaftar, sistem boleh membuat record / opsi baru, tetapi tetap mengikuti field target yang sedang diedit.

### 7. Dashboard Month Filter Query Mismatch & Multi-Format Database Filtering
* **Masalah**: Query statistik Dashboard (`getDashboardData` pada `src/lib/queries.ts`) sebelumnya secara keliru membagi string bulan URL (`"Januari-2026,Februari-2026,..."`) menggunakan `split('-')` tanpa helper normalisasi canonical. Hal ini menghasilkan string filter SQL tidak valid (`"2026-Januari"`) yang menyebabkan query database mengembalikan 0 task, 0 template, dan 0 page untuk seluruh widget statistik saat filter bulan aktif di URL.
* **Solusi & Aturan**:
  1. WAJIB menggunakan `parseTaskMonthToKey(token)` dari `@/lib/period-utils` untuk menormalisasi seluruh token filter URL (baik format `"Januari-2026"`, `"Agt-2026"`, maupun `"2026-08"`) menjadi kunci standar `YYYY-MM`.
  2. Fungsi `buildDbMonthVariants(keys)` WAJIB meng-generate seluruh varian string yang mungkin tersimpan di database PostgreSQL (`"Agustus-2026"`, `"Agt-2026"`, `"2026-08"`) sebelum dimasukkan ke dalam `WHERE t.task_month IN (...)` SQL clause.
  3. Seluruh widget visualisasi (Tren Volume, Distribusi Template, Task Pipeline, Doctype, Leaderboard) WAJIB menggunakan `parseTaskMonthToKey()` saat mencocokkan data bulan untuk tooltip dan tooltip breakdown.

### 8. Production Email Notification Post-Sync Filter Preservation
* **Masalah**: Pada tab Production → Email Notifications, fungsi `getEmailNotificationsAction()` sudah menerapkan filter `status`, `brandName`, dan `search`, tetapi tombol `SYNC EMAIL` langsung menimpa state komponen dengan seluruh hasil `syncCanvaEmailsAction()`. Akibatnya setelah sync, daftar email bisa menampilkan item di luar filter aktif sampai filter berubah atau data diambil ulang.
* **Solusi & Aturan**:
  1. Setelah menjalankan sync email, UI WAJIB memanggil ulang fetch canonical (`getEmailNotificationsAction`) dengan filter aktif, bukan memakai langsung daftar mentah dari sync result.
  2. `syncCanvaEmailsAction()` tetap bertugas ingestion/upsert dan refresh cache; rendering daftar pada tab email notification tetap lewat fungsi get email yang sama agar perilaku filter konsisten.

### 9. Google OAuth2 Email Sync State Machine
* **Masalah**: Membuka Gmail langsung lalu menyimpan email config sebagai "Active & Verified" membuat UI terlihat berhasil meskipun OAuth belum benar-benar menghasilkan token. Untuk akun Google dengan 2-Step Verification, password/IMAP login raw juga tidak reliable dan dapat diblokir.
* **Solusi & Aturan**:
  1. Authentication Gmail WAJIB melalui OAuth2 route internal (`/api/google/oauth/start` → `/api/google/oauth/callback`) dengan state cookie dan `access_type=offline`.
  2. UI Email Config WAJIB membedakan `ACTIVE`, `DISCONNECTED`, `AUTH_FAILED`, dan `RECONNECT_REQUIRED`; jangan tampilkan `Active & Verified` hanya karena email tersimpan.
  3. Disconnect WAJIB menghapus token/credential sensitif dan menonaktifkan auto sync, tetapi tidak menghapus data `CanvaEmailNotification` yang sudah tersimpan.
  4. Untuk `provider = GMAIL_OAUTH`, sync email WAJIB menggunakan Gmail API + refresh token terenkripsi, bukan mengirim token terenkripsi langsung sebagai IMAP XOAUTH2 access token.

### 10. Canva Email Notification Account Fallback Trap & Brand Alias Mapping
* **Masalah**:
  1. Pada `syncCanvaEmailsAction`, terdapat fallback keliru `accountMap.get(brandKey) || accounts[0]?.id || null`. Jika brand dari email Canva belum terdaftar (misal: "Humpback Studio"), sistem secara keliru menetapkan `accountId` milik akun pertama di database (`Zahra Art`). Akibatnya, penghitungan badge sidebar pada `EmailNotificationView.tsx` yang mengecek `n.accountId === acc.id` mengarahkan email Humpback ke Zahra Art, sehingga tab "Other Brands" menampilkan angka `0` meskipun terdapat 9 email di dalamnya.
  2. Brand "Impro Studio" dari Canva tidak cocok dengan nama akun terdaftar `Improstd` karena ketiadaan fuzzy alias matching, sehingga masuk ke "Other Brands" dan terpasang `accountId` fallback secara keliru.
* **Solusi & Aturan**:
  1. DILARANG menggunakan fallback `accounts[0]?.id` saat mencocokkan brand email ke akun. Jika brand tidak terdaftar, `accountId` WAJIB diset `null`.
  2. Parser (`canva-email-parser.ts`) dan Action (`email-notification.ts`) WAJIB memiliki fuzzy alias normalization: nama yang mengandung `impro` dinormalisasi menjadi `Improstd`, dan `uicreative` dinormalisasi menjadi `UICreative.net`.
  3. Komponen UI (`EmailNotificationView.tsx`) WAJIB menghitung `otherNotifications` dan `brandStats` berdasarkan `isBrandMatch(n.brandName, acc.displayName) || (!n.brandName && n.accountId === acc.id)` agar badge unresolved counter di sidebar kiri selalu identik dengan data pada panel kanan.

### 11. Prisma Client Hot-Reload Delay & Delegate Undefined Trap After Schema Changes
* **Masalah**:
  Setelah menambahkan model baru pada `schema.prisma` dan mengeksekusi `prisma generate`, server actions yang memanggil model tersebut (contoh: `prisma.syncSubjectTrigger.upsert(...)`) melempar error:
  `Cannot read properties of undefined (reading 'upsert')`.
  Hal ini terjadi karena Next.js dev server yang sedang berjalan mempertahankan singleton `PrismaClient` lama di dalam memori Node (`globalThis.prismaGlobal`). Instance lama tersebut belum memiliki delegate model baru.
* **Solusi & Aturan**:
  1. **Restart Dev Server**: Sesuai aturan `prisma-schema-update-workflow`, Next.js dev server WAJIB di-restart setelah `prisma db push` / `prisma generate` agar model baru termuat ke memori.
  2. **Defensive Model Fallback**: Server actions WAJIB mengimplementasikan pengecekan delegate `const model = (prisma as any).newModel`. Jika delegate bernilai `undefined`, gunakan fallback raw SQL (`prisma.$executeRaw` / `prisma.$queryRaw` dengan `Prisma.sql` / `Prisma.join`) sehingga server actions tetap bekerja normal tanpa downtime atau error 500 sekalipun server dev belum di-restart.

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
  2. Kelompokkan ke dalam **8 Kluster Berwarna** dengan dukungan penyaringan interaktif pada canvas 2D force graph (`GraphifyVisualizer.tsx`).

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

### 25. React Scroll Sync Feedback Loop & CSS Scroll Snapping Optimization
* **Masalah**: Scroll horizontal pada Kanban Board terasa lag, bergetar, dan patah-patah saat menggunakan trackpad desktop.
* **Penyebab (Root Cause)**: 
  1. Penggunaan `snap-x` dan `snap-mandatory` memaksa browser melakukan *snap* yang bertentangan dengan *smooth scroll* bawaan OS.
  2. *Infinite Feedback Loop*: Dua kontainer (Header dan Konten) saling mengubah `scrollLeft` lawannya melalui event `onScroll` tanpa ada pencegahan (guard), memicu rentetan event tak berujung (*jitter*).
* **Aturan Solusi**:
  1. Hapus kelas `snap-x`, `snap-mandatory`, dan `snap-center` dari seluruh kontainer Kanban horizontal.
  2. Implementasikan `const isSyncingLeft = useRef(false)` untuk melacak inisiator scroll, dan gunakan `requestAnimationFrame` untuk me-reset flag, memutus siklus pemanggilan event berulang.

### 28. Doctype Preset Shadowing & Hardcoded Pages in Notion Sync
* **Masalah**: Pada saat create new task di Kanban board (`CreateTaskSlideModal.tsx`) dan memilih doctype (misal: `Regular-Presentation`), jumlah pages selalu terisi `1` dan tidak mengikuti preset bawaan (12 halaman untuk Presentation, 5 untuk Carousel, 15 untuk Infographic-Slides, dll.).
* **Penyebab (Root Cause)**:
  1. Pada `src/lib/sync-notion.ts`, pembuatan Doctype baru dari Notion di-hardcode `pages: 1.0`. Akibatnya, seluruh 20 doctype di database PostgreSQL tersimpan dengan `pages = 1`.
  2. Fungsi `getPagesForDoctype` di `task-form-utils.ts` mengecek `if (doc.pages != null && Number(doc.pages) > 0) return Number(doc.pages)`. Karena di DB bernilai `1` (`> 0`), fungsi langsung mengembalikan `1` dan mengabaikan baris logika preset berbasis nama doctype di bawahnya (*dead code*).
  3. Nilai di halaman Rate Card (`/rate-card`) juga menampilkan `1 hal` untuk semua Doctype sehingga estimasi payout ikut terdistorsi.
* **Aturan Solusi**:
  1. **Universal Preset Engine (`src/lib/doctype-presets.ts`)**: Buat modul terpusat `DOCTYPE_DEFAULT_PRESETS` dan helper `getPresetPagesByName` yang aman digunakan di Server maupun Client.
  2. **Smart Resolution (`getPagesForDoctype`)**: Jika `doc.pages > 1`, hormati nilai kustom Rate Card. Namun jika `doc.pages === 1`, cek apakah `getPresetPagesByName(doc.displayName) > 1`. Jika ya, prioritaskan preset nama tersebut sehingga doctype multi-halaman tidak terpasung di angka 1.
### 29. Subpath Routing (`basePath: '/can-freelance'`) Google OAuth Disconnect & Gateway Root Redirection Trap
* **Masalah**:
  1. Tombol **Disconnect** di `/notion-config` gagal dan memunculkan error, tidak dapat mereset konfigurasi Google email ke status `DISCONNECTED`.
  2. Saat tombol **Reconnect Google** diklik, browser terlempar ke halaman landing root gateway `portal.fatchurbeny.com / Project Portal — Access Console` alih-alih membuka halaman autentikasi Google.
* **Penyebab (Root Cause)**:
  1. **Unhandled Cipher Exception**: Fungsi `decryptEmailToken` di `src/lib/google-oauth.ts` memanggil `decipher.final()` tanpa `try-catch`. Ketika secret token berbeda atau data token lama tidak valid, fungsi melempar uncaught exception `Unsupported state or unable to authenticate data`. Hal ini menggagalkan eksekusi `disconnectGoogleEmailAction` di server action sebelum sempat menjalankan `prisma.emailConfig.update`.
  2. **Missing Subpath in OAuth Routes**: Aplikasi Next.js berjalan di bawah `basePath: '/can-freelance'`. Pemanggilan `window.open('/api/google/oauth/start')` di `GoogleOAuthModal.tsx`, serta pembuatan `returnUrl = new URL('/notion-config', origin)` dan `doneUrl` di route handler tidak menyertakan subpath `/can-freelance`. Akibatnya, request masuk ke root domain `portal.fatchurbeny.com` yang ditangani oleh portal landing console Nginx dan bukan Next.js app.
  3. **Redirect URI Mismatch Risk**: `getGoogleOAuthRedirectUri` sebelumnya menghasilkan `${origin}/api/google/oauth/callback` tanpa `/can-freelance`, sedangkan Google Cloud Console pengguna mendaftarkan `https://portal.fatchurbeny.com/can-freelance/api/google/oauth/callback`.
* **Aturan Solusi**:
  1. **Defensive Decryption & Disconnect**: Bungkus `crypto.createDecipheriv` di `decryptEmailToken` dalam blok `try-catch` agar mengembalikan `null` jika dekripsi gagal tanpa melempar exception fatal. Pada `disconnectGoogleEmailAction`, pastikan kegagalan revoke token tidak pernah menggagalkan pembersihan record di database.
  2. **Canonical Subpath Routing**: Sertakan `/can-freelance` pada URL start OAuth (`${basePath}/api/google/oauth/start`), returnUrl, dan doneUrl callback.
  3. **Domain-Aware Callback URI**: `getGoogleOAuthRedirectUri` mendeteksi origin `portal.fatchurbeny.com` dan mengembalikan `https://portal.fatchurbeny.com/can-freelance/api/google/oauth/callback` secara konsisten dengan konfigurasi di Google Cloud Console.

### 30. Synchronous International Notion API Latency on Editing & Instant Background Sync Pattern
* **Masalah**:
  Setiap kali pengguna menyimpan perubahan di Task Detail Sheet, memindahkan kolom di Kanban board, mengedit Rate Card, atau memperbarui parameter task, proses simpan memakan waktu 2–5 detik sehingga tombol Save berputar lama dan UI terasa berat.
* **Penyebab (Root Cause)**:
  1. **Serial Synchronous Calls ke Luar Negeri**: Server Actions (`updateTaskFieldsAction`, `updateTaskStatusAction`, `updateDoctypeRateCardAction`, `updateTaskParametersAction`) menjalankan `await` berantai untuk panggilan HTTPS ke Notion API di Amerika Serikat (`pages.retrieve`, `pages.update`, `blocks.children.append`). Browser dipaksa menunggu hingga 2000–5000ms sebelum menerima respon.
  2. **Sequential Loop Overhead**: Pada pembaruan parameter massal, request ke Notion API dijalankan di dalam loop satu per satu (`for ... await`).
* **Aturan Solusi**:
  1. **Local-First Immediate Persistence**: Perubahan data WAJIB disimpan terlebih dahulu ke PostgreSQL internal VPS lokal (~10–20ms).
  2. **Non-Blocking Background Notion Sync (`runInBackground`)**: Seluruh transaksi jaringan ke Notion API dialihkan ke fungsi background asinkron (`setImmediate`) via `src/lib/background-sync.ts`. Server action langsung mengembalikan `{ success: true }` ke klien sehingga modal/drawer tertutup seketika (<100ms).
  3. **Safe Error Isolation**: Kegagalan jaringan atau rate limit pada Notion API diisolasi dengan error logging yang aman tanpa pernah membatalkan penyimpanan lokal di PostgreSQL atau melempar unhandled rejection ke runtime Next.js.

### 31. Multi-Resolution Favicon Suite & Next.js Subpath Routing Invariants
* **Masalah**:
  Browser tab menampilkan icon default Next.js atau blank globe favicon saat mengakses subpath `/can-freelance` karena favicon hanya ada di satu ukuran atau tidak terhubung ke subpath routing Next.js.
* **Penyebab (Root Cause)**:
  1. Next.js App Router dengan `basePath: '/can-freelance'` memerlukan mapping eksplisit atau file-based icon convention (`src/app/icon.svg`, `src/app/apple-icon.png`, `src/app/favicon.ico`) agar build compiler men-generate route statis yang ter-prefix basePath.
  2. Browser lama dan desktop tab bar memerlukan ICO multi-frame (16x16, 32x32, 48x48), sedangkan browser modern dan Retina display mengutamakan SVG (`image/svg+xml`), dan perangkat mobile (iOS Safari/Android) mencari `apple-touch-icon` atau icon 192/512px.
* **Aturan Solusi**:
  1. **Dual Asset Placement**: Tempatkan aset favicon di kedua lokasi: `src/app/` (untuk konvensi App Router otomatis) dan `public/` (untuk direct static file fetching Nginx/Cloudflare).
  2. **Comprehensive Metadata Config (`src/app/layout.tsx`)**:
     Definisikan konfigurasi `icons` pada `metadata` dengan URL ber-prefix `/can-freelance`:
     ```typescript
     icons: {
       icon: [
         { url: '/can-freelance/icon.svg', type: 'image/svg+xml' },
         { url: '/can-freelance/favicon.ico', sizes: 'any' },
       ],
       apple: '/can-freelance/apple-icon.png',
     }
     ```
  3. **Multi-Frame ICO & Vector SVG**: Hasilkan `favicon.ico` valid yang memuat frame 16x16, 32x32, dan 48x48, serta `icon.svg` berbasis squircle oranye `#ff5e1f` dan monogram tajam "IS" (*impro.std*).

### 32. Image Color Palette Extraction & Notion Native Image Strip Architecture
* **Masalah**: Pengguna ingin mengekstrak warna dari gambar referensi desain dan menampilkannya langsung di halaman Notion. Pendekatan sebelumnya menggunakan KaTeX equation `\colorbox` menghasilkan error `\sqrt{x} Invalid equation`, sedangkan block `embed` terhalang peringatan *Click to view content from...*.
* **Penyebab (Root Cause)**:
  1. **Notion KaTeX Colorbox Strictness**: KaTeX di Notion tidak mendukung perintah `\colorbox` bertingkat untuk teks kustom di dalam inline equation, sehingga menampilkan error `Invalid equation`.
  2. **Notion Embed Proxy Restriction**: Block `embed` memerlukan interaksi klik tambahan dari pengguna jika domain belum diverifikasi penuh di dalam workspace Notion.
* **Aturan Solusi (Opsi 2 — Native Notion Image Block & Server-Side PNG Strip)**:
  1. **Client-Side Canvas Quantization (`src/lib/color-extractor.ts`)**: Lakukan ekstraksi warna 100% di browser klien menggunakan HTML5 Canvas Median Cut downsampled ke 100×100 px (<50ms, zero server load).
  2. **Dynamic Palette Strip Vector Endpoint (`src/app/api/palette/strip/route.ts`)**:
     - Menerima parameter query `?colors=HEX1,HEX2...`.
     - Merender SVG swatch 5 kolom warna proporsional (lengkap dengan nama peranan warna dan kode HEX dengan deteksi kontras dinamis) langsung sebagai respon vector `image/svg+xml`.
     - Menghindari ketergantungan library native binary (seperti `sharp` yang membutuhkan kompilasi binary C++ spesifik Linux/Darwin) sehingga berjalan 100% andal di VPS tanpa isu cache `npm` atau architecture mismatch.
     - Mengembalikan `image/svg+xml` dengan header cache permanen (`public, max-age=31536000, immutable`).
  3. **Notion Official Image Block (`src/app/actions/qa.ts`)**:
     - Memasukkan strip warna sebagai block resmi Notion berjenis `image` (`external.url: ${publicUrl}/api/palette/strip?colors=...`).
     - Blok gambar SVG dirender 100% native seketika oleh Notion di aplikasi desktop dan mobile tanpa error equation atau tombol peringatan embed.
  4. **Clean Callout & Bullet List**:
     - Menampilkan info box `All HEX: ...` dan bullet peranan warna (`Primary`, `Accent`, dll.) sebagai teks biasa yang rapi dan mudah disalin oleh tim desainer.

### 33. Client-Side WebP Compression & Persistent Upload Storage Architecture
* **Masalah**: Pengguna mem-paste gambar screenshot resolusi tinggi (misal 5MB PNG dari Canva/Figma). Jika disimpan langsung, disk VPS akan cepat penuh dan file berisiko terhapus saat deployment update aplikasi.
* **Penyebab (Root Cause)**:
  1. File screenshot uncompressed memakan bandwidth upload besar dan menghabiskan ruang disk penyimpanan server (~1GB/bulan untuk 500 tasks).
  2. Direktori rilis Next.js standalone bersifat ephemeral; setiap kali tarball rilis diekstrak, folder `public/` dapat tertimpa atau terhapus.
* **Aturan Solusi (Long-Term Storage Invariant)**:
  1. **Client-Side WebP Auto-Compression (`src/lib/color-extractor.ts`)**:
     - Saat gambar di-paste/upload, browser langsung meresize gambar ke max width/height 800px dan mengonversinya ke format WebP (quality 0.8) via HTML5 Canvas.
     - Ukuran file menyusut drastis dari ~2–5MB menjadi hanya **~50–90KB** (>95% space saving) sebelum di-upload ke server.
  2. **Dedicated Upload API Endpoint (`src/app/api/upload/route.ts`)**:
     - Menerima `multipart/form-data`, membatasi ukuran file maks 2MB, menghasilkan nama unik hash-timestamp (`ref-{timestamp}-{hash}.webp`), dan mengembalikan URL publik.
  3. **Persistent Server Storage & Symlink (`scripts/deploy-vps.sh`)**:
     - Folder penyimpanan fisik diletakkan secara terpisah di `$REMOTE_APP_DIR/storage/uploads`.
     - Skrip deployment membuat symlink permanen: `ln -sfn $REMOTE_APP_DIR/storage/uploads public/uploads`.
     - Ini menjamin seluruh gambar referensi yang pernah diunggah desainer **100% aman dan tidak akan pernah terhapus** saat menjalankan `npm run deploy:vps`.
  4. **Notion Image Markdown Translation (`src/app/actions/qa.ts`)**:
     - Saat markdown memuat syntax `![alt](url)`, parser otomatis menghasilkan Notion block berjenis `image` (`external.url`) sehingga gambar acuan desain tampil utuh di Notion di atas strip palet warna.

### 34. Asset Library: preview & cover Canva tanpa login
* **Preview**: public view link + `?embed` bisa di-iframe tanpa login; link `/edit` selalu minta login. Token edit ≠ token view, jadi view link tidak bisa diturunkan dari edit link → form menolak `/edit` di kolom Public View.
* **Cover**: `og:image` halaman view Canva hanya logo generik (`fb_cover-1.jpg`), dan `…/screen?type=thumbnail` ditolak (403) bila diminta dari server. Browser bisa memuatnya langsung, jadi cover default = `toCanvaThumbnailUrl(previewUrl)` dimuat client; upload opsional menimpa. Judul diambil dari oEmbed (`/_oembed`, berhasil dari server).
* **Escape di iframe**: saat fokus di dalam iframe Canva, keydown tidak sampai ke halaman; Escape baru bekerja setelah fokus kembali ke halaman.
* **Relation dual_property**: `ensureRelationProperty` membuat kolom balik di database aset (nama = judul database task). Membuat relation mengubah skema database task live, jadi untuk production yang sudah ada dilakukan manual per production.
* **`db push` saat sesi lain punya tabel belum di-commit**: `prisma db push` akan DROP tabel yang tidak ada di schema worktree. Pakai `prisma migrate diff --from-config-datasource --to-schema … --script`, buang statement DROP, lalu `prisma db execute`.

### 35. Overview: task tanpa brand hilang dari tab brand & chart
* **Masalah**: task order bundle dibuat tanpa Account/Brand (`task_accounts` kosong). Di Overview production, tab brand memfilter `EXISTS task_accounts` sehingga datanya hanya muncul di KPI "Semua Brand"; Tren Volume & Distribusi Template memakai `JOIN task_accounts` (inner) sehingga task itu tidak masuk chart sama sekali. Tren Volume juga hanya menggambar brand yang ada di `BRAND_COLORS` hardcode, dan subtitle widget menulis "Semua Brand (6)" hardcode.
* **Solusi**: tab **Tanpa Brand** (`NO_BRAND_LABEL` di `queries.ts`) muncul bila production punya task tanpa brand → filter `NOT EXISTS task_accounts`. Query chart per brand memakai `LEFT JOIN` + `COALESCE(brand, 'Tanpa Brand')` di SELECT luar (jangan pakai `COALESCE(…, $param)` di `PARTITION BY` — Postgres tidak menyamakannya dengan GROUP BY). Tren Volume mengambil daftar brand dari data.

### 36. Database di dalam sub-page tidak terbaca saat "Pindai"
* **Masalah**: "Canva Assets (1)" di page Impro-Freelance adalah **sub-page** (`child_page`) yang berisi database, bukan blok `child_database` langsung. `listChildDatabases` hanya membaca anak langsung, jadi database itu tidak terdaftar dan tidak muncul di pilihan impor Asset Library (harus tempel link).
* **Solusi**: `listChildDatabases(pageId, pageDepth = 1)` ikut membaca isi kolom/toggle/callout/synced block dan sub-page satu tingkat; database tunggal di sub-page diberi nama sub-page-nya. Sub-tab Impor punya tautan **Pindai ulang page** (menjalankan pindai semua page terdaftar).

### 37. Escape di drawer bersusun menutup semua drawer
* **Masalah**: drawer induk (`TaskDetailSheet`) memasang `keydown` Escape di `window` (fase bubble) → saat drawer editor terbuka, Escape menutup drawer task sekaligus.
* **Solusi**: drawer anak memasang listener Escape di `window` dengan `capture: true` lalu `e.stopImmediatePropagation()` sebelum menutup dirinya, sehingga listener bubble milik induk tidak terpanggil (`DesignBriefEditorDrawer.tsx`). Pola sama berlaku untuk dropdown/drawer lain yang ditumpuk di atas drawer.
* **Catatan**: palet di brief dibaca berurutan dari baris `Swatches` lalu role ditempelkan dari baris role (`parseColors` di `DesignBriefPreview.tsx`). Mengubah urutan role (tombol **Acak**, `shufflePaletteMarkdown` di `brief-parser.ts`) wajib menulis ulang keduanya secara konsisten.
