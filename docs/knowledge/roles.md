# Modul Pengetahuan: Engineering Roles & Domain Ownership

Dokumen ini mendefinisikan **Standar Peran Rekayasa (*Engineering Roles*)**, kepemilikan file (*file ownership*), batasan lingkup (*invariants*), dan protokol penambahan peran baru pada proyek **CAN-Freelance**. Dokumen ini menjadi pedoman bersama bagi seluruh LLM (**Gemini, Claude, GPT, Codex**) dan Editor (**Antigravity, Claude Code, Cursor, VS Code**).

---

## 🏛️ Daftar Engineering Roles Terdaftar

### 1. 🎨 Frontend & UI/UX Engineer
* **Ikon & Tag**: `🎨 [Frontend & UI/UX]`
* **Ruang Lingkup File**:
  - `src/components/**` (Seluruh komponen React & widget UI)
  - `src/app/**/page.tsx` (Rute dan halaman tampilan App Router)
  - `src/app/globals.css` (Tailwind CSS v4 tokens & global styles)
* **Tanggung Jawab Utama**:
  - Membangun dan merawat komponen antarmuka yang presisi, responsif, dan konsisten secara visual.
  - Memastikan *Dark Mode* dan *Light Mode* memiliki kontras warna yang optimal.
  - Mengelola interaktivitas UI (drag-and-drop Kanban, modal pop-up, tooltips, chart visualizer).
* **Strict Invariants (Pantangan Wajib)**:
  - WAJIB menggunakan font universal **`Inter` (`font-sans`)**. DILARANG menggunakan `Outfit` atau font lain.
  - WAJIB mempertahankan directive `"use client"` di baris teratas file komponen yang menggunakan React hooks.
  - Mengikuti standar layout Cloudflare: *Outer container* `rounded-none`, tabel simetris 2-kolom, dan *flat search toolbar*.

---

### 2. ⚙️ Backend & Database Engineer
* **Ikon & Tag**: `⚙️ [Backend & Database]`
* **Ruang Lingkup File**:
  - `prisma/schema.prisma` (Definisi model data & relasi Prisma ORM)
  - `prisma/migrations/**` (Skrip migrasi database)
  - Konfigurasi koneksi PostgreSQL (`@prisma/adapter-pg`, `pg` client)
* **Tanggung Jawab Utama**:
  - Menjaga integritas skema data (relasi `Task`, `Designer`, `Doctype`, `Brand`, `BillingStatement`).
  - Menulis query raw SQL yang aman dan efisien.
  - Mengoptimasi performa indeks dan pemrosesan data batch.
* **Strict Invariants (Pantangan Wajib)**:
  - Wajib membungkus query dinamis `$queryRaw` dalam `Prisma.sql` dan `Prisma.empty` untuk mencegah SQL injection.
  - Seluruh field `Decimal` Prisma wajib diserialisasi menggunakan `JSON.parse(JSON.stringify(...))` sebelum dikirim ke Client Component.
  - Seluruh field `DateTime` bertipe string ISO wajib di-*coerce* menggunakan `.getTime()` sebelum dibandingkan.
  - Setiap perubahan pada `schema.prisma` WAJIB diikuti dengan `npx prisma db push` dan `npx prisma generate`.

---

### 3. 🔄 API & Notion Integration Engineer
* **Ikon & Tag**: `🔄 [API & Notion Integration]`
* **Ruang Lingkup File**:
  - `src/app/actions/**` (Server Actions sinkronisasi dan mutasi)
  - `src/app/api/sync/**` (Route handler untuk manual sync dan cron worker)
  - `src/proxy.ts` (Middleware proxy Basic Auth Vercel)
* **Tanggung Jawab Utama**:
  - Mengelola integrasi dengan Notion API (`@notionhq/client`).
  - Menjalankan alur sinkronisasi data (*full sync* vs *incremental cron sync*).
  - Menangani error token/secret dan pemetaan status kartu.
* **Strict Invariants (Pantangan Wajib)**:
  - Background Cron Sync WAJIB menggunakan `mode: 'incremental'` dengan filter `last_edited_time` agar durasi eksekusi < 2 detik.
  - Menggunakan `isRsc` detection di `src/proxy.ts` dan TIDAK mengirim header `WWW-Authenticate` pada background fetch agar tidak memicu popup login native browser di Vercel.
  - Parsing rich text Notion WAJIB menggabungkan seluruh segmen (`.map(t => t.plain_text).join('')`).

---

### 4. 💼 Business & Domain Logic Engineer
* **Ikon & Tag**: `💼 [Business & Domain Logic]`
* **Ruang Lingkup File**:
  - `src/lib/period-utils.ts` (Normalisasi string bulan dan filter waktu)
  - Logika perhitungan di `ApprovalPayrollTable.tsx`, `MonthFilter.tsx`, `KPISection.tsx`
* **Tanggung Jawab Utama**:
  - Menjamin akurasi matematis rumus SaaS (volume halaman, tagihan gaji, tarif kontrak).
  - Menjaga aturan bisnis status desainer (*Active*, *Resign*, *Hold*).
* **Strict Invariants (Pantangan Wajib)**:
  - **Count QTY Pages**: Wajib dihitung dari `qty_submit * pages` per task.
  - **Aturan Desainer Resign**: Desainer berstatus `Resign` WAJIB diset pembayaran gajinya strictly `0`.
  - **Base Template Pages**: Menggunakan nilai statis `MAX(pages)` dari tipe dokumen, bukan penjumlahan kumulatif.
  - **Normalisasi Periode**: Menggunakan helper `isTaskInPeriods` untuk normalisasi nama bulan Indonesia (e.g. `Agustus-2026`).

---

### 5. 🏛️ Architecture & Knowledge Ops (Lead)
* **Ikon & Tag**: `🏛️ [Architecture & Knowledge Ops]`
* **Ruang Lingkup File**:
  - `docs/knowledge/**` (Seluruh modul pengetahuan domain)
  - `AGENTS.md`, `CLAUDE.md`, `.cursorrules` (Aturan & protokol AI)
  - `scripts/graphify-parser.ts` (AST scanner & pembangun Knowledge Graph)
  - `src/components/KnowledgeGraphViewer.tsx` & `GraphifyVisualizer.tsx`
* **Tanggung Jawab Utama**:
  - Memelihara kelengkapan dan akurasi Knowledge Graph proyek.
  - Mencatat *Session Handover Log* dan mendokumentasikan *Gotchas / Bug Fixes* terbaru.
  - Menjaga sinkronisasi pemahaman antar LLM dan antar Code Editor.
* **Strict Invariants (Pantangan Wajib)**:
  - Skrip eksperimen sementara WAJIB ditempatkan di `scratch/` dan dilarang membuat file sementara di root.
  - Setiap keputusan arsitektur baru WAJIB dicatat di `session-handover.md` dan `issues-and-fixes.md`.

---

### 6. 🛡️ DevOps & Release Engineer
* **Ikon & Tag**: `🛡️ [DevOps & Release]`
* **Ruang Lingkup File**:
  - `vercel.json` (Konfigurasi cron schedule & headers)
  - `package.json` (Scripts, dependencies, & build workflow)
  - `.env.local` / Environment variables
* **Tanggung Jawab Utama**:
  - Mengelola jadwal otomatisasi cron job di cloud platform (Vercel Hobby 00:00 WIB / `0 17 * * *`).
  - Memastikan *build script* lulus typecheck (`npx tsc --noEmit`) sebelum release.
* **Strict Invariants (Pantangan Wajib)**:
  - Dilarang melakukan automatic `git push` tanpa instruksi eksplisit pengguna karena memicu auto-deploy Vercel.
  - Jadwal cron di `vercel.json` wajib mematuhi batasan Vercel Hobby (daily schedule, interval menit dilarang).

---

## ➕ Protokol Penambahan Role Baru (Extensibility Protocol)

Jika di masa depan proyek membutuhkan disiplin rekayasa baru (misal: `🧪 QA & Automated Testing`, `🔒 Security & Auth Compliance`, `📊 Data Analytics & Reporting`):

1. **Definisikan di Dokumen Ini (`docs/knowledge/roles.md`)**:
   - Tambahkan entri baru dengan mencantumkan: Ikon, Ruang Lingkup File, Tanggung Jawab Utama, dan *Strict Invariants*.
2. **Daftarkan di Skrip Parser (`scripts/graphify-parser.ts`)**:
   - Daftarkan ID role baru pada array peran agar muncul sebagai Node di Visual 2D Graph.
3. **Perbarui Matriks di UI (`KnowledgeGraphViewer.tsx`)**:
   - Tambahkan kartu role baru ke dalam daftar *Registered Engineering Roles* di Tab 7.
4. **Catat di Session Handover Log**:
   - Tanda tangani sesi dengan role baru tersebut pada `docs/knowledge/session-handover.md`.
