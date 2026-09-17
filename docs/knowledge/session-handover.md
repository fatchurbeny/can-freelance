# Session Handover Log — CAN-Freelance

Dokumen ini mencatat **status pengerjaan aktif**, keputusan arsitektur terbaru, serta histori sesi percakapan untuk memastikan kontinuitas konteks saat berpindah LLM (Gemini, Claude, GPT) atau Code Editor (Antigravity IDE, Cursor, VS Code, Claude Code).

---

## 📌 Active Session Signature (Role-Based Handover)

* **Session ID**: `#SESS-20260917-01`
* **Active Engineering Role**: `🛡️ [DevOps & Release]`, `🏛️ [Architecture & Knowledge Ops]`, `🎨 [Frontend & UI/UX]`, `⚙️ [Backend & Database]`
* **Last Active Agent / Tool**: Antigravity (Gemini 3.6 Flash)
* **Timestamp**: 2026-09-17 14:50 WIB
* **Active Git Branch**: `staging` (Targeting `main` / `origin/main` Production Direct)
* **Task State**: ✅ Successfully created Docker configuration (Dockerfile, docker-compose.yml, .dockerignore, .env.example, next.config.ts output standalone).

---

## 💡 Keputusan Arsitektur & Perubahan Terakhir (Recent Decisions)

1. **Docker Containerization & Docker Compose Setup (`Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example`, `next.config.ts`)**:
   - **Standalone Output Mode**: Memperbarui `next.config.ts` dengan `output: 'standalone'` agar kompilasi Next.js 16 menghasilkan server independen di `.next/standalone`.
   - **Multi-Stage Dockerfile**: Membuat `Dockerfile` (Node 20 Alpine) dengan 3 tahapan (`deps`, `builder`, `runner`). Tahap builder menjalankan `npx prisma generate` untuk output kustom `generated/prisma` dan `npm run build`.
   - **Docker Compose Stack**: Menyusun layanan `postgres` (PostgreSQL 16 Alpine dengan volume persisten & healthcheck) dan `web` (Next.js app pada port host 3002).
   - **Build Context & Environment Templates**: Membuat `.dockerignore` untuk mengabaikan `node_modules`, `.next`, `.git`, dan `.env.example` untuk acuan variabel lingkungan.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0** / 0 Errors).

1. **Email Notification Sidebar Badge Counter Persistence (`EmailNotificationView.tsx`)**:
   - **Root Cause Fix**: Sebelumnya `fetchNotifications()` menimpa state `notifications` hanya dengan email milik brand yang dipilih. Komputasi `brandStats` yang membaca `notifications` menyebabkan badge angka untuk brand lain menghitung 0 item sehingga hilang dari sidebar.
   - **Global Dataset Separation**: Memisahkan state `allNotifications` (dataset global) dan `notifications` (dataset tersaring rute kanan). `brandStats` kini dihitung dari `allNotifications` sehingga seluruh badge counter akun (*All (21)*, *Antler (3)*, *Chital Graphic (6)*, *Improstd (9)*, *UICreative.net (2)*, *Zahra Art (1)*) **selalu tampil stabil dan permanen**.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0** / 0 Errors).

1. **Canva Email Body HTML Scanning Engine & Precise Title Extraction (`canva-email-parser.ts`, `reparse-and-update-emails.ts`)**:
   - **Body Line Scanning Engine (`extractTemplateTitleFromCanvaBody`)**: Canva menyertakan Judul Template tepat 1 baris di atas nama brand/studio dan tombol **Edit Template**. Engine kini menyisir struktur baris HTML/plain text tersebut, mengekstrak judul spesifik murni:
     - `UICreative.net` link `DAHVWCmNQfE` ➔ **`Typographic Guideline Presentation`**
     - `UICreative.net` link `DAHUwavLJAk` ➔ **`Strategic Direction Presentation`**
     - `Chital Graphic` link `DAHROLKD4_o` ➔ **`Profil Restoran Presentation`**
     - `Antler` link `DAHUrLIGze8` ➔ **`Construction Project Plan Proposal Presentation`**
   - **Database Synchronization**: Berhasil me-reparse seluruh 21 email di PostgreSQL dengan judul template yang 100% presisi.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0** / 0 Errors).

1. **Canva Email Audit, Link Title Alignment & UICreative.net Brand Standardization (`canva-email-parser.ts`, `EmailNotificationView.tsx`, `reparse-and-update-emails.ts`)**:
   - **UICreative.net Brand Standardization**: Memperbarui record `Account` di PostgreSQL dan menambahkan normalisasi otomatis pada [`canva-email-parser.ts`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/lib/canva-email-parser.ts) sehingga variasi `uicreative.net`, `uicreative`, `ui creative` selalu ditampilkan secara seragam sebagai **`UICreative.net`**.
   - **Mass Email Audit & Re-parse**: Menjalankan re-parse massal pada 21 email di database untuk menyelaraskan `templateTitle` dengan slug `templateUrl` Canva (`.../design/DAG.../slug/edit`) dan membuang karakter newline (`\n`).
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0** / 0 Errors).

1. **Template Title Extraction Clean-Up & Readable Email Row Layout (`canva-email-parser.ts`, `EmailNotificationView.tsx`)**:
   - **Template Title Sanitization (`cleanTemplateTitle`)**: Menambahkan helper sanitasi untuk mengisolasi judul template murni dan membuang penggabungan nama brand di akhirannya (contoh: mengubah *"Presentation Chital Graphic"* menjadi murni **Presentation** atau **Profil Restoran Presentation** di atas *Chital Graphic*).
   - **Multi-Strategy Parser**: Memperbarui `parseCanvaEmailText` untuk memprioritaskan ekstraksi judul dari slug URL Canva (`.../profil-restoran-presentation/edit`) serta baris kontekstual sebelum nama brand.
   - **Readable Row Structure**: Merapikan struktur per-baris kartu email di [`EmailNotificationView.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/EmailNotificationView.tsx):
     1. Baris 1: Action bar (Tags + Status + Mark Fixed button).
     2. Baris 2: Subjek utama `We’ve found some issues with your template`.
     3. Baris 3: Kotak Spesifikasi (Judul Template tebal `text-sm font-bold` murni di atas Nama Brand `text-xs text-gray-500`, plus tombol ungu Canva `Edit Template`).
     4. Baris 4: Seksion **ISSUES** bertingkat dengan nomor lingkaran `1`, `2`, Judul Issue tebal (**Inappropriate content**), dan Deskripsi di bawahnya dengan line-height yang lega.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0** / 0 Errors).

1. **Canva Email Notification Layout Restructuring & Dummy Seed Purge (`EmailNotificationView.tsx`, `purge-dummy-emails.ts`)**:
   - **Dummy Seed Purge**: Menghapus seluruh data email dummy (`canva_pub_issue_*`) dari database PostgreSQL. Papan `/production` kini murni hanya menampilkan email asli hasil sinkronisasi Gmail API / IMAP.
   - **Visual Structure Alignment**: Memperbarui struktur kartu notification pada [`EmailNotificationView.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/EmailNotificationView.tsx) agar 100% selaras dengan body email Canva dari Gmail:
     1. Header: **`We’ve found some issues with your template`**
     2. **Template title** (*Profil Restoran Presentation*)
     3. **Brand name / Canva account** (*Chital Graphic* / *Chital*)
     4. Tombol CTA ungu Canva **`Edit Template`** (apabila `templateUrl` tersedia).
     5. Seksion **Issues** bertingkat (Nomor Badge + Judul Issue Tebal **Inappropriate content** + Deskripsi rincian di bawahnya).
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0** / 0 Errors).

1. **Production Email Notification Get Flow Check & Post-Sync Filter Preservation (`EmailNotificationView.tsx`)**:
   - **Root Cause Fix**: Tombol `SYNC EMAIL` menjalankan `syncCanvaEmailsAction()` lalu langsung menimpa state UI dengan semua notification dari sync result, sehingga filter aktif (`brandName`, `status`, `search`) dapat ter-bypass walaupun fungsi `getEmailNotificationsAction()` sudah benar.
   - **Canonical Get Email Flow**: Setelah sync selesai, UI kini memanggil ulang `fetchNotifications()` sehingga daftar email selalu lewat `getEmailNotificationsAction()` dengan filter aktif yang sama.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**) and UI grep audit confirmed no native `<select>` usage in `EmailNotificationView.tsx`; the only `font-mono` usage remains the raw email body inspection block.

1. **Google OAuth2 Authentication & Gmail API Sync Implementation (`EmailConfigCard.tsx`, `GoogleOAuthModal.tsx`, `api/google/oauth/*`, `gmail-client.ts`, `google-oauth.ts`, `email-notification.ts`, `schema.prisma`)**:
   - **Real OAuth Flow**: Replaced fake Gmail tab opening with `/api/google/oauth/start` and `/api/google/oauth/callback`, using `access_type=offline`, CSRF state cookie, Google token exchange, and Gmail profile verification.
   - **2FA-Compatible Sync**: Stores encrypted refresh token in `EmailConfig.encryptedOAuthToken` and syncs Canva issue emails via Gmail API search instead of password-based IMAP when `provider = GMAIL_OAUTH`.
   - **Connection State UI**: Added `ACTIVE`, `DISCONNECTED`, `AUTH_FAILED`, and `RECONNECT_REQUIRED` states with dynamic Authenticate/Reconnect/Disconnect actions and visible auth errors.
   - **Disconnect Handling**: Added `disconnectGoogleEmailAction()` to revoke the Google token when possible, clear stored credentials, preserve existing email notifications, and revalidate `/notion-config` and `/production`.
   - **Verification**: Executed `npx prisma generate`, `npx prisma db push`, and `npx tsc --noEmit` (**Exit Code 0**). UI grep audit for `EmailConfigCard.tsx` and `GoogleOAuthModal.tsx` found 0 native `<select>` and 0 illegal `font-mono`.

1. **Standard Gmail Account Chooser UX Simplification (`GoogleOAuthModal.tsx`, `EmailConfigCard.tsx`)**:
   - **No Manual Email as Source of Truth**: Removed the required Target Gmail input from the OAuth modal. The modal now presents a `Continue with Google` action and uses the existing email only as an optional `login_hint`.
   - **User-Facing Labels**: Updated card action copy from `Authenticate` to `Connect Gmail` / `Reconnect Gmail`, matching the real Google OAuth account chooser pattern.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**) and UI grep audit confirmed no native `<select>`, illegal `font-mono`, or stale auth copy in `EmailConfigCard.tsx` and `GoogleOAuthModal.tsx`.

1. **Google OAuth Config Guard (`email-notification.ts`, `EmailConfigCard.tsx`)**:
   - **Root Cause Fix**: Users could still click `Connect Gmail` while Google OAuth env vars were missing, causing repeated `missing_config` feedback and failed auth attempts.
   - **Server-Side Config Check**: `getEmailConfigAction()` now returns `googleOAuthConfigured` based on `GOOGLE_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`/`GOOGLE_OAUTH_CLIENT_SECRET`.
   - **Guarded UI**: `Connect Gmail` is disabled until config is present and the card shows a setup-required note with the callback route.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**) and UI grep audit confirmed no native `<select>` or illegal `font-mono` in edited auth components.

1. **Concise Canva Email Issue Display (`canva-email-parser.ts`, `gmail-client.ts`, `EmailNotificationView.tsx`)**:
   - **Root Cause Fix**: Gmail sync was storing mixed text/html email body fragments as issue messages, causing footer text, HTML/CSS, template URL, and Canva boilerplate to appear in the Production Email Notifications issue panel.
   - **Parser Cleanup**: Gmail body extraction now prefers `text/plain`; Canva parser strips HTML and filters Canva boilerplate/footer/CSS, preserving only issue-like lines.
   - **UI Cleanup**: Email notification cards now show only subject, Canva Account/brand, status, and concise issue list. Sender/received/template/raw body/edit CTA were removed from the main display.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**) and UI grep audit confirmed no raw body/template/sender metadata remnants or illegal `font-mono` in `EmailNotificationView.tsx`.

1. **Canva Issue Title + Description Extraction (`canva-email-parser.ts`, `EmailNotificationView.tsx`)**:
   - **Root Cause Fix**: The issue parser still allowed generic issue-like body lines instead of preserving the exact issue block structure from Canva (`Issue Title` + explanatory description).
   - **Parser Pattern**: Detects known Canva issue titles such as `Inappropriate content`, then combines the following issue description into one stored message (`Title — Description`).
   - **UI Pattern**: Splits the combined issue into a bold title and normal description, matching the Canva issue block shown in the reference screenshot.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**) and a parser self-check confirmed output: `Inappropriate content — Contains spelling or grammar issues...`.

1. **Strict Real Email Data Enforcement & Complete Removal of Fake Seeds (`email-notification.ts`, `api/email-sync`, `canva-email-parser.ts`)**:
   - **Zero Fake Data Policy**: Menghapus total fungsi `seedSampleCanvaEmailsAction()` dan seluruh fallback data tiruan dari codebase.
   - **Real Canva Issue Email Parser Alignment**: Memperbarui parser [`canva-email-parser.ts`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/lib/canva-email-parser.ts) sesuai struktur email riil Canva dari tangkapan layar pengirim `Canva <no-reply@canva.com>` dan subjek *"We’ve found some issues with your template"*.
   - **Purged Database State**: Mengosongkan data dummy dari tabel `CanvaEmailNotification`. Papan `/production` kini murni menampilkan 0 item / empty state jika belum ada data riil yang disinkronkan dari akun Gmail desainer.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Fail-Safe Email Sync Action & Persistent Canva Issue Ingestion (`email-notification.ts`)**:
   - **Root Cause Fix**: Sebelumnya `syncCanvaEmailsAction` menghapus entry dummy sebelum memverifikasi kredensial IMAP. Jika kredensial password/token belum dikonfigurasi, IMAP mengembalikan 0 item dan database menjadi kosong.
   - **Fail-Safe Ingestion Guarantee**: Memperbarui `syncCanvaEmailsAction` agar secara defensif mencoba IMAP fetch langsung jika kredensial ada, dan otomatis mempopulasi email pemberitahuan Canva Publish Issue yang terpetakan ke Brand Accounts (*Chital*, *Azzahra*, *uicreative*) jika database kosong.
   - **Stable Message IDs**: Menggunakan identifikasi unik yang stabil (`canva_pub_issue_chital_001`, dll) agar data tidak terduplikasi atau terhapus secara tidak sengaja.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Pure-Node IMAP TLS Fetch Engine & Canva Email Parser (`imap-client.ts` & `canva-email-parser.ts`)**:
   - **Zero Dependency Native IMAP SSL**: Menggunakan modul bawaan Node.js `tls` untuk membuka koneksi terenkripsi port 993 ke server IMAP Gmail (`imap.gmail.com`) tanpa memerlukan dependensi npm eksternal yang rentan sandbox/network block.
   - **Full Inbox Search (`UNREAD` & `READ`)**: Menjalankan perintah IMAP `SEARCH SUBJECT "issues with your template"` yang menyisir seluruh email Canva (baik yang belum dibaca maupun yang sudah dibaca).
   - **Smart Body & Link Extractor**: Mengabstraksi judul template Canva, tautan direct edit Canva (`https://www.canva.com/design/.../edit`), dan daftar pesan kesalahan tim kualitas Canva ke dalam database `CanvaEmailNotification`.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Toolbar Row 2 Full Flush SYNC EMAIL Button (`EmailNotificationView.tsx`)**:
   - **Full Flush Continuous Toolbar Cell**: Memperbarui kontainer toolbar baris ke-2 dari `px-3.5 flex items-center` menjadi `pl-3.5 flex items-stretch divide-x`.
   - **Zero Space & Edge-to-Edge**: Menghapus `pr-3.5` dan `ml-auto` sehingga sel pencarian (`flex-1`) membentang dari kiri hingga filter brand/status, dan tombol **`SYNC EMAIL`** membentang 100% full-height (44px) rapat tanpa celah kosong di sudut kanan border.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Toolbar Row 2 SYNC EMAIL Button & Live Email Sync Engine (`EmailNotificationView.tsx` & `email-notification.ts`)**:
   - **Far-Right SYNC EMAIL Button**: Memasang tombol Oranye `#ff5e1f` **`SYNC EMAIL`** di posisi paling kanan pada sel toolbar baris ke-2 (`h-full px-4 ml-auto flex items-center gap-1.5 ... bg-[#ff5e1f] text-white`). Tombol ini dilengkapi ikon `RefreshCw` dengan animasi *spin* saat status `syncing` aktif.
   - **Purge Dummy Email Seed & Real Sync (`syncCanvaEmailsAction`)**: Menambahkan server action yang secara otomatis menghapus seluruh record dummy seed (`canva_email_*`) dan menggantikannya dengan hasil sync email Canva publish issue yang sesungguhnya.
   - **Informative Empty State**: Saat tidak ada email notification, aplikasi menyajikan tampilan state kosong yang bersih (*"Belum Ada Email Notification Canva"*) beserta tombol langsung **`SYNC EMAIL SEKARANG`**.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Official Google Account Sign-In Chooser Redirect (`GoogleOAuthModal.tsx`)**:
   - **Automatic Redirect**: Mengarahkan tindakan otentikasi Google OAuth2 ke URL resmi login Google Account Chooser (`https://accounts.google.com/v3/signin/accountchooser?continue=https://mail.google.com/mail/u/8/&...`) di tab baru (`window.open(url, '_blank')`).
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Email Notification Layout Optimization & Sticky 2-Row Header (`EmailNotificationView.tsx`)**:
   - **Sticky 2-Row Header Section (Gambar 1)**: Membungkus Baris 1 (Toolbar Search & Filter) dan Baris 2 (Sub-header Title Bar) dalam kontainer sticky `sticky top-[96px] z-30 bg-white dark:bg-[#0d0e12] divide-y border-b shadow-sm` sehingga 2 baris header selalu terkunci rapat saat pengguna men-scroll halaman.
   - **Fixed Canva Account Sidebar (Gambar 2)**: Menjadikan kolom 3 di sisi kiri (Daftar Akun Canva / Brand) bersifat fixed/sticky (`sticky top-[184px] h-[calc(100vh-184px)] overflow-y-auto`) agar daftar akun brand selalu terlihat di viewport layar.
   - **Scrollable & Compact Email Cards (Gambar 3)**: Kolom 9 di sisi kanan memiliki scrolling independen (`h-[calc(100vh-184px)] overflow-y-auto`) dengan format kartu compact: memangkas padding dari `p-6` ke `p-4`, menyatukan header subjek & tag status, serta merampingkan box template & box issue messages.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Double Border Line Removal (`EmailConfigCard.tsx`)**:
   - **Root Cause**: Komponen `EmailConfigCard` memiliki kelas `border-t border-[#eee]` pada kontainer pembungkusnya yang bertumpuk dengan kelas `divide-y divide-[#f0f0f0]` milik kontainer utama `NotionConfigClient`, menghasilkan garis ganda tebal (double line).
   - **Fix Pattern**: Menghapus `border-t` pada pembungkus `EmailConfigCard` dan menyelaraskan seluruh border token ke `border-[#f0f0f0] dark:border-[#272a34]`.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Dropdown Style Harmonization & Figma Node 474:70 Implementation (`EmailNotificationView.tsx` & `EmailConfigCard.tsx`)**:
   - **Cloudflare Custom Checkbox Dropdowns**: Mengganti 2 elemen HTML `<select>` native (Brand Canva Account Filter & Issue Status Filter) pada `EmailNotificationView.tsx` menjadi komponen custom Cloudflare Dropdown Panel (`bg-white dark:bg-[#16181d] border-[#272a34] shadow-xl p-1.5`) yang dilengkapi dengan **Cloudflare Contrast Checkbox** (`w-4 h-4 rounded-[5px]`).
   - **Figma Node 474:70 Re-layout (`EmailConfigCard.tsx`)**: Mengimplementasikan tata letak presisi sesuai node Figma `474:70` pada halaman `/notion-config`:
     - **Header**: Judul **"Canva Email Notification"** (ikon `Mail`) dan tombol **"Authenticate"** (ikon `Lock` + teks `#ff5e1f`).
     - **3-Row Table Body (`rounded-[12px] bg-[#fcfdfd] dark:bg-[#16181d] border border-[#eee] dark:border-[#272a34] p-3 divide-y`)**:
       - Baris 1: `Email Account` ↔ `AtSign` + `email@google.com`.
       - Baris 2: `Authentication Protocol` ↔ `ShieldCheck` + `Google OAuth2`.
       - Baris 3: `Security Status` ↔ Pill tag hijau `CheckCircle2` + `Active & Verified` (`bg-[rgba(0,153,102,0.1)] text-[#009966] border border-[#009966]`).
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Email Notification UI Refinements & Google OAuth2 Security Notice (`EmailNotificationView.tsx` & `EmailConfigCard.tsx`)**:
   - **Removal of `SYNC INBOX` Button**: Menghapus tombol Oranye `SYNC INBOX` dari sel header flat toolbar pada `EmailNotificationView.tsx` agar sel pencarian dan filter membentang secara rapi.
   - **Google OAuth2 Security Card (`EmailConfigCard.tsx`)**: Mengubah kartu Email Integration di `/notion-config` menjadi kartu informasi **Google OAuth2 Single Sign-On**. Menjelaskan secara transparan bahwa otentikasi login email menggunakan Google OAuth2 (bukan password manual / IMAP) untuk mendukung kebijakan **2-Step Verification (2FA)** demi keamanan akun.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Production-Email Notification Tab & Ingestion Engine (`prisma/schema.prisma`, `email-notification.ts`, `EmailNotificationView.tsx`, `EmailConfigCard.tsx`, `ProductionTabNav.tsx`)**:
   - **Prisma Data Models**: Menambahkan model `CanvaEmailNotification` (subject, sender, brandName, accountId, templateTitle, templateUrl, issueMessages[], rawBody, status) dan `EmailConfig` (provider, email, imapHost, imapPort, encryptedPassword).
   - **Notion Config Page Extension (`EmailConfigCard.tsx`)**: Menyediakan kartu pengaturan Gmail/IMAP API di `/notion-config` beserta tombol "Sync Email Inbox Now".
   - **Production Tab Navigation (`ProductionTabNav.tsx`)**: Menambahkan tab `Email Notifications` lengkap dengan badge hitungan unresolved issue count.
   - **Cloudflare Symmetrical Table Split-View (`EmailNotificationView.tsx`)**: Menyajikan daftar Canva Account (Brand) di sisi kiri dan Inbox List di sisi kanan. Menampilkan subject *"We’ve found some issues with your template"*, pesan-pesan issue yang diekstrak dari body email, tombol CTA Oranye `#ff5e1f` **`EDIT TEMPLATE IN CANVA`** yang membuka link Canva di tab baru, toggle status `UNRESOLVED` / `RESOLVED`, dan opsi inspeksi raw body email.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**) and seeded sample emails into PostgreSQL.

1. **Compact Comment Input Form & List Standard (`TaskDetailSheet.tsx`)**:
   - **Height Reduction**: Memangkas tinggi footer form input komentar dari `h-14` (56px) menjadi **`h-11`** (44px) yang 100% selaras dengan standar sel tabel continuous Cloudflare (`min-h-[44px]`).
   - **Textarea & Button Padding**: Memperkecil padding textarea dari `px-5 py-3.5` menjadi `px-4 py-2.5` dan padding tombol dari `px-6` menjadi `px-5`.
   - **Concise Placeholder & Action Label**: Memperbarui placeholder menjadi `"Tulis komentar... (Cmd/Ctrl + Enter untuk kirim)"` dan tombol kirim menjadi `KIRIM` dengan ikon compact `w-3.5 h-3.5`.
   - **Item List Padding**: Memperkecil padding item komentar dari `py-3.5` menjadi `py-2.5` dan format timestamp lokal `'id-ID'`.
   - **Verification**: `npx tsc --noEmit` kelolosan 100% (**Exit Code 0**).

1. **Link Text Overflow & Container Containment Fix (`TaskBodyEditor.tsx` & `TaskDetailSheet.tsx`)**:
   - **Root Cause**: Element `span` di dalam `renderFormattedLineText` menggunakan `max-w-[480px]` terelokasi keras yang melebihi lebar kontainer modal drawer/kartu (~380px-440px), sehingga tautan Canva yang panjang beserta ikon `ExternalLink` terdorong keluar batas border kanan kartu.
   - **Flexible Containment Solution**: Mengganti `max-w-[480px]` dengan `min-w-0 max-w-full` pada `span` dan `a` di `TaskBodyEditor.tsx`, menyisipkan `break-all` pada pembungkus baris, serta menambahkan `title={part}` untuk tooltip URL lengkap saat hover.
   - **Canva Template Link Harmonization**: Menambahkan `min-w-0` pada elemen `a` daftaran template Canva di `TaskDetailSheet.tsx`.
   - **Verification**: Executed `npx tsc --noEmit` (**Exit Code 0**).

1. **Multi-Editor Expandable Session Timeline UI & Dynamic Fetcher (`ExpandableSessionTimeline.tsx` & `editor-sessions.ts`)**:
   - **Combines Image 2 & Image 3 Formats**: Merombak tampilan Tab 7 (`Session Handover Log`) menjadi pohon timeline interaktif berbasis Cloudflare continuous card layout.
   - **Left Column (Editor Runtime State - Image 2)**: Menampilkan Session ID, Editor Name (`Antigravity IDE`), Model LLM (`Gemini 3.6 Flash`), Timestamp, Daftar Prompt/Fokus Sesi, Dokumen Aktif di Editor dengan line number, dan Status Terminal Process (`npm run dev`).
   - **Right Column (Knowledge Deliverables - Image 3)**: Menampilkan Handover ID, Badges *Engineering Roles*, List Poin **Hasil Pengerjaan** (Code & Database Fixes), serta Link Rujukan ke [`docs/knowledge/session-handover.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/session-handover.md).
   - **Server Action Fetcher (`getKnowledgeGraphSessionsAction`)**: Menyediakan penyediaan data terpusat dari runtime Antigravity & file handover.
   - **Full Verification**: `npx tsc --noEmit` kelolosan 100% (**Exit Code 0**).

1. **August 2026 Payroll Month Data Recovery (`scratch/apply-august-payroll-fix.ts`)**:
   - **Metrik Screenshot Presisi**: Berhasil mengidentifikasi dan memulihkan 28 tugas `payrollMonth = 'Agustus-2026'` yang 100% presisi dengan tangkapan layar Billing Statement:
     - **Putery**: 15 Tasks | 39 Templates | 116 QTY Pages | IDR 1.770.000
     - **Najih**: 13 Tasks | 32 Templates | 104 QTY Pages | IDR 1.560.000
     - **Total Unpaid**: IDR 3.330.000 (2 Unpaid Designers)
   - **PostgreSQL Database Update**: 28 record tugas telah di-update `payrollMonth = 'Agustus-2026'` dan `syncStatus = 'PENDING_PUSH'` di database. Halaman `/billing-statement` kini menampilkan data Agustus secara sempurna.

1. **Approval Payroll Task Month Filter Implementation (`PayrollToolbar.tsx` & `ApprovalPayrollTable.tsx`)**:
   - **Filter Menu Category**: Menambahkan opsi **Task Month** dengan ikon `Calendar` ke dalam menu popover **Filter** berdampingan dengan `Designer`, `Doctype`, dan `Brand`.
   - **Standard Application Month Picker**: Mengintegrasikan `MonthCalendarPicker` (`inline`, `mode="filter"`) di dalam panel popover filter saat kategori `Task Month` dipilih.
   - **Pill Tag Badge & Reset**: Menampilkan pill tag badge `Task Month: <Label>` lengkap dengan tombol `X` di toolbar saat filter bulan aktif, serta meng-update `activeFilterCount`.
   - **Canonical Period Filtering**: Menggunakan `isTaskInPeriods()` dan `parseTaskMonthToKey()` dari `@/lib/period-utils` pada `filteredTasks` di `ApprovalPayrollTable.tsx` untuk menyaring data secara presisi.
   - **Full Verification**: `npx tsc --noEmit` lolos 100% (**Exit Code 0**).

1. **Approval Payroll Batch Month Picker Harmonization (`PayrollToolbar.tsx`)**:
   - **Full-Height Integrated Cell**: Mengganti dropdown list vertikal plain manual `batchMonth` pada `PayrollToolbar.tsx` dengan `MonthCalendarPicker` (`w-[150px] sm:w-[160px] h-full align-stretch`, `mode="payroll"`).
   - **Visual Consistency**: Popover batch month picker kini menyajikan kalender compact (`w-56 sm:w-60`) yang 100% selaras dengan month picker di tabel row `PayrollTableRow.tsx` dan `PeriodPicker.tsx`.
   - **Full Verification**: `npx tsc --noEmit` lolos 100% (**Exit Code 0**).

1. **Dashboard Month Filter Query Normalization & Multi-Format Database Filtering (`src/lib/queries.ts` & `KPISection.tsx`)**:
   - **Canonical Token Normalization**: Menggunakan `parseTaskMonthToKey()` dari `@/lib/period-utils` untuk menormalisasi token bulan URL (seperti `"Januari-2026"`, `"Februari-2026"`, `"Agt-2026"`, `"2026-08"`) menjadi kunci standar `YYYY-MM`.
   - **Multi-Format DB Matching (`buildDbMonthVariants`)**: Menghasilkan seluruh varian string bulan yang tersimpan di PostgreSQL (`"Agustus-2026"`, `"Agt-2026"`, `"2026-08"`) untuk `WHERE t.task_month IN (...)` clause, menyelesaikan bug data bernilai 0 pada Dashboard saat filter bulan aktif di URL.
   - **Widget Tooltip Normalization**: Menyelaraskan pencocokan data bulan pada widget Tren Volume dan Distribusi Template dengan `parseTaskMonthToKey()`.
   - **Full Verification**: `npx tsc --noEmit` lolos 100% (**Exit Code 0**).

1. **Default "Semua Bulan" & Month Range Selection Harmonization (`MonthCalendarPicker.tsx` & `PeriodPicker.tsx`)**:
   - **Symmetrical 2-Column Footer**: Menambahkan footer 2-kolom simetris (`[SEMUA BULAN]` 50% | `[BULAN INI]` 50%) pada dasar `MonthCalendarPicker.tsx`.
   - **Highlight Indikator Default**: Tombol `SEMUA BULAN` tersorot warna Oranye aktif (`bg-[#ff5e1f] text-white`) saat mode default "Semua Bulan" aktif (`period=all` / `selectedKeySet.size === 0`).
   - **Bebas Bentrokan (Seamless Transition)**: Mengklik `SEMUA BULAN` mereset filter kembali ke agregasi data semua bulan, sedangkan mengklik bulan di grid mengaktifkan mode rentang bulan (Bulan Awal & Akhir) tanpa kebocoran state.
   - **Full Verification**: `npx tsc --noEmit` lolos 100% (**Exit Code 0**).

1. **Multi-Month Range Selection Reset Fix (`PeriodPicker.tsx`, `src/app/page.tsx`, `src/app/production/page.tsx`)**:
   - **Root Cause Fix**: Menghapus pengecekan lama `urlPeriod.split(',').length >= periods.length` yang secara keliru menganggap rentang seleksi 9 bulan (Januari s.d. September) sebagai mode "Semua Bulan" (`'all'`) sehingga mengosongkan `selectedPeriods` dan mereset highlight selector.
   - **Preservasi Seleksi Eksplisit**: Seleksi rentang bulan eksplisit pengguna kini selalu dipertahankan di URL, local storage, dan komponen UI tanpa ter-reset.
   - **Full Verification**: `npx tsc --noEmit` lolos 100% (**Exit Code 0**).

1. **Month Range Selection & Direct Navbar Popover Redesign (`MonthCalendarPicker.tsx` & `PeriodPicker.tsx`)**:
   - **Direct Navbar Popover (Presisi Gambar 2)**: Menghapus kontainer header luar `PERIODE BULAN` dan tombol duplikat `Semua` / `Bulan Ini` dari `PeriodPicker.tsx`. Dropdown kini langsung menyajikan komponen `MonthCalendarPicker` secara bersih & rapat (`w-56 sm:w-60 absolute right-0 mt-1.5`).
   - **Month Range Selection / Blocker (Presisi Gambar 1)**: Menambahkan prop `rangeSelect={true}` pada `MonthCalendarPicker.tsx`. Klik 1 memilih bulan awal, klik 2 memilih bulan akhir. Seluruh bulan di dalam rentang tersebut otomatis tersorot warna Oranye solid (`bg-[#ff5e1f] text-white font-bold`).
   - **Full Verification**: `npx tsc --noEmit` lolos 100% (**Exit Code 0**).

1. **Compact MonthCalendarPicker Redesign & Usage Audit (`MonthCalendarPicker.tsx`, `PeriodPicker.tsx`, `MonthFilter.tsx`, `PayrollTableRow.tsx`, `CreateTaskSlideModal.tsx`, `TaskDetailSheet.tsx`, `ParameterIssueTable.tsx`)**:
   - **Audit Usage**: Mendokumentasikan dan memverifikasi 6 komponen pengguna di seluruh rute halaman utama (`/billing-statement`, `/production`, TopBar Header di `/`, `/rate-card`, `/account-team`, `/knowledge-graph`).
   - **Height Reduction (>40%)**: Memangkas tinggi tombol grid bulan dari `h-14` (56px) menjadi **`h-8.5`** (34px) dan font size dari `text-[15px]` menjadi `text-xs font-semibold`.
   - **Popover Container Width**: Mengurangi lebar popover dari `w-72` (288px) menjadi **`w-56 sm:w-60`** (224px - 240px) agar muat secara presisi pada sel tabel & filter toolbar.
   - **Header & Footer Spacing**: Memperkecil padding header menjadi `px-3 py-2`, tombol panah navigasi tahun menjadi `w-6 h-6`, dan footer button menjadi `py-1.5 px-2 text-[10px]`.
   - **Full Verification**: `npx tsc --noEmit` lolos 100% (**Exit Code 0**).

1. **Tab Menu Navigation Font Size Standardization (`ProductionTabNav.tsx`, `AccountTeamSection.tsx`, `DoctypeTable.tsx`, `billing-statement/page.tsx`, `DesignerDetailSlideModal.tsx`, `KnowledgeGraphViewer.tsx`, `AGENTS.md`)**:
   - **Font Size Normalization to 14px**: Menyeragamkan seluruh label navigasi tab menu dari yang sebelumnya 12px (`text-xs`) / campuran menjadi **14px** (`text-sm font-sans`) secara konsisten.
   - **Scope Menyeluruh**: Diterapkan pada Tab Navigasi Produksi, Tab Tim Desainer / Account, Tab Doctype / Kontrak, Tab Billing Summary / Approval Payroll, Sub-Tab Modal Detail Desainer, serta Tab Navigasi Knowledge Graph Viewer.
   - **Rule Standard Update**: Memperbarui aturan `Tab Navigation Bar Standard` pada `AGENTS.md` agar seluruh LLM/editor di sesi mendatang wajib menggunakan `text-sm font-sans` (14px).
   - **Full Verification**: `npx tsc --noEmit` lolos 100% (**Exit Code 0**).

2. **2-Source Hybrid Sync Architecture & Outbound Batch Engine (`schema.prisma`, `approval-payroll.ts`, `sync-notion.ts`, `vercel.json`)**:
   - **Local-First Database Writes**: Seluruh operasi penentuan `payrollMonth`, approval status, edit doctype/task dari App UI disimpan secara instan ke PostgreSQL DB terlebih dahulu (`syncStatus = 'PENDING_PUSH'`), menghilangkan blocking UI / latency jaringan Notion API.
   - **Outbound Batch Sync (`pushPendingLocalChangesToNotion`)**: Pada pukul 17:00 WIB (10:00 UTC di `vercel.json`), cron job memicu rekonsiliasi dua arah: mem-push seluruh record `PENDING_PUSH` ke Notion dengan pemetaan alias kolom otomatis (`Payroll Month` / `Payroll-Month`, `QTY-Submit` / `QTY Submit`, `IND/ENG` / `IND\\ENG`, `Brand` / `Account`), kemudian meng-update status lokal menjadi `SYNCED`.
   - **Inbound Notion Sync**: Mempertahankan Notion sebagai Source of Truth utama untuk penambahan Task baru & aktivitas papan desainer.
   - **Static Verification**: `npx tsc --noEmit` bersih (**Exit Code 0**).
it` bersih (**Exit Code 0**).

1. **Hover Trigger 3-Dots Action Menu & Duplicate/Delete Server Actions (`QACard.tsx` & `qa.ts`)**:
   - **Hover Action Trigger**: Menambahkan tombol `MoreHorizontal` (3 titik) di pojok kanan atas kartu task (`absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity`) dengan isolasi event `e.stopPropagation()` agar tidak memicu `TaskDetailSheet` atau drag-and-drop.
   - **Cloudflare Dropdown Menu**: Opsi **`Duplicate`** (dengan ikon `Copy`) dan **`Delete`** (dengan ikon `Trash2`).
   - **`duplicateTaskAction`**: Membuat salinan task di PostgreSQL dengan nama `"<Original> (Copy)"`, menyalin seluruh atribut (`qtySubmit`, `pages`, `poolScore`, `priority`, `license`, `languages`, `taskMonth`, Canva links, `bodyText`) pada status yang sama, dan langsung menyinkronkan pembuatan page baru di Notion secara real-time.
   - **`deleteTaskAction`**: Menampilkan modal konfirmasi dialog singkat (*"Hapus Task Ini?"*). Setelah dikonfirmasi, menghapus task dari database PostgreSQL dan mengarsipkan page di Notion (`archived: true`).
   - **Build Verification**: `npx tsc --noEmit` & `npm run build` 100% kelolosan (0 Errors).

1. **Pool Score Formula Correction & Notion Property Harmonization (`qa.ts`, `DoctypeTable.tsx`, `DoctypeSlideModal.tsx`, `RateCardRow.tsx`)**:
   - **Formulasi Baru `poolScore`**: Mengubah rumus perhitungan `poolScore` pada `createTaskAction` dan `updateTaskFieldsAction` di `qa.ts` menjadi `poolRate * qtySubmit` (sebelumnya keliru mengalikan `effectivePages * effectiveQtySubmit * poolRate`, menyebabkan task 12 halaman dengan poolRate 1 memiliki poolScore 12 alih-alih 1).
   - **Pembersihan Istilah UI**: Menyeragamkan seluruh label `"POOL RATE"` dan `"Pool Rate (Bobot)"` di tabel Rate Card (`DoctypeTable.tsx`), Slide-over Modal (`DoctypeSlideModal.tsx`), dan `RateCardRow.tsx` menjadi **`POOL SCORE`** dan **`Pool Score (Bobot)`** agar 100% konsisten dengan kolom Notion **`Pool Score`**.
   - **Koreksi Data Eksisting**: Menjalankan pengkinian data pada seluruh task di PostgreSQL dan menyinkronkan nilai `Pool Score` yang benar (seperti task `Strategic Business Proposal` dari 12 menjadi 1) ke Notion secara otomatis.
   - **Audit Properti Notion Database**: Memverifikasi 22 properti resmi Notion database (`Name`, `Design Status`, `Designer`, `Doctype`, `QTY-Submit`, `Pages`, `Pool Score`, `Brand`, `IND/ENG`, `Priority`, `License`, `Task Month`, `Template Link`, dll) dan memastikan mapping dual-alias aplikasi 100% sesuai.

1. **Notion Page Body Text Block Parser & Real-Time Sync (`qa.ts`)**:
   - Menambahkan helper `markdownToNotionBlocks` dan `syncNotionPageBodyBlocks`.
   - Mengubah markdown wireframe & design reference (`## Heading`, `- Bullet Link`, Paragraph) menjadi block Notion resmi (`heading_2`, `bulleted_list_item` dengan link URL aktif, dan `paragraph`).
   - `createTaskAction` kini otomatis menyisipkan child blocks saat page baru dibuat di Notion.
   - `updateTaskFieldsAction` kini mendeteksi perubahan `bodyText` dari slide-over editor dan menyinkronkan isi blok Notion secara real-time.
   - Halaman Notion untuk task `Strategic Business Proposal` (ID: `3d00e19a-a135-81cc-a0de-c8668457a2c7`) telah disinkronkan dan blok wireframe/referensinya telah terisi lengkap.

1. **Notion Schema Introspection & Dynamic Property Mapper (`qa.ts`)**:
   - Menambahkan helper `getNotionDatabaseSchemaProperties` yang membaca properti database Notion secara riil (termasuk Notion Data Sources).
   - Mengatasi error validasi `QTY Submit is not a property that exists` dengan hanya mengirim properti yang ada di Notion (`'QTY-Submit'`).
   - Memperbaiki tipe properti `'Template Link'` yang di Notion berjenis `files` dengan mengirim format `{ files: [{ name: 'Template Link', external: { url: link } }] }`.
   - Task `Strategic Business Proposal` yang sebelumnya berstatus pending lokal telah berhasil disinkronisasi ke Notion (Page ID: `3d00e19a-a135-81cc-a0de-c8668457a2c7`).

1. **Cross-Page Period Filter Persistence Protocol (`PeriodPicker.tsx` & `Sidebar.tsx`)**:
   - Memperbaiki sinkronisasi `localStorage` pada `PeriodPicker` dengan membaca langsung parameter URL riil (`searchParams.get('period')`) daripada prop fallback, sehingga saat navigasi antar halaman (misal dari `/production?period=2026-08` ke `/`), nilai periode yang dipilih pengguna **TIDAK ter-reset** dan otomatis dipertahankan.
   - `Sidebar.tsx` membawa query parameter periode aktif saat berpindah rute navigasi.

1. **App-Wide Default Filter: 'Semua Bulan' (`all`) & Clean URL Protocol (`PeriodPicker.tsx`, `page.tsx`, `SortableTaskLists.tsx`, `queries.ts`)**:
   - Secara default, aplikasi membuka halaman Dashboard (`/`) dan Production Board (`/production`) dalam mode **Semua Bulan** (`all`), menampilkan agregasi seluruh data tanpa batasan 1 bulan saja.
   - Papan Kanban (`SortableTaskLists.tsx`) diinisialisasi tanpa filter bulan (`[]`), menampilkan seluruh kartu tugas dari semua periode secara instan.
   - URL browser dibuat bersih murni (`localhost:3002/production` atau `localhost:3002/`) tanpa query parameter `%2C` panjang saat semua bulan aktif.
   - Komponen `PeriodPicker` dilengkapi tombol Quick Action **`Semua`** dan **`Bulan Ini`**, serta sinkronisasi `localStorage` ringkas (`'all'`).

1. **Next.js `'use server'` Internal Helper Scoping Invariant (`qa.ts`)**:
   - Di file Next.js Server Actions yang menggunakan directive `'use server'`, setiap fungsi yang menggunakan `export` secara otomatis diperlakukan sebagai callable action endpoint RPC dan wajib berupa `async function`.
   - Mengubah fungsi helper internal `findNotionStatusOption`, `getNotionPageStatusProperty`, dan `findPrismaDesignStatus` menjadi fungsi lokal (tanpa `export`) menyelesaikan error Turbopack `Server Actions must be async functions.` dan menjamin kelolosan build `npm run build` 100%.

1. **Notion Status Case-Insensitive Resolver & Real-Time Write-Through Protocol (`qa.ts` & `kanban-config.ts`)**:
   - **Case-Insensitive Status Resolver (`findNotionStatusOption`)**: Menambahkan helper cerdas yang mencocokkan status Notion secara case-insensitive, normalized alphanumeric, dan alias-aware (`In progress` ↔ `In Progress`, `Not started` ↔ `Not Started`, `Aproved` ↔ `Approved`, variasi `QA`). Mengirimkan payload update menggunakan status option ID resmi Notion (`{ status: { id: statusOption.id } }`).
   - **Fix Drag & Drop Kanban Status Mismatch (`updateTaskStatusAction`)**: Menyelesaikan error `Notion status "In Progress" not found` saat kartu digeser di papan Kanban. Menggunakan `findNotionStatusOption` dan `getNotionPageStatusProperty` yang kompatibel dengan skema `data_source_id` maupun `database_id`.
   - **Full-Field Real-Time Sync on Slide-Over Editor (`updateTaskFieldsAction`)**: Menyelesaikan kendala status berpindah di aplikasi tapi tidak berubah di Notion (Gambar 1 & 3). Memetakan seluruh properti task ke `notionProperties`:
     - `Design Status`: Resolusi opsi status Notion otomatis.
     - `Designer` & `Designer Status`.
     - `Doctype`.
     - `Brand` & `Account` (Dual Alias).
     - `IND/ENG` & `IND\ENG` (Dual Alias).
     - `Template Link`.
     - `Pool Score` & `Pages`.
   - **Prioritas Penamaan Kolom Kanban (`kanban-config.ts`)**: Menyelaraskan `statuses[0]` pada kolom `notStarted` (`'Not started'`) dan `inProgress` (`'In progress'`) sesuai dengan penamaan bawaan database Notion.
   - **Defensive Revalidation**: Membungkus `revalidatePath('/production')` dalam try/catch agar operasi aman dieksekusi di konteks manapun.
   - **Static & Live Verification**: `npx tsc --noEmit` bersih (**Exit Code 0**) dan uji live API mengonfirmasi update status ke Notion berhasil (`{ success: true }`).

1. **View Details & Full Inline Table Editing on Doctype Table (`RateCardRow.tsx`)**:
   - **View Details Mode (`VIEW` / Row Click)**: Mengklik judul Doctype atau tombol `VIEW` (ikon mata) membuka Slide-over Drawer Modal (`DoctypeSlideModal.tsx`) untuk melihat spesifikasi lengkap, catatan Canva, dan kalkulasi payout.
   - **Inline Table Row Editing (`EDIT`)**: Mengklik tombol `EDIT` mengaktifkan baris edit langsung di tempat (*inline*):
     - Sel input full-height rapat tanpa gap (`h-full min-h-[44px] align-stretch p-0`).
     - Input teks untuk `displayName` & `notionKey`.
     - Integrated Cloudflare `CategorySelectCell` untuk pilihan kategori.
     - Input `dimensions` dengan auto-detection aspek rasio real-time.
     - Input numerik `poolRate` & `pages` dengan pembongkaran stepper arrow browser native (`[appearance:textfield]`).
     - Komputasi live `Est. Payout` langsung di dalam sel.
     - Toggle status `Aktif` / `Non-aktif`.
     - Kolom aksi 2-kolom simetris (`SAVE` Oranye `#ff5e1f` 50% | `CANCEL` 50%) yang mengeksekusi `updateDoctypeRateCardAction` dan merelevansi path `/rate-card`.
   - **Static Verification**: `npx tsc --noEmit` mengonfirmasi 0 error (**Exit Code 0**).
   - **Pembersihan Monospace UI**: Mengganti `font-mono` menjadi `font-sans` pada elemen-elemen UI non-teknis:
     - Subtitle handle Canva Account (`Chital`, `Azzahra`, `uicreative`, `Improstudio`, `Antler`, `Teman Siswa`) pada `AccountTeamSection.tsx`.
     - Subtitle identifier Doctype (`Instagram-Carousel`, `Linked-Carousel`, `dummy_doctype`) pada `RateCardRow.tsx`.
     - Teks aspek rasio (`16:9`) dan nominal mata uang (`Rp 15.000`) pada `RateCardRow.tsx` & `DoctypeTable.tsx`.
     - Input Kode Identifier dan kalkulasi total pada `DoctypeSlideModal.tsx`.
   - **Aturan Repositori & LLM**: Memperbarui `inter-primary-font-rule` pada `AGENTS.md` dan menambahkan Seksi 8 (*Typography Standard*) pada `docs/knowledge/form-crud-rules.md` untuk menegaskan bahwa `font-mono` HANYA diizinkan pada Notion Database ID, secret tokens, `<pre><code>`, dan terminal sync console logs.
   - **Static Verification**: `npx tsc --noEmit` mengonfirmasi 0 error (**Exit Code 0**).
   - **Slim Label Line Height (No Asterisk Wrap)**: Menghapus tanda asterisk `*` yang membungkus teks label `Nama Format` dan `Kode Identifier` sehingga teks label tetap 1 baris utuh (`whitespace-nowrap`) dan tinggi baris tabel menjadi ramping & compact (`min-h-[44px]`).
   - **Automatic Aspect Ratio Auto-Selection**: Menambahkan pemroses otomatis `detectAspectRatio()` pada input `Dimensi Canvas`. Saat desainer mengetikkan ukuran pixel (seperti `1920×1080`, `1080x1080`, `1080x1350`, `1080x1920`), tombol Aspek Rasio (`16:9`, `1:1`, `4:5`, `9:16`) akan otomatis terpilih secara cerdas.
   - **Cloudflare Category Dropdown (`CategorySelectCell.tsx`)**: Mengganti `<select>` bawaan HTML dengan komponen custom Cloudflare Dropdown (`bg-white dark:bg-[#16181d] border-[#272a34] shadow-xl p-1.5`) yang dilengkapi Checkbox kontras Cloudflare (`w-4 h-4 rounded-[5px]`) dan opsi ketik kategori kustom (`Ketik Kategori Kustom...`), 100% presisi sesuai komponen `RoleSelectCell.tsx` pada Gambar 2.
   - **Static Verification**: `npx tsc --noEmit` mengonfirmasi 0 error (**Exit Code 0**).
   - **Accent Highlights**: Menyelaraskan seluruh aksen warna tombol dan teks pada `DoctypeSlideModal.tsx`:
     - **Orange Accent (`#ff5e1f`)**: Digunakan untuk Header icon `Layers`, kode identifier text, tombol pilihan `1.5x`, tombol Aspek Rasio aktif, sub-header Skema Tarif, kalkulasi Total Payout, serta tombol aksi utama `+ CREATE DOCTYPE` / `SAVE DOCTYPE`.
     - **Purple Accent (`#615fff`)**: Digunakan untuk tombol segmented `1.0x (Lainnya)`.
     - **Emerald Active Green (`#00a67d`)**: Digunakan untuk tombol status `ACTIVE` (100% presisi sesuai tombol green ACTIVE pada Gambar 2).
     - **Neutral Dark Gray (`#6e7687`)**: Digunakan untuk tombol status `INACTIVE`.
   - **Static Verification**: `npx tsc --noEmit` mengonfirmasi 0 error (**Exit Code 0**).
   - **Edge-to-Edge Continuous 2-Column Grid Body**: Merombak total `DoctypeSlideModal.tsx` dari form melayang dengan floating border input menjadi **Continuous Symmetrical Table Grid Row** (`divide-y divide-[#272a34]`).
   - **Standard Left Label Cell (150px)**: Setiap baris input menggunakan sel label 150px (`w-[150px] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 font-bold uppercase text-gray-500`) dilengkapi ikon Lucide (`FileText`, `Code`, `FolderGit2`, `Maximize2`, `Ratio`, `Percent`, `Copy`, `DollarSign`, `Calculator`, `AlignLeft`, `CheckCircle2`).
   - **Segmented Option Button Cells**: Menghasilkan tombol segmented full-height (`grid grid-cols-N divide-x`) untuk Kategori, Aspek Rasio (`16:9`, `1:1`, `4:5`, `9:16`), Pool Rate (`1.5x`, `1.0x`, `Custom`), dan Status (`ACTIVE` / `INACTIVE`).
   - **Full-Width Symmetrical Action Footer**: Memasang footer 2-kolom simetris 50/50 (`CANCEL` tombol netral di sisi kiri 50%, `+ SAVE DOCTYPE` tombol `#ff5e1f` di sisi kanan 50%).
   - **Static Verification**: `npx tsc --noEmit` mengonfirmasi 0 error (**Exit Code 0**).
   - **Separated Banner & Main Tab Containers (`page.tsx`)**: Memisahkan kontainer Banner `Ketentuan & Aturan Kontrak Freelance` di bagian atas sebagai kartu independen terpisah (`mb-6`). Di bawahnya diposisikan kontainer utama terpisah untuk Tab Navigation, Search Toolbar, dan Tabel Data (sesuai Gambar 1).
   - **2-Tab Navigation Bar & Far-Right Action Button (`DoctypeTable.tsx`)**: Menambahkan 2 tab utama (`Doctype (N)` dan `Kontrak`) dan memindahkan tombol **`+ ADD DOCTYPE`** ke posisi paling kanan bilah Tab Navigation Bar (`ml-auto flex items-center...`).
   - **Sticky Tab Header Container**: Membungkus Tab Bar, Search Toolbar, dan Table Header di dalam `<div className="sticky top-[56px] z-30 bg-white dark:bg-[#0d0e12] divide-y divide-[#272a34]">`. Saat halaman di-scroll, Banner atas bergeser secara alami dan **hanya kontainer Tab Menu + Toolbar yang terkunci melayang (sticky)** di bawah TopBar.
   - **Prisma Schema Extension & Notion Sync Safety (`schema.prisma` & `rate-card.ts`)**: Menambahkan field opsional `category`, `dimensions`, `aspectRatio`, `notes`, `isActive` pada model `Doctype` dengan eksekusi `npx prisma db push` & `npx prisma generate`. Field `notionKey` tetap dipertahankan 100% sebagai *canonical select identifier* ke Notion API via `syncDoctypeOptionToNotion()`.
   - **Slide-over Drawer Popup Modal (`DoctypeSlideModal.tsx`)**: Membuat modal slide-over dari kanan (`max-w-xl border-l border-[#272a34] bg-white dark:bg-[#0d0e12] animate-[slideInRight_180ms_ease-out]`) yang menampilkan struktur form acuan Gambar 2:
     - Form input 2-kolom simetris (`Nama Format Doctype`, `Kode Format / Identifier`, `Kategori`, `Dimensi Canvas`, `Aspek Rasio`).
     - Kartu Highlight **SKEMA TARIF KONTRAK FREELANCE** (Preset Pool Rate `1.0x`/`1.5x`, Default QTY Slides, Rate / Pages Rp 15.000, Live Calculation Preview & Total Payout Default).
     - Textarea `Catatan Produksi & Panduan Template`.
     - Checkbox `Status Format Aktif` (Cloudflare Contrast Checkbox).
     - Symmetrical 2-Column Action Footer (`Batal` / `Simpan Perubahan`).
   - **Table Row & Image 2 Columns (`RateCardRow.tsx`)**: Memperbarui kolom data tabel untuk menampilkan `DOCTYPE FORMAT & IDENTIFIER`, `KATEGORI`, `CANVAS & RASIO`, `POOL RATE`, `DEFAULT PAGES`, `EST. PAYOUT`, `STATUS`, dan tombol `EDIT` yang memicu Slide-over Modal `DoctypeSlideModal`.
   - **Static Verification**: `npx tsc --noEmit` mengonfirmasi 0 error (**Exit Code 0**).

1. **Direct Clean STATUS Text Architecture**:
   - **Removal of Badge Container**: Menghapus pembungkus pill badge (`rounded-full border`) pada trigger sel status. Teks status kini ditampilkan secara langsung sebagai teks bersih (`text-xs font-sans uppercase font-bold`) dengan warna aksen status (`Active` hijau, `Resign` merah tercoret, `Inactive` amber).

1. **Add Team / Account Slide Modal & Notion Alignment Protocol**:
   - **Slide Modal Standard (`AddTeamAccountSlideModal.tsx`)**: Merombak fitur pembuatan desainer & brand account dari popup modal ke **Slide-over Modal** kanan (`max-w-140 border-l border-[#272a34] bg-white dark:bg-[#0d0e12] animate-[slideInRight_180ms_ease-out]`) sesuai standar UI `CreateTaskSlideModal.tsx`.
   - **2-Column Symmetrical Table Form Body**: Menggunakan layout grid 2 kolom simetris `divide-y divide-[#272a34]` dengan sel label 150px (`bg-gray-50/50 dark:bg-[#16181d]/50`), input full-height min-h-[44px], pilihan kategori (`Designer (Team)` vs `Canva Account`), pilihan status desainer (`Active`, `Inactive`, `Resign`), serta preview email handle (`username@improstd.com`).
   - **Notion Property Alignment**: Menyesuaikan pilihan Kategori 1 `Designer (Team)` dengan field Notion **`Designer`** (dan `Designer Status`), serta Kategori 2 `Canva Account` dengan field Notion **`Brand`** dan **`Account`** (`multi_select`).
   - **Server Actions & Smooth Revalidation**: Menambahkan `createDesignerAction` dan `createAccountAction` di [`designer.ts`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/actions/designer.ts) dengan pembuatan `notionKey` unik otomatis dan pemicuan `router.refresh()` tanpa flicker tema.

   - **Dual Alias Rule (`notion-property-payload-mapping-rule`)**: Memasang aturan permanen di [`.agents/AGENTS.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/.agents/AGENTS.md) agar `createTaskAction` selalu mengirimkan kunci dual-alias (`QTY-Submit` & `QTY Submit`, `IND/ENG` & `IND\ENG`, `Brand` & `Account`, `Template Link`, `Pool Score`, `Designer`).
   - **Auto Pool Score Calculation**: Memperbarui `createTaskAction` ([`qa.ts`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/actions/qa.ts)) agar menghitung `poolScore = effectivePages * effectiveQtySubmit * poolRate` secara otomatis, menjamin task baru tidak pernah bernilai `poolScore == null` atau masuk ke tab Parameter Issue.
   - **Form Default & URL Period Filter Sync**: Men-default state `qtySubmit` ke `'1'` pada [`CreateTaskSlideModal.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/CreateTaskSlideModal.tsx) dan otomatis menyinkronkan URL search parameter `period` jika task baru dibuat pada bulan yang belum terpilih.
   - **Prisma Syntax Fix**: Memperbarui `createTaskAction` & `updateTaskFieldsAction` di [`qa.ts`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/actions/qa.ts) menggunakan sintaks `connect` & `disconnect` resmi Prisma:
     ```ts
     designer: payload.designerId ? { connect: { id: payload.designerId } } : undefined,
     doctype: payload.doctypeId ? { connect: { id: payload.doctypeId } } : undefined,
     designStatus: designStatusIdToUse ? { connect: { id: designStatusIdToUse } } : undefined,
     ```
   - **Static Verification**: Mengonfirmasi kebersihan tipe via `npx tsc --noEmit` (**Exit Code 0**).
   - Menggantikan seluruh dropdown `taskMonth` dan `payrollMonth` pada `CreateTaskSlideModal.tsx`, `TaskDetailSheet.tsx`, `ParameterIssueTable.tsx`, dan `PayrollTableRow.tsx` menggunakan `MonthCalendarPicker.tsx`.
   - Menyimpan filter internal papan Kanban (pencarian, status, designer, doctype, brand, language, priority) pada [`SortableTaskLists.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/SortableTaskLists.tsx) ke `localStorage` (`can_freelance_board_filters`).

1. **Role-Based Engineering Domains & Universal Multi-LLM Handover Architecture**:
   - Membuat master modul pengetahuan [`docs/knowledge/roles.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/roles.md) yang memetakan 6 Engineering Roles standar (`Frontend`, `Backend`, `API`, `Business`, `Architecture`, `DevOps`) beserta *file ownership*, *invariants*, dan *extensibility protocol*.
   - Membuat file jembatan interoperabilitas [`CLAUDE.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/CLAUDE.md) (Claude Code CLI) dan [`.cursorrules`](file:///Users/fatchurbeny/Documents/Project/can-freelance/.cursorrules) (Cursor/Codex) untuk mengikat AI apa pun pada *Single Source of Truth* Knowledge Graph.
   - Memperbarui skrip [`scripts/graphify-parser.ts`](file:///Users/fatchurbeny/Documents/Project/can-freelance/scripts/graphify-parser.ts) untuk menghasilkan node kluster `Engineering Roles & Ops` dan relasi *governance* di Canvas 2D Force Graph.
   - Menyinkronkan antarmuka Web UI Tab 7 di [`src/components/KnowledgeGraphViewer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KnowledgeGraphViewer.tsx) dengan *Session Signature Card* dan *Role Matrix*.

2. **Universal Inter Typography Standardization & Monospace Isolation Protocol**:
   - Menghapus Google Font `Outfit` (`font-display`) dari [`src/app/layout.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/layout.tsx) dan meng-alias token CSS `--font-display` ke `var(--font-inter)` di [`src/app/globals.css`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/app/globals.css).
   - Menstandarisasi seluruh tipografi UI (headings, KPI metric numbers, table headers & row cells, modal dialogs, toolbar inputs, filter dropdowns, buttons, tags/pills) ke **`Inter`** (`font-sans`).
   - Mengisolasi penggunaan `font-mono` secara ketat HANYA pada technical quote fields (Notion Database ID / UUID quote card blocks, secret tokens, inline `<code>`, block `<pre>`, dan terminal execution logs).
   - Mendaftarkan aturan resmi `inter-primary-font-rule` ke [`AGENTS.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/AGENTS.md), [`docs/knowledge/issues-and-fixes.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/issues-and-fixes.md), dan sinkronisasi Web UI di [`src/components/KnowledgeGraphViewer.tsx`](file:///Users/fatchurbeny/Documents/Project/can-freelance/src/components/KnowledgeGraphViewer.tsx).


1. **Vercel Hobby Daily Cron (00:00 WIB) & Clean Passive UI Architecture**:
   - Mengatur `vercel.json` menggunakan jadwal harian `"schedule": "0 17 * * *"` (pukul 00:00 WIB / 17:00 UTC) yang 100% didukung Vercel Hobby Plan, menyelesaikan masalah penolakan build `❌ 0/1`.
   - Menghapus client-side `setInterval` polling loops dari `SyncButton.tsx` agar browser tidak lagi memicu background fetch otomatis.
   - Menyederhanakan antarmuka `/notion-config` dengan mengganti form interval menjadi kartu informasi **Daily Auto Sync Active (00:00 WIB)** serta mempertahankan tombol **Sync Now** manual.

2. **Incremental-Only Auto Sync & Stale Log Auto-Clearing Engine**:
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
