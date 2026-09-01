# Session Handover Log — CAN-Freelance

Dokumen ini mencatat **status pengerjaan aktif**, keputusan arsitektur terbaru, serta histori sesi percakapan untuk memastikan kontinuitas konteks saat berpindah LLM (Gemini, Claude, GPT) atau Code Editor (Antigravity IDE, Cursor, VS Code, Claude Code).

---

## 📌 Status Sesi Terakhir (Active State)

* **Tanggal & Waktu Log**: 2026-08-31 23:23 WIB
* **Status Tugas**: ✅ Sesi Pembelajaran `/learn` Selesai. Seluruh Aturan Baru (Force Graph Hover Isolation, Cloudflare Symmetrical Table & Control Layout Rules, dan AST Import Scanner) Berhasil Disimpan ke `AGENTS.md`, `docs/knowledge/`, dan Web UI.
* **Cabang Git**: `main` / `staging`
* **Editor/Environment Active**: Antigravity IDE (Gemini 3.6 Flash / Medium)

---

## 💡 Keputusan Arsitektur & Perubahan Terakhir (Recent Decisions)

1. **Incremental-Only Auto Sync & Stale Log Auto-Clearing Engine**:
   - Mengharuskan `/api/sync/cron/route.ts` dan `syncNotionData` selalu menggunakan `mode: 'incremental'` yang memfilter query Notion API berdasarkan `last_edited_time: { on_or_after: lastSyncTime }` sehingga hanya menarik kartu yang di-update di Notion (durasi < 2 detik).
   - Menambahkan pembersihan otomatis stale log (`status: 'running'` > 2 menit) menjadi `failed` di database PostgreSQL untuk mencegah dashboard terkunci pada status `Sedang Berjalan...`.
   - Membuat file [`vercel.json`](file:///Users/fatchurbeny/Documents/Project/can-freelance/vercel.json) untuk mendaftarkan native Vercel Cron Job.

2. **Auto Sync Initial Countdown Protocol Guarantee**:
   - Memperbarui `/api/sync/cron/route.ts` dan `SyncButton.tsx` untuk menjamin pengaktifan atau pengubahan jadwal Auto Sync **SELALU memicu hitung mundur (*countdown*) interval penuh terlebih dahulu** sebelum sync dijalankan.
   - Menghapus fallback `setCountdownMs(0)` pada `SyncButton.tsx` dan memastikan respon sukses eksekusi cron menyertakan `nextSyncInMs: intervalMs` untuk siklus berikutnya.

2. **Vercel Basic Auth RSC & Auto Sync Login Popup Fix**:
   - Memperbarui middleware [`src/proxy.ts`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/proxy.ts) untuk mendeteksi request internal Next.js RSC (`rsc: 1`, `next-action`, `next-router-state-tree`).
   - Mencegah pengiriman header `WWW-Authenticate: Basic realm="..."` pada respon 401 saat request bersifat RSC / background fetch sehingga browser tidak pernah mencegat dan menampilkan dialog login native (`Sign in https://can-freelance.vercel.app`) saat auto sync aktif dan pengguna berpindah halaman di Vercel.
   - Mengatur bypass otomatis jika `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` belum diatur di Vercel Environment Variables.

2. **Dynamic Knowledge Graph Community Mapping Across All 7 Domains**:
   - Memperluas [`scripts/graphify-parser.ts`](file:///Users/fatchurbeny/Documents/Project/can-freelance/scripts/graphify-parser.ts) untuk memparsing seluruh domain pengetahuan (`entities.md`, `business-rules.md`, `data-flows.md`, `issues-and-fixes.md`, `session-handover.md`) ke dalam **92 Nodes & 87 Edges terstruktur**.
   - Menambahkan 8 kluster komunitas utama pada [`GraphifyVisualizer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/GraphifyVisualizer.tsx): `App Router Pages`, `React Components`, `Server Actions & Lib`, `Prisma DB Models`, `SaaS Business Rules`, `Notion Sync Engine`, `Gotchas & Layout Rules`, `Session Handover & Log`.
   - Mengaktifkan pemicu klik filter komunitas interaktif pada tabel `COMMUNITIES` dengan indikator badge aktif di sudut kiri atas canvas 2D force graph.

2. **Billing Navigation Tab Proportional Symmetrical Spacing**:
   - Menghapus pembatas 25% sempit pada tab navigasi Billing & Statement ([`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L305)).
   - Menerapkan padding dan jarak seimbang sama rata (`px-5 sm:px-6 py-3.5 gap-2`) pada kedua tab `Summary` dan `Approval Payroll`.
   - **Hasil**: Teks `Approval Payroll` terbaca 100% utuh tanpa terpotong (`Approval Pay...`) dan dengan jarak yang nyaman serta proporsional.

2. **Billing Navigation Tab Centered Symmetrical Alignment**:
   - Membagi dua tab navigasi (`Summary` & `Approval Payroll`) pada [`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L305) secara 50/50 simetris di dalam blok 25% kontainer (`grid grid-cols-2 w-full lg:w-1/4 shrink-0 divide-x border-r border-[#272a34]`).
   - Kedua tab kini menggunakan `justify-center items-center gap-1.5 px-2.5` sehingga seluruh ikon dan teks berada di tengah sel masing-masing dengan jarak kiri/kanan yang seimbang tanpa mepet ke border line.

2. **Billing Navigation Tab Badge Spacing & Summary Sizing**:
   - Menghapus `justify-between` pada tab `Approval Payroll` ([`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L320)) sehingga badge angka `38` berada tepat di sebelah teks `Approval Payroll` dengan jarak rapat yang pas (`gap-1.5`).
   - Memperluas padding tombol `Summary` (`px-4 sm:px-5`) sehingga tampil proporsional, nyaman, dan tidak terasa sempit.

2. **Billing Navigation Tab Symmetrical 25% Grid Alignment**:
   - Membungkus tab `Summary` dan `Approval Payroll` pada [`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L305) dalam kontainer **`w-full lg:w-1/4 shrink-0 border-r border-[#272a34]`**.
   - Tab `Summary` menggunakan `shrink-0 px-3.5` (~85px) dan `Approval Payroll` menggunakan `flex-1 px-3` (~170px) sehingga seluruh teks dan badge muat dengan sangat pas tanpa terhimpit.
   - Garis vertikal pembatas di sebelah kanan tab `Approval Payroll 38` kini **100% lurus & sejajar presisi pada posisi 25%** dengan garis pembatas `TOTAL UNPAID THIS MONTH` (Card 1) dan `TOTAL TEMPLATE` (Card 5) di bawahnya.

2. **Billing Navigation Tab Spacing & Breathing Room**:
   - Memperlonggar padding horizontal dan vertikal pada tab `Summary` dan `Approval Payroll` (`px-5 sm:px-6 py-3.5 gap-2.5`) pada [`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L305).
   - Teks judul tab, ikon, dan badge angka kini memiliki *breathing room* yang cukup dan lega tanpa terasa terhimpit.

2. **MonthFilter Align Right at 25% Grid Border Line**:
   - Menyelaraskan kontainer gabungan tab navigasi atas (`Summary` dan `Approval Payroll`) pada [`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L305) menjadi **`grid grid-cols-2 w-full lg:w-1/4 shrink-0 divide-x border-r border-[#272a34]`**.
   - Batas kanan tab kedua `Approval Payroll` kini **100% sejajar presisi pada posisi 25%** dengan garis pembatas vertikal `TOTAL UNPAID THIS MONTH` (Card 1) dan `TOTAL TEMPLATE` (Card 5) di bawahnya.

2. **MonthFilter Align Right at 25% Grid Border Line**:
   - Menyelaraskan komponen [`MonthFilter.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/MonthFilter.tsx#L51) agar berada di **sisi paling kanan (align right) di dalam blok 25% pertama (`w-full lg:w-1/4 shrink-0 border-r border-[#272a34]`)**.
   - Batas kanan tombol `MonthFilter` (`Juli-2026`) dan overlay popover kini **100% sejajar lurus dengan garis pembatas vertikal 25%** milik `TOTAL UNPAID THIS MONTH` (Card 1) dan `TOTAL TEMPLATE` (Card 5) di atasnya.

2. **Billing & Statement Symmetrical 2-Column Payout Header**:
   - Merombak area kiri Payout Breakdown Header pada [`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L571) & [`MonthFilter.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/MonthFilter.tsx#L37) menjadi **2 Kolom Simetris (`grid grid-cols-2 w-full lg:w-1/2 divide-x divide-[#272a34]`)**.
   - **Kolom 1 (25% pertama)**: Sel judul `PAYOUT BREAKDOWN`.
   - **Kolom 2 (25% kedua)**: Sel dropdown `MonthFilter` (`Juli-2026`).
   - Seluruh garis pembatas vertikal kini 100% sejajar lurus dengan garis pembatas 4 kolom KPI Grid di atasnya.

2. **Billing & Statement Layout Reverted to Natural Symmetrical Table Style**:
   - Mengembalikan layout Block 1 Banner Kontrak (`Ketentuan & Aturan Kontrak Freelance`) dan Block 3 Header Payout Breakdown ([`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L571) & [`MonthFilter.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/MonthFilter.tsx#L37)) ke posisi natural sebelumnya (`flex-1 min-w-0` dengan tombol filter `MonthFilter` 100% full container height `h-full py-3.5 px-4 border-l border-r border-[#272a34]`).

2. **Billing & Statement Unified 25% Grid Column Alignment**:
   - Menyelaraskan seluruh batas sel vertikal dari Block 1 Banner Kontrak, Block 2 Row 1 & 2 KPI Grid (`TOTAL UNPAID THIS MONTH` & `TOTAL TEMPLATE`), hingga Block 3 Payout Breakdown Header (`PAYOUT BREAKDOWN` + `MonthFilter`) pada [`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L571) & [`MonthFilter.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/MonthFilter.tsx#L37) di posisi presisi **25% lebar kontainer (`w-full lg:w-1/4 shrink-0 border-r border-[#272a34]`)**.
   - Seluruh garis pembatas vertikal dari atas hingga bawah kontainer kini lurus tegak sejajar 100% tanpa offset.

2. **Payout Breakdown 25% Grid Column Vertical Alignment**:
   - Menyelaraskan sel judul **Payout Breakdown** pada [`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L573) ke **`w-full lg:w-1/4 shrink-0 border-r border-[#272a34]`**.
   - Garis pembatas vertikal antara `Payout Breakdown` dan `MonthFilter` kini membentang **100% lurus & sejajar presisi pada posisi 25% (Kolom 1)** dengan garis pembatas vertikal KPI Card `TOTAL UNPAID THIS MONTH` (Card 1) dan `TOTAL TEMPLATE` (Card 5) di atasnya.

2. **Billing & Statement Double Border Line Fix**:
   - Menghapus kelas `border-b` pada Block 1 (Banner Kontrak) dan `border-t` pada Row 2 KPI Grid ([`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L465)) yang sebelumnya tumpang tindih dengan kelas `divide-y` kontainer utama.
   - Garis pembatas horizontal kini berupa garis tunggal 1px yang bersih & presisi.

2. **Payout Breakdown Header & MonthFilter Full-Container Height**:
   - Menyelaraskan seluruh sel pada toolbar header **Payout Breakdown** ([`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L570) & [`MonthFilter.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/MonthFilter.tsx#L39)) untuk membentang **100% tinggi penuh kontainer (`items-stretch h-full py-3.5`)**.
   - Menghapus padding sel tertutup sehingga sel label `Payout Breakdown`, sel `MonthFilter`, dan sel `Download all Statement` terhubung lurus dari batas border atas hingga dasar header tanpa celah.

2. **Billing & Statement MonthFilter Table Style**:
   - Menyelaraskan komponen [`MonthFilter.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/MonthFilter.tsx#L36) pada toolbar header **Payout Breakdown** ke **Flat Table Style**.
   - Tombol trigger `MonthFilter` kini mengisi 100% tinggi sel (`h-full px-3.5 border-l border-r border-[#272a34] rounded-none`) dengan overlay popover flat (`rounded-none top-full mt-0 p-1.5 shadow-xl`) dan opsi sel flat `rounded-none`.

2. **Billing & Statement Payout Breakdown Table Style Toolbar Header**:
   - Menyelaraskan toolbar header **Payout Breakdown** pada halaman Billing & Statement ([`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L570)) ke **Full-Height Symmetrical Table Style**.
   - Menghapus pill melayang `rounded-full` dan box padding `p-4`.
   - Tombol **`Download all Statement`** kini menjadi sel tabel tinggi penuh (`h-full px-5 py-3.5 bg-[#ff5e1f] hover:bg-[#ff7038] font-mono text-xs font-bold uppercase rounded-none border-l border-[#272a34]`) yang terhubung presisi.

2. **Account & Team Page 50% Vertical Border Line Alignment**:
   - Menyelaraskan garis pembatas vertikal tengah antara banner atas dan 2 tabel di bawahnya pada [`src/app/account-team/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/account-team/page.tsx#L81) menggunakan `grid grid-cols-1 lg:grid-cols-2 divide-x divide-[#272a34]`.
   - Garis pembatas vertikal 50/50 kini lurus sejajar presisi dari atas banner hingga dasar tabel.

2. **Rate Card Page Banner Action Button Relocation**:
   - Memindahkan tombol **`+ Add Doctype`** ([`AddDoctypeButton.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/AddDoctypeButton.tsx)) dari `CloudflareTopBar` ke dalam banner **Ketentuan & Aturan Kontrak Freelance** ([`src/components/DoctypeTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/DoctypeTable.tsx#L63)) di posisi paling kanan sel tabel simetris, persis di sebelah sel `Rate/Pool Editor`.
   - Menggunakan gaya **Full-Height Symmetrical Table Style Cell** (`flex items-center gap-2 px-5 py-4 bg-[#ff5e1f] hover:bg-[#ff7038] font-mono text-xs font-bold uppercase text-white`).

2. **Permanent Dashboard Button Removal**:
   - Menghapus elemen tombol fallback `Dashboard` melayang (`<Link href="/"><span>Dashboard</span></Link>`) dari [`CloudflareTopBar.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/CloudflareTopBar.tsx#L163) secara permanen di seluruh rute halaman aplikasi.
   - Bilah navigasi atas kini tampil bersih tanpa tombol `Dashboard` melayang.

2. **Account & Team Page Banner Action Button Relocation**:
   - Memindahkan tombol **`+ Add Team/Account`** dari `CloudflareTopBar` ke dalam banner **Ketentuan & Aturan Kontrak Freelance** ([`src/app/account-team/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/account-team/page.tsx#L106)) di posisi paling kanan sel tabel simetris, persis di sebelah sel `Rate/Pool: IDR 15.000`.
   - Menggunakan gaya **Full-Height Symmetrical Table Style Cell** (`flex items-center gap-2 px-5 py-4 bg-[#ff5e1f] hover:bg-[#ff7038] font-mono text-xs font-bold uppercase text-white`).

2. **AccountSwitcher Vertical Separator**:
   - Menambahkan garis separator pembatas vertikal 1px (`w-px h-4 bg-[#f0f0f0] dark:bg-[#272a34]`) persis di sebelah kiri komponen [`AccountSwitcher.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/AccountSwitcher.tsx) pada [`CloudflareTopBar.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/CloudflareTopBar.tsx#L175).
   - Memisahkan grup kontrol aksi/filter dari komponen manajemen akun login secara tegas & elegan.

2. **Global AccountSwitcher Implementation**:
   - Memastikan `CloudflareTopBar` (yang mencakup [`AccountSwitcher.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/AccountSwitcher.tsx) di posisi paling kanan) telah terpasang secara aktif pada seluruh 9 rute halaman aplikasi:
     - Dashboard (`/`)
     - Production Board (`/production`)
     - Billing & Statement (`/billing-statement`)
     - Account & Team (`/account-team`)
     - Rate Card (`/rate-card`)
     - Knowledge Graph (`/knowledge-graph`)
     - Notion Config (`/notion-config`)
     - Notion Config Databases (`/notion-config/databases`)
     - Content Access (`/content-access`)

2. **Multiple Account Manager Switcher (`AccountSwitcher.tsx`)**:
   - Memindahkan posisi pemilih akun manager ([`AccountSwitcher.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/AccountSwitcher.tsx)) ke **posisi paling kanan (Far Right)** pada bilah navigasi header atas ([`CloudflareTopBar.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/CloudflareTopBar.tsx#L177)) di seluruh halaman.
   - Komponen ini dipersiapkan sebagai kontrol manajemen akun pengguna aplikasi & akun login manager.

2. **Dashboard Fallback Button Removal**:
   - Menambahkan komponen pemilih akun manager ([`AccountSwitcher.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/AccountSwitcher.tsx)) pada bilah navigasi header atas ([`CloudflareTopBar.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/CloudflareTopBar.tsx#L140)) di seluruh halaman.
   - Dilengkapi dengan dukungan multiple account selector, `localStorage` state persistence, Cloudflare Checkbox (`w-4 h-4 rounded-[5px]`), serta opsi kelola akun manager.

2. **Dashboard Fallback Button Removal**:
   - Menghapus tombol fallback `DASHBOARD` secara total dari [`CloudflareTopBar.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/CloudflareTopBar.tsx#L156).
   - Halaman **Notion Config**, **Knowledge Graph**, dan **Billing & Statement** (serta halaman tanpa opsi filter/aksi khusus) kini tidak menampilkan tombol `DASHBOARD` melayang pada header atas.

21. **Cloudflare TopBar Style Restoration**:
   - Mengembalikan seluruh elemen bilah navigasi atas (`CloudflareTopBar.tsx`, `PeriodPicker.tsx`, `AddDoctypeButton.tsx`) ke **Cloudflare Style semula**:
     - Memulihkan tombol **Search Trigger (`⌘ K`)**.
     - Memulihkan tombol **Theme Toggle** (`p-2 rounded-lg border`).
     - Memulihkan **PeriodPicker** (`pl-9 pr-8 py-2 rounded-lg border` & `rounded-xl` overlay).
     - Memulihkan tombol **Action Pill** (`rounded-full bg-[#ff5e1f] px-4 py-1.5`).
     - Memulihkan tombol fallback **Dashboard**.

2. **TopBar Action Button (AddDoctypeButton) Flat Table Style**:
   - Menyelaraskan tombol aksi pada header ([`AddDoctypeButton.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/AddDoctypeButton.tsx#L80) & [`CloudflareTopBar.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/CloudflareTopBar.tsx#L136)) ke **Flat Table Style**.
   - Menghapus pill melayang `rounded-full` dan margin internal.
   - Tombol aksi kini mengisi 100% tinggi penuh 56px (`h-full px-5 rounded-none border-l border-[#272a34] bg-[#ff5e1f] hover:bg-[#ff7038]`) yang sejajar presisi dengan garis tabel top bar.

2. **PeriodPicker Table Style Dropdown & Divider Border**:
   - Menambahkan border pembatas vertikal 1px (`border-l border-[#272a34]`) pada tombol trigger `PeriodPicker.tsx` ([`src/components/PeriodPicker.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/PeriodPicker.tsx#L82)) di sebelah tombol Theme Toggle.
   - Mengubah panel overlay dropdown PeriodPicker menjadi **Flat Table Style** (`rounded-none`, `mt-0`, `p-1.5`, `shadow-xl`) dengan tombol opsi `rounded-none`.

2. **Cloudflare TopBar Flat Table Style & Search Removal**:
   - Menghapus tombol search (`⌘ K`) secara total dari [`CloudflareTopBar.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/CloudflareTopBar.tsx#L115).
   - Merombak area tools kanan (Theme Toggle & PeriodPicker) menjadi **Flat Continuous Table Style Toolbar** (`h-full divide-x border-l`).
   - Seluruh kontrol pada top bar kini mengisi 100% tinggi penuh 56px (`h-14`) dengan garis pembatas vertikal 1px yang presisi dan rata tanpa margin melayang.

2. **PeriodPicker & MonthFilter Cloudflare Style Standardization**:
   - Menyelaraskan komponen [`PeriodPicker.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/PeriodPicker.tsx#L88) dan [`MonthFilter.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/MonthFilter.tsx#L49) (pemilih bulan header/billing) ke standar Cloudflare.
   - Menghapus tint kecokelatan/oranye (`bg-[#ff5e1f]/10` / `hover:bg-[#F5F0EB]`) dan border oranye.
   - Menggunakan highlight netral Cloudflare (`bg-gray-100 dark:bg-[#20232b]`), kontainer popover `rounded-xl shadow-xl`, serta custom Checkbox Cloudflare (`w-4 h-4 rounded-[5px]`).

2. **Non-Table Dropdown Rounding Standard**:
   - Mempertahankan gaya sudut membulat modern (`rounded-xl` pada kontainer panel dan `rounded-lg` pada tombol opsi) untuk komponen dropdown standalone non-tabel (`SelectDropdown.tsx` pada form Sync Config).
   - Membedakan standar tabel (flat `rounded-none`) dengan standar form kontrol non-tabel (modern `rounded-lg` / `rounded-xl`).

2. **Re-usable SelectDropdown Cloudflare Style Standardization**:
   - Menyelaraskan komponen [`SelectDropdown.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/SelectDropdown.tsx#L46) (digunakan pada halaman Notion Sync Config) ke standar Cloudflare.
   - Menghapus tint kecokelatan/oranye (`bg-[#ff5e1f]/10`) dan border oranye.
   - Menggunakan highlight netral Cloudflare (`bg-gray-100 dark:bg-[#20232b]`), kontainer popover `rounded-none shadow-xl`, serta custom Checkbox Cloudflare (`w-4 h-4 rounded-[5px]`).

2. **Sort Dropdown Cloudflare Style Standardization**:
   - Menyelaraskan seluruh menu sort dropdown (`PayrollToolbar.tsx` & `SortControl.tsx`) ke standar Cloudflare.
   - Menghapus tint kecokelatan/oranye (`bg-[#ff5e1f]/10`) dan indigo tint (`bg-indigo-50`).
   - Menggunakan highlight netral Cloudflare (`bg-gray-100 dark:bg-[#20232b]`) dan custom Checkbox Cloudflare (`w-4 h-4 rounded-[5px]`).

2. **Cloudflare Filter Style Standardization**:
   - Menyelaraskan seluruh komponen filter (`PayrollToolbar.tsx` & `ProductionToolbar.tsx`) ke standar Cloudflare.
   - Menghapus tint kecokelatan/oranye (`bg-[#ff5e1f]/10`) pada tombol filter, filter chip toolbar, dan item popover.
   - Menggunakan highlight netral Cloudflare (`bg-gray-100 dark:bg-[#20232b]`), badge kontras inversi (`bg-black dark:bg-white text-white dark:text-black rounded-[4px]`), serta custom checkbox Cloudflare (`w-4 h-4 rounded-[5px]`).

2. **Dropdown Month Toggle & Uncheck Logic Fix**:
   - Memperbaiki logika pemilihan bulan pada `PayrollToolbar.tsx` ([`src/components/payroll/PayrollToolbar.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/payroll/PayrollToolbar.tsx#L281)) dan `ApprovalPayrollTable.tsx` ([`src/components/ApprovalPayrollTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ApprovalPayrollTable.tsx#L192)).
   - Memungkinkan pengguna membatalkan pilihan bulan (*uncheck*) saat mengeklik ulang opsi bulan yang sudah aktif (`setBatchMonth(prev === month ? '' : month)`).

2. **Cloudflare Checkbox Design & Inversion Alignment**:
   - Menyelaraskan seluruh checkbox baik native (`input[type="checkbox"]`) maupun custom dropdown `<div>` pada `PayrollToolbar.tsx` ([`src/components/payroll/PayrollToolbar.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/payroll/PayrollToolbar.tsx#L282)), `PayrollTableRow.tsx` ([`src/components/payroll/PayrollTableRow.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/payroll/PayrollTableRow.tsx#L53)), dan `ApprovalPayrollTable.tsx` ([`src/components/ApprovalPayrollTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ApprovalPayrollTable.tsx#L157)).
   - Memastikan standar `w-4 h-4 rounded-[5px]` dengan border `border-gray-300 dark:border-[#343846]` dan pola inversi kontras Cloudflare (`#18181b` hitam di light mode / `#ffffff` putih di dark mode).

2. **Approval Payroll Toolbar Full-Container Standard**:
   - Merombak `PayrollToolbar.tsx` ([`src/components/payroll/PayrollToolbar.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/payroll/PayrollToolbar.tsx#L56)) dari bilah toolbar ber-padding `p-2.5` dengan tombol melayang 32px menjadi **Flat Continuous Table Cell Toolbar** (`w-full h-10 p-0 items-stretch divide-x divide-[#272a34]`).
   - Seluruh elemen kontrol (Search, Sort, Filter, Selected Count, Batch Month Picker, dan Assign Selected) kini membentang **100% mengisi tinggi penuh 40px** toolbar row dengan pembatas border vertikal 1px yang presisi.

2. **Approval Payroll Table Alignment & Full-Height Action Cell Standard**:
   - Memperbaiki format tabel pada halaman Billing Statement tab Approval Payroll ([`src/components/ApprovalPayrollTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ApprovalPayrollTable.tsx#L164) dan [`src/components/payroll/PayrollTableRow.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/payroll/PayrollTableRow.tsx#L86)).
   - Menyelaraskan seluruh spesifikasi lebar kolom `<th>` dan `<td>` secara presisi.
   - Mengubah sel dropdown `PAYROLL MONTH` dan tombol aksi `ASSIGN` menjadi **sel aksi tabel flat tinggi penuh** (`w-full h-full min-h-[44px] border-l border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-[#ff5e1f] text-white`).

2. **Inline Table Editing Standard & Implementation Plan Document**:
   - Memformalkan **Dokumen Implementation Plan** ([`implementation_plan.md`](file:///Users/fatchurbeny/.gemini/antigravity-ide/brain/19d5a7b3-d058-4a2d-917c-cc52165f2f7e/implementation_plan.md)) untuk standar Struktur dan UX Inline Table Editing di seluruh aplikasi (Rate Card, Notion Config, Billing Statement, Production).
   - Menetapkan aturan `cloudflare-inline-table-editing-rule` pada [`AGENTS.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/AGENTS.md#L128) dan menyinkronkan ke Knowledge Graph ([`KnowledgeGraphViewer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KnowledgeGraphViewer.tsx#L339)).

2. **Full-Height Table Action Edit Cell Standard**:
   - Memperbaiki tombol aksi `Edit Rate Card` pada `RateCardRow.tsx` ([`src/components/RateCardRow.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/RateCardRow.tsx#L137)).
   - Memperpendek teks tombol menjadi **`EDIT`** (uppercase tracking-wider).
   - Mengubah elemen tombol dari pill melayang menjadi **sel aksi tabel flat tinggi penuh** (`w-full h-full min-h-[44px] border-l border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 hover:bg-[#ff5e1f] text-white`).

2. **Full-Height Input Cell & Native Spinbutton Removal Standard**:
   - Memperbaiki sel input `POOL RATE` dan `PAGES` pada mode inline editing [`src/components/RateCardRow.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/RateCardRow.tsx#L76).
   - Menghapus stepper arrow panah atas/bawah bawaan browser yang tidak rapi (`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`).
   - Menyetel input agar mengisi **100% tinggi penuh kontainer baris tabel** (`h-full min-h-[44px] align-stretch p-0`) dilengkapi border vertikal (`border-x` & `border-r`) yang menyatu rapi dengan garis grid tabel.

2. **Full-Height Container Table Action Cell Standard**:
   - Memperbaiki issue celah vertikal pada tombol aksi inline editing di [`src/components/RateCardRow.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/RateCardRow.tsx#L112).
   - Menetapkan `h-full align-stretch` pada sel `<td>` serta `h-full min-h-[44px]` pada tombol `SAVE` dan `CANCEL`, sehingga blok tombol 2-kolom mengisi **100% tinggi penuh kontainer baris tabel** tanpa celah atas/bawah.

2. **Inline Table Editing Cloudflare Standard**:
   - Memperbaiki gaya tampilan inline editing pada tabel Rate Card [`src/components/RateCardRow.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/RateCardRow.tsx#L70).
   - Mengubah elemen input angka `POOL RATE` & `PAGES` dari pill melayang menjadi **input tabel flat persegi** (`rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] h-8 text-center`).
   - Mengubah kolom tombol aksi `ACTION` saat mode edit menjadi **2-kolom symmetrical table cell row** (`grid grid-cols-2 divide-x border-l`), dengan sisi kiri tombol `SAVE` (`#ff5e1f` orange cell) dan sisi kanan tombol `CANCEL` (gray cell).

2. **Doctype Table Heading Bottom Border Standard**:
   - Memperbaiki issue ketersediaan garis pembatas bawah (*bottom border*) pada baris judul header tabel Rate Card.
   - Menambahkan kelas `border-b border-[#f0f0f0] dark:border-[#272a34]` pada elemen `<tr className="border-b ...">` di `<thead>` pada [`src/components/DoctypeTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/DoctypeTable.tsx#L86) sehingga pembatas antara header tabel dan data baris pertama di-render presisi tepat 1px.

2. **Approval Payroll Continuous Card Sticky 3-Header Group Standard (`sticky top-[56px] z-30` & `sticky top-[101px] z-30`)**:
   - Memastikan 3 bagian header pada halaman Billing Statement tab Approval Payroll (Row 1: Tab Navigation Bar `Summary` & `Approval Payroll`, Row 2: Filter/Batch Action Toolbar `PayrollToolbar`, dan Row 3: Table Heading `TASK | DESIGNER | DOCTYPE | BRAND ...`) melayang secara bertingkat dan terkunci bersamaan (*sticky on top*) di [`src/components/ApprovalPayrollTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ApprovalPayrollTable.tsx#L140) dan [`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx#L304).

2. **Continuous Card Sticky 3-Header Group Standard (`sticky top-[56px] z-30`)**:
   - Memastikan 3 bagian header (Row 1: Banner Ketentuan Kontrak, Row 2: Toolbar Pencarian Doctype, dan Row 3: Table Heading `DOCTYPE | RATE/POOL | POOL RATE | PAGES | LAST UPDATE | ACTION`) terkunci melayang secara bersamaan (*sticky on top*) tepat di bawah Top Bar (`top-[56px] z-30`) dengan latar belakang opak `bg-white dark:bg-[#0d0e12]` dan `shadow-sm` di [`src/components/DoctypeTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/DoctypeTable.tsx#L33).

2. **Sticky Header Group Standard (`sticky top-[56px] z-30`)**:
   - Mengembalikan aturan sticky header group pada [`src/components/DoctypeTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/DoctypeTable.tsx#L33).
   - Seluruh baris header (Banner Kontrak, Toolbar Pencarian, dan Header Tabel `<th>`) dibungkus dalam `<div className="sticky top-[56px] z-30 bg-white dark:bg-[#0d0e12] divide-y">`, melayang secara sempurna saat halaman di-scroll tanpa mengganggu kepresisian alignment lebar kolom data (`w-[260px]`, `w-[180px]`, `w-[140px]`, `w-[120px]`, `w-[200px]`, `w-[180px]`).

2. **Balanced Doctype Table Column Width Distribution**:
   - Memperbaiki issue kolom Doctype yang terlalu lebar pada halaman Rate Card.
   - Menetapkan lebar presisi proporsional `w-[260px] truncate` pada kolom DOCTYPE, serta membagi lebar kolom lainnya secara seimbang (`RATE/POOL: w-[180px]`, `POOL RATE: w-[140px]`, `PAGES: w-[120px]`, `LAST UPDATE: w-[200px]`, `ACTION: w-[180px]`) pada [`src/components/DoctypeTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/DoctypeTable.tsx#L85) dan [`src/components/RateCardRow.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/RateCardRow.tsx#L72).

2. **Table Header & Data Column Alignment Standard**:
   - Memperbaiki ketidaksejajaran (*misalignment*) antara kolom header tabel dan data body pada halaman Rate Card.
   - Menggabungkan elemen `<thead>` dan `<tbody>` ke dalam **1 tag `<table>` tunggal** pada [`src/components/DoctypeTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/DoctypeTable.tsx#L70) serta menetapkan kelas lebar presisi (`w-[140px]`, `w-[120px]`, `w-[100px]`, `w-[180px]`, `w-[160px]`) pada header `<th>` dan sel data `<td>` di [`src/components/RateCardRow.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/RateCardRow.tsx#L70).

2. **Eliminate Double Border Lines in Continuous Table Containers**:
   - Memperbaiki issue garis ganda (*double line*) di atas search toolbar halaman Rate Card ([`src/components/DoctypeTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/DoctypeTable.tsx#L34)).
   - Menghapus kelas `border-b` dan `border-t` eksplisit berlebih dari baris anak di dalam pembungkus `divide-y divide-[#f0f0f0] dark:divide-[#272a34]`, sehingga pembatas antar baris di-render presisi tepat 1px.

2. **Cloudflare Modal Popup Structure & Layout Standard**:
   - Menjadikan struktur modal continuous card ini sebagai **General Style Resmi Seluruh Modal Pop-up Aplikasi**:
     - **Kontainer Utama**: `rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-2xl overflow-hidden font-sans`.
     - **Header Cell**: `p-4 sm:p-5 bg-gray-50/50 dark:bg-[#16181d]/50`, judul font-mono uppercase `text-xs font-bold`, tombol penutup flat dengan ikon **`<X className="w-4 h-4" />`** (`lucide-react`).
     - **Body Form Cell**: `p-4 sm:p-5 space-y-4 bg-white dark:bg-[#0d0e12]`, wrapper label `flex flex-col gap-2.5 font-mono text-xs font-bold uppercase`, input `rounded-lg border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-3.5 py-2.5`.
     - **Action Footer Row**: `grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]`, tombol `TEST CONNECTION` (kiri 50% `bg-gray-50/50 dark:bg-[#16181d]/50`) dan `SAVE` (kanan 50% `bg-[#ff5e1f] hover:bg-[#ff7038] text-white`).
   - Menerapkan dan merombak modal **Add Notion Database** pada [`src/app/notion-config/databases/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/notion-config/databases/page.tsx#L268), mengganti `XCircle` dengan ikon standar `X`.
   - Mendaftarkan aturan ini secara permanen pada [`AGENTS.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/AGENTS.md#L106), [`docs/knowledge/issues-and-fixes.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/issues-and-fixes.md#L64), dan Web UI Knowledge Graph Viewer [`src/components/KnowledgeGraphViewer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KnowledgeGraphViewer.tsx#L380).

2. **Prevent Theme Flicker on Form Submits (`router.refresh()` Standard)**:
   - Memperbaiki issue kedip tema (*light/dark theme flicker*) saat menyimpan form modal rate/pool dengan mengganti `window.location.reload()` (pemuatan ulang halaman keras) menjadi **`router.refresh()`** (pembaharuan data Server Component Next.js secara *smooth* tanpa *unmount* DOM atau *flicker* tema) pada [`src/components/ContractRateEditor.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ContractRateEditor.tsx) dan [`src/components/AddDoctypeButton.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/AddDoctypeButton.tsx).

2. **Single Global Toaster Provider & Toast Conflict Resolution**:
   - Memperbaiki masalah 2 toast ganda (*conflict duplicate toast*) dengan menghapus instansiasi `<Toaster />` lokal pada `SyncButton.tsx` dan `SortableTaskLists.tsx`.
   - Mengkonsolidasikan seluruh notifikasi sistem pada **satu `Toaster` provider tunggal presisten** di [`src/app/layout.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/layout.tsx):
     - **Posisi**: Kanan atas (`position="top-right"`, `containerStyle={{ top: 64, right: 24 }}`).
     - **Lebar Area Toast**: Lebar proporsional 3-kolom grid (`w-[420px] sm:w-[480px] max-w-[90vw]`).
     - **Styling**: `!bg-white dark:!bg-[#16181d] !border-[#272a34] !rounded-none font-mono text-xs shadow-2xl`.

2. **Edit Contract Rate Modal Cloudflare Continuous Card Standard**:
   - Merombak modal pop-up **Edit Contract Rate** pada [`src/components/ContractRateEditor.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ContractRateEditor.tsx).
   - Menggunakan gaya Cloudflare continuous card (`divide-y divide-[#f0f0f0] dark:divide-[#272a34]`), kontainer luar **`rounded-none`** (presisi sudut tajam Cloudflare tanpa rounded-xl), header/footer flat cell `bg-gray-50/50 dark:bg-[#16181d]/50`, font mono uppercase, serta preservasi **style `rounded-lg` khusus pada tombol aksi utama (`Save Rate/Pool`)** dan tombol sekunder (`Cancel`).

2. **Full-Height Symmetrical Table Controls Standard**:
   - Merombak seksi banner header dan kontrol `Kalender` & `Rate/Pool` pada [`src/components/DoctypeTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/DoctypeTable.tsx), [`src/components/ContractRateEditor.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ContractRateEditor.tsx), [`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx), dan [`src/app/account-team/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/account-team/page.tsx).
   - Kedua kontrol diposisikan sebagai sel tabel simetris **tinggi penuh (*full-height flex `items-stretch`*)** dengan rasio margin horizontal yang seimbang dan proporsional terhadap tinggi baris (`px-5 sm:px-6 py-4`).

2. **Rate Card Page Header & Toolbar Continuous Table Style (No Gap)**:
   - Merombak seksi banner header dan toolbar pencarian pada [`src/components/DoctypeTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/DoctypeTable.tsx) dan [`src/components/ContractRateEditor.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ContractRateEditor.tsx).
   - Mengubah toolbar pencarian menjadi gaya flat cell `h-10 px-3.5 border-b` tanpa box padding `p-4` atau border terpisah, serta memperbarui tombol `ContractRateEditor` menjadi pill flat continuous Cloudflare presisi `rounded-none shadow-none`.

2. **Contract Rules Banner Continuous Table Style (No Gap)**:
   - Merombak seksi **Ketentuan & Aturan Kontrak Freelance** pada [`src/app/billing-statement/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/billing-statement/page.tsx) dan [`src/app/account-team/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/account-team/page.tsx).
   - Mengubah background menjadi `bg-gray-50/50 dark:bg-[#0d0e12]` flat cell menyatu langsung dalam kontainer continuous card (`divide-y`), serta menyelaraskan pill info (`Kalender` & `Rate/Pool`) menjadi badge flat terstruktur tanpa gap berlebih.

2. **Production Parameter Issue Tab Continuous Table Style (No Gap)**:
   - Merombak tab **Parameter Issue** ([`src/components/ParameterIssueTable.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ParameterIssueTable.tsx) & [`src/components/ProductionView.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/ProductionView.tsx)) menjadi gaya tabel continuous Cloudflare tanpa gap (`divide-y divide-[#f0f0f0] dark:divide-[#272a34]`).
   - Menghapus pembungkus `div p-6`, gap `gap-4`, `rounded-xl`, dan double border. Banner info dan state kosong (*ALL PARAMETERS COMPLETE!*) kini menyatu langsung (*edge-to-edge*) di bawah header tab menu `ProductionTabNav`.

2. **Knowledge Graph AST Import Scanner Automated Connections**:
   - Menambahkan pemindai AST import otomatis pada [`scripts/graphify-parser.ts`](file:///Users/fatchurbeny/Documents/Project/can-freelance/scripts/graphify-parser.ts) yang memindai seluruh file komponen (`src/components/`) dan halaman (`src/app/`).
   - Berhasil menghubungkan seluruh 32 komponen UI (termasuk `AutoPrint`, `DistribusiWidget`, `PipelineWidget`, `SelectDropdown`, `AutoSyncToggle`, dll) ke halaman/komponen induk yang meng-import-nya. Total koneksi (*edges/links*) meningkat dari **18 menjadi 73 koneksi terverifikasi (`EXTRACTED`)**, menghilangkan *isolated floating nodes*.

2. **Knowledge Graph Quick Stats Dashboard Overview KPI Icon Styling**:
   - Menambahkan blok ikon berwarna (`w-6 h-6 rounded-md bg-color/10 text-color`) pada ke-4 sel statistik **Quick Stats** di [`src/components/KnowledgeGraphViewer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KnowledgeGraphViewer.tsx) (`Database`, `Layers`, `Cpu`, `Activity`).
   - Ikon ditempatkan di sudut kanan atas sel sejajar dengan label judul selaras dengan standar desain kartu KPI di halaman Dashboard Overview (`KPISection.tsx`).

2. **Knowledge Graph Header Quick Stats Continuous Table Row**:
   - Merombak seksi **Quick Stats** pada [`src/components/KnowledgeGraphViewer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KnowledgeGraphViewer.tsx) dari grid `gap-4` dengan kartu ber-border terpisah menjadi baris tabel 4 kolom berkelanjutan tanpa gap (`divide-x divide-[#f0f0f0] dark:divide-[#272a34]`).
   - Sel-sel statistik kini merentang penuh dari tepi kiri hingga tepi kanan bagian bawah header card (`-mx-6 -mb-6`) selaras dengan standar desain Cloudflare Continuous Card.

2. **GraphifyVisualizer COMMUNITIES 2-Column Symmetrical Table Style**:
   - Merombak seksi **COMMUNITIES** pada [`src/components/GraphifyVisualizer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/GraphifyVisualizer.tsx) menjadi struktur tabel 2 kolom simetris sejati.
   - Kolom 1 (`COMMUNITIES` / `flex-1`) memuat titik warna dan nama komunitas, sedangkan Kolom 2 (`COUNT` / `w-16`) dibatasi oleh garis pembagi vertikal (`border-l border-[#f0f0f0] dark:border-[#272a34]`) dengan angka tercetak tebal di tengah.

2. **GraphifyVisualizer NODE INFO Full-Width Layout**:
   - Menghapus nested card pembungkus internal (`border` + `bg-gray-50`) dan gap luar pada seksi **NODE INFO** di [`src/components/GraphifyVisualizer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/GraphifyVisualizer.tsx).
   - Konten informasi node kini merentang penuh (*full width*) menyatu dengan kontainer tabel berkelanjutan secara simetris tanpa double border.

2. **Force Graph Hover Jitter Fix & Simulation State Ref Binding**:
   - Memperbaiki bug visualisasi Force Graph 2D pada [`src/components/GraphifyVisualizer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/GraphifyVisualizer.tsx) di mana node-node bergetar/melompat secara acak saat di-hover.
   - **Root Cause**: State `hoveredNode`, `selectedNode`, dan `isDark` sebelumnya masuk dalam dependency array `useEffect` simulasi fisik, sehingga setiap kali tetikus menyentuh node, `useEffect` dibersihkan dan dipanggil ulang yang mereset koordinat `x, y` secara acak (`Math.random()`) serta mengulang energi simulasi dari `alpha = 1`.
   - **Solusi**: Mengisolasi state hover & seleksi ke dalam `hoveredNodeRef`, `selectedNodeRef`, dan `isDarkRef`, serta mengunci dependency array simulasi fisik strictly ke `[data]` saja. Efek visual sorotan (*glow ring*) digambar 60 FPS secara mulus tanpa mengganggu fisika node.

2. **GraphifyVisualizer Search Bar Flat Toolbar Style**:
   - Menyelaraskan kotak pencarian pada [`src/components/GraphifyVisualizer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/GraphifyVisualizer.tsx) dengan gaya flat toolbar (seperti `ProductionToolbar.tsx`).
   - Menghapus padding container `p-3.5` dan border kotak input internal, menggantinya dengan sel header flat `h-10 px-3.5 border-b` berserta tombol pembersih `X` interaktif.

2. **GraphifyVisualizer Right Panel Symmetrical Table Style**:
   - Merombak panel samping kanan pada [`src/components/GraphifyVisualizer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/GraphifyVisualizer.tsx) menjadi gaya tabel Cloudflare simetris berkelanjutan (`divide-y divide-[#f0f0f0] dark:divide-[#272a34]`).
   - Mengintegrasikan kotak pencarian di bagian teratas panel, menambahkan header baris tabel (`NODE INFO` & `COMMUNITIES` / `COUNT`), dan menggunakan baris simetris `px-4 py-2.5` dengan badge angka terstruktur.

2. **Knowledge Graph Container Outer Rounding Elimination (`rounded-none`)**:
   - Mengubah sudut kontainer utama header dan tab panel pada [`src/components/KnowledgeGraphViewer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KnowledgeGraphViewer.tsx) dari `rounded-xl` menjadi `rounded-none` selaras dengan standar desain kontainer utama halaman lain (`/`, `/production`, `/billing-statement`, `/notion-config`).

2. **Knowledge Graph Outer Padding Equalization (`p-6 md:p-8`)**:
   - Menyederhanakan padding outer `<main>` pada rute `/knowledge-graph` ([`src/app/knowledge-graph/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/knowledge-graph/page.tsx)) menjadi `p-6 md:p-8` sehingga jarak padding atas, kiri, dan kanan 100% persis sama dengan halaman Dashboard utama.

2. **Knowledge Graph Tab Height & Proportional Width Equalization**:
   - Menyamakan tinggi padding vertical tab menu Knowledge Graph menjadi `py-3.5` selaras dengan standar tab halaman lain (`CloudflareTabPanel.tsx`).
   - Menerapkan `flex-1 min-w-max justify-center` pada 7 item tab menu di [`src/components/KnowledgeGraphViewer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KnowledgeGraphViewer.tsx) sehingga lebar tab secara otomatis terbagi rata memenuhi 100% lebar kontainer secara simetris.

2. **Knowledge Graph Full-Width Layout & Symmetrical Padding**:
   - Menghapus pembatas `max-w-7xl mx-auto` pada [`src/components/KnowledgeGraphViewer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KnowledgeGraphViewer.tsx) dan menggantinya dengan `w-full` agar visualisasi grafis dan tab dokumentasi merentang penuh.
   - Menyelaraskan padding utama di [`src/app/knowledge-graph/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/knowledge-graph/page.tsx) menjadi `p-6` simetris di bagian atas, kiri, dan kanan.

2. **Notion Config Auto Sync & Sync Interval Height & Spacing Equalization**:
   - Menyamakan tinggi kontrol `Auto Sync State` dan tombol `<SelectDropdown>` secara presisi menjadi `h-11` (44px) di [`src/components/SelectDropdown.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/SelectDropdown.tsx) dan [`src/app/notion-config/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/notion-config/page.tsx).
   - Menambahkan jarak atas ekstra (`mt-6` dan `space-y-2.5`) dari deskripsi paragraf di atasnya agar tampilan lebih lega dan tidak menutupi label/ikon compass.

2. **Notion Config Header Removal**:
   - Menghapus elemen judul header `Notion Connector` (`<h2 className="...">Notion Connector</h2>`) pada rute `/notion-config` ([`src/app/notion-config/page.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/notion-config/page.tsx)) agar layout kartu terpadu Cloudflare langsung menjadi elemen teratas secara bersih.

2. **Mandatory Knowledge Graph Pre-Execution Check (`AGENTS.md`)**:
   - Menambahkan protokol wajib di `AGENTS.md` di mana setiap agen AI WAJIB membaca `docs/knowledge/index.md` dan `docs/knowledge/session-handover.md` sebelum memberikan saran atau melakukan eksekusi perintah/kode.

2. **Custom UI Component Skill (`.agents/skills/ui-component-development/`)**:
   - Membuat Custom Skill resmi yang otomatis mengontrol proses pembuatan/editing komponen UI, mewajibkan atomisasi komponen saat file mendekati 250 baris, serta melarang *full-file rewrite*.

3. **Skrip Audit Ukuran Komponen (`scripts/check-component-sizes.ts`)**:
   - Menambahkan skrip verifikasi otomatis yang bisa dijalankan dengan `npx tsx scripts/check-component-sizes.ts` untuk memindai file di `src/components/` yang melampaui batas 300 baris / 15KB.

4. **Refactoring Atomisasi Micro-Components**:
   - **`ApprovalPayrollTable.tsx`**: Di-refactor dari 568 baris (29.5 KB) menjadi 175 baris (6.9 KB) (~70% pemotongan ukuran file) dengan mengekstrak `src/components/payroll/PayrollTableRow.tsx` dan `src/components/payroll/PayrollToolbar.tsx`.
   - **`SortableTaskLists.tsx`**: Di-refactor dari 459 baris (16.7 KB) menjadi 250 baris (8.6 KB) dengan mengekstrak `src/components/kanban/kanban-config.ts` dan `src/components/kanban/KanbanBoardHeader.tsx`.

1. **UI Style & Control Rounding Invariants (`ui-container-vs-control-rounding`)**:
   - Memastikan kontainer utama luar menggunakan `rounded-none`, namun tetap mempertahankan `rounded-lg` / `rounded-full` untuk sakelar toggle, badge, pill, dan tombol aksi agar tampilan tetap modern dan tidak *boxy*.

2. **Notion Auto Sync Countdown Reference Time Calculation**:
   - Memperbarui `/api/sync/cron` dan `saveSchedulingConfigAction` untuk menghitung `referenceStartTime = Math.max(lastFinished, configUpdatedAt)` sehingga pengaktifan Auto Sync mengatur timer mundur penuh tanpa *instant sync*.

3. **Sidebar Sync Table Block & Border Elimination**:
   - Menyelaraskan indikator sync sidebar menjadi blok tabel simetris full-width (`w-full rounded-none divide-y`) tanpa *double border* di atas tombol dan tanpa border di dasar drawer.

4. **Notion Config Continuous 2-Column Symmetrical Layout**:
   - Menggabungkan kolom kiri (*Workspace Connection & Scheduled Sync Settings*) dan kolom kanan (*How To Setup & Dynamic Current Sync Summary*) ke dalam satu kontainer tabel Cloudflare berkelanjutan tanpa gap.

5. **Approval Payroll Inner Container Double Border Removal**:
   - Menghapus pembungkus border `rounded-xl border border-[#f0f0f0]` dari `ApprovalPayrollTable.tsx` agar menyatu tanpa *double border* di dalam kontainer `billing-statement`.

---

## 📝 Catatan untuk LLM / Editor Selanjutnya (Handover Notes)

* **Instruksi Awal Sesi**: Saat menerima tugas baru dari user, selalu baca `docs/knowledge/index.md` dan modul relevan sebelum melakukan pencarian berkali-kali.
* **Instruksi Akhir Sesi**: Sebelum menutup sesi, perbarui section **Status Sesi Terakhir** dan **Keputusan Arsitektur** di dokumen ini (`session-handover.md`).

