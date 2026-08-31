<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ui-dropdown-style-consistency -->
# Dropdown Style Consistency

When adjusting dropdowns, keep hover, selected, and disabled states aligned with the app's current light and dark design tokens. Match panel background, text contrast, border strength, and selected highlight to nearby existing controls instead of inventing a new palette.

**Copy, Don't Approximate**: When adding a new control (button, pill, dropdown, panel) next to existing ones, COPY the exact Tailwind class strings from the nearest sibling control — shape metrics (`rounded-*`, `px-*`, `py-*`, `text-[..]`), border color, text color, hover state, and active/accent highlight. Do not invent a near-miss variant (e.g., `rounded-[6px]` vs `rounded-full`, custom hex vs the app's `#615FFF` accent). Only deviate when the user explicitly requests it.

**Verify Icon Exports**: Before using a `lucide-react` icon, confirm it exists in the installed version (e.g., grep `node_modules/lucide-react` or check exports) — icon names from training data may not exist in older versions (e.g., `CalendarMonth` is absent in v1.23; use `Calendar`). Run `npx tsc --noEmit` after any icon or JSX change.
<!-- END:ui-dropdown-style-consistency -->

<!-- BEGIN:prisma-raw-query-safety -->
# Prisma Raw Query Safety

When using `prisma.$queryRaw`, wrap dynamic SQL in `Prisma.sql` and guard optional filters with `Prisma.empty` so empty inputs do not generate invalid placeholders or `IN ()` fragments.
<!-- BEGIN:dynamic-period-labels -->
# Dynamic Period Labels

When a UI string references a time period (e.g., "this month", "last week", "today"), it MUST reflect the active filter state instead of being hardcoded. In the Production board, the month filter (`filters.taskMonths`) drives these labels:
- Single month: `Doctype created <MonthName-YYYY>` (e.g., `Doctype created Agustus-2026`).
- Multiple months: `Doctype created in N months` (match the toolbar's `N Bulan` convention; keep the label's base language).
- No selection: fall back to the generic base label (`Doctype created`).

Do not ship a static period string anywhere a period filter exists.
<!-- END:dynamic-period-labels -->

<!-- BEGIN:workspace-cleanliness-rule -->
# Workspace Cleanliness & Temporary File Rules

Untuk menjaga direktori proyek tetap bersih, rapi, dan mudah dipelihara:

1. **Dilarang Membuat Skrip Debug di Root Directory**:
   - Jangan membuat file `.ts`, `.js`, `.py`, `.sql`, atau `.log` sementara untuk uji coba langsung di root folder (`./`).
   
2. **Gunakan Folder `scratch/` untuk Eksperimen**:
   - Seluruh skrip pengujian sementara, eksplorasi API (seperti Notion/Prisma), atau investigasi bug HARUS diletakkan di dalam folder `./scratch/`.
   - Folder `./scratch/` sudah terdaftar di `.gitignore` sehingga tidak akan menyampahi riwayat commit Git.

3. **Skrip Resmi Wajib Masuk `scripts/`**:
   - Jika suatu skrip utilitas bersifat permanen dan dibutuhkan oleh tim/CI (misal: verifikasi DB, seeding kustom), tempatkan di folder `./scripts/` (contoh: `scripts/verify-prisma.ts`) dan daftarkan di `package.json` jika perlu.

4. **Pembersihan Berkala & Dilarang Commit Log**:
   - File log (`*.log`) tidak boleh dicommit ke git repository.
   - Hapus atau arsip skrip uji coba di `scratch/` secara berkala jika fitur terkait telah selesai dikembangkan dan masuk ke tahap production.
<!-- END:workspace-cleanliness-rule -->

<!-- BEGIN:knowledge-graph-hybrid-protocol -->
# Hybrid Knowledge Graph & Session Handover Protocol

Untuk efisiensi token dan kontinuitas konteks antar LLM (Gemini/Claude/GPT) dan Code Editor (Antigravity/Cursor/VS Code):

1. **Inisialisasi Sesi (On-Demand Retrieval)**:
   - LLM HARUS membaca `docs/knowledge/index.md` di awal sesi untuk memahami peta repositori.
   - Untuk penelusuran dependensi kode teknis (call graph/imports), merujuk pada `graph.json` (Graphify) jika tersedia.
   - Untuk aturan bisnis, skema data, dan gotchas, merujuk pada modul `docs/knowledge/*.md` yang relevan.

2. **Konsultasi Handover Log**:
   - Sebelum mengeksekusi tugas baru, periksa `docs/knowledge/session-handover.md` untuk mengetahui status pengerjaan terakhir dan keputusan arsitektur terbaru.

3. **Mekanisme Update Sesi**:
   - Setelah menyelesaikan perubahan besar, bug fix, atau penambahan fitur, LLM WAJIB memperbarui `docs/knowledge/session-handover.md` (status aktif & catatan keputusan) dan `docs/knowledge/issues-and-fixes.md` (jika menemukan bug/edge case baru).
<!-- BEGIN:knowledge-graph-learning-documentation-rule -->
# Knowledge Graph Documentation Protocol on `/learn` & Bug Fixes

Setiap kali menjalankan sesi `/learn`, menyelesaikan perbaikan bug (bug fix), atau menemukan edge case/gotchas baru, LLM WAJIB mendokumentasikannya ke Knowledge Graph proyek:

1. **Update Modul Pengetahuan Gotchas (`docs/knowledge/issues-and-fixes.md`)**:
   - Catat gejala bug, penyebab utama (*root cause*), dan pola solusi (*fix pattern*) agar tidak terulang kembali.

2. **Update Log Handover Sesi (`docs/knowledge/session-handover.md`)**:
   - Perbarui *Active State* (tanggal, waktu, status tugas).
   - Tambahkan daftar keputusan arsitektur & perbaikan terbaru di bagian *Recent Decisions*.

3. **Sinkronisasi Web UI (`src/components/KnowledgeGraphViewer.tsx`)**:
   - Lakukan pembaruan pada Tab 6 (*Gotchas & Layout Rules*) dan Tab 7 (*Session Handover Log*) agar antarmuka visual di rute `/knowledge-graph` selalu mencerminkan data pengetahuan terbaru.
<!-- END:knowledge-graph-learning-documentation-rule -->
