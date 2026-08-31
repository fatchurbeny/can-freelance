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
# Hybrid Knowledge Graph & Mandatory Pre-Execution Check Protocol

Untuk efisiensi token, keakuratan saran, dan kontinuitas konteks antar LLM (Gemini/Claude/GPT) dan Code Editor (Antigravity/Cursor/VS Code):

1. **Mandatory Pre-Execution Knowledge Check (WAJIB Sebelum Eksekusi / Memberi Saran)**:
   - Sebelum LLM memberikan **saran arsitektur**, **menjawab pertanyaan teknis**, atau **melakukan eksekusi edit kode/perintah**, LLM WAJIB membaca [`docs/knowledge/index.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/index.md) dan [`docs/knowledge/session-handover.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/session-handover.md) terlebih dahulu.
   - LLM dilarang keras memberikan asumsi kode atau saran tanpa memeriksa histori pengerjaan terakhir dan aturan di Knowledge Graph.

2. **On-Demand Retrieval Modul Pengetahuan**:
   - Untuk aturan bisnis, skema data, dan gotchas, merujuk pada modul `docs/knowledge/*.md` yang relevan (`entities.md`, `modules.md`, `business-rules.md`, `issues-and-fixes.md`).
   - Untuk penelusuran dependensi kode teknis (call graph/imports), merujuk pada `graph.json` (Graphify) jika tersedia.

3. **Mekanisme Update Sesi**:
   - Setelah menyelesaikan perubahan besar, bug fix, atau penambahan fitur, LLM WAJIB memperbarui `docs/knowledge/session-handover.md` (status aktif & catatan keputusan) dan `docs/knowledge/issues-and-fixes.md` (jika menemukan bug/edge case baru).
<!-- END:knowledge-graph-hybrid-protocol -->

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

<!-- BEGIN:force-graph-hover-isolation-rule -->
# Force Graph Simulation Hover Isolation

When implementing 2D/3D Canvas Force Graphs (e.g. `GraphifyVisualizer.tsx`):
- NEVER place interactive hover/selection states (`hoveredNode`, `selectedNode`, `isDark`) inside the `useEffect` dependency array that initializes the physics simulation setup (`nodesRef.current` / `Math.random()` / `alpha = 1`).
- ALWAYS bind interactive state to `useRef` (e.g. `hoveredNodeRef.current = hoveredNode`) and scope the physics simulation effect strictly to `[data]` only.
- Render highlights (glow rings, active edges) inside the 60 FPS `requestAnimationFrame` render loop by reading from refs directly without re-executing simulation logic or resetting node positions.
<!-- END:force-graph-hover-isolation-rule -->

<!-- BEGIN:cloudflare-symmetrical-table-layout-rule -->
# Cloudflare Symmetrical Table & Control Layout Rules

When styling continuous tables, sidebar lists, and tab bars in Cloudflare Continuous Card Layout:
1. **Outer Main Container Padding**: Always use `p-6 md:p-8` for outer `<main>` padding across all pages (`/`, `/production`, `/billing-statement`, `/notion-config`, `/knowledge-graph`).
2. **Main Outer Card Rounding**: Use `rounded-none` on outer continuous card containers without double borders or floating gaps.
3. **Symmetrical Tab Navigation**: Equal height (`py-3.5 text-sm font-medium`) and equal width distribution (`flex-1 min-w-max justify-center`).
4. **Flat Search Toolbar**: Input pencarian disusun sebagai sel header flat `h-10 px-3.5 border-b border-[#f0f0f0] dark:border-[#272a34]` tanpa box padding `p-3.5` atau border kotak internal terpisah.
5. **2-Column Symmetrical Table Grid**: Seksi daftar (seperti `COMMUNITIES`) menggunakan 2 kolom simetris sejati: Kolom 1 (`flex-1 px-4 py-2.5`) untuk nama, Kolom 2 (`w-16 border-l flex justify-center`) untuk angka/count.
6. **Quick Stats Continuous Row & KPI Icon Styling**: Quick stats disusun sebagai baris 4 kolom berkelanjutan (`-mx-6 -mb-6 mt-6 border-t divide-x`) dilengkapi blok ikon bertema opacity 10% (`w-6 h-6 rounded-md bg-color/10 text-color`) di sudut kanan atas sel.
<!-- END:cloudflare-symmetrical-table-layout-rule -->

<!-- BEGIN:cloudflare-modal-popup-layout-rule -->
# Cloudflare Modal Popup Structure & Layout Standard

When creating or refactoring modal popups (e.g. `AddDoctypeButton.tsx`, `ContractRateEditor.tsx`, `SyncButton.tsx`):
1. **Outer Modal Container**:
   - MUST use `rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-2xl overflow-hidden font-sans`.
   - NEVER use `rounded-2xl` or rounded floating card containers.
2. **Header Cell**:
   - `p-4 sm:p-5 bg-gray-50/50 dark:bg-[#16181d]/50 flex items-start justify-between gap-4`.
   - Title: `text-xs font-bold font-mono uppercase tracking-wider text-gray-900 dark:text-white`.
   - Description: `mt-1 text-xs font-mono text-gray-500 dark:text-gray-400`.
   - Close button: `flex size-7 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer`.
3. **Form Body Cell & Label Spacing**:
   - `p-4 sm:p-5 space-y-4 bg-white dark:bg-[#0d0e12]`.
   - Labels: `<label className="flex flex-col gap-2.5 text-xs font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">`.
   - Inputs: `w-full rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-3.5 py-2.5 font-mono text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff5e1f] transition-colors`.
4. **Action Footer (2-Column Full-Width Table Row)**:
   - `grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]`.
   - Left Cancel Cell: `w-full py-3.5 px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] font-mono text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors cursor-pointer text-center`.
   - Right Save Cell: `w-full py-3.5 px-4 bg-[#ff5e1f] hover:bg-[#ff7038] font-mono text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer text-center`.
<!-- END:cloudflare-modal-popup-layout-rule -->

<!-- BEGIN:cloudflare-inline-table-editing-rule -->
# Cloudflare Inline Table Editing Standard

When implementing or updating inline table editing in data tables (e.g., `RateCardRow.tsx`, `PayrollTableRow.tsx`):
1. **Full Container Cell Height (`h-full min-h-[44px] align-stretch`)**:
   - Table cells during editing MUST NOT use floating inputs or rounded card pills with margins.
   - Specify `p-0 h-full align-stretch` on `<td>` and `w-full h-full min-h-[44px] rounded-none` on interactive inputs and buttons to span 100% full height of the table row without gaps.
2. **Native Stepper Arrow Removal**:
   - All numeric inputs MUST strip native browser up/down arrow spinners using `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`.
3. **Action Cell Grid Standard**:
   - Normal view: Single full-height action block `w-full h-full min-h-[44px] border-l border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 hover:bg-[#ff5e1f] text-gray-700 dark:text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider`. Button text: **`EDIT`**.
   - Editing view: 2-column symmetrical table cell grid `grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-l border-[#f0f0f0] dark:border-[#272a34] h-full min-h-[44px] items-stretch font-mono text-xs`. Left 50% = `SAVE` (`bg-[#ff5e1f] hover:bg-[#ff7038] text-white font-bold uppercase`), Right 50% = `CANCEL` (`bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300 font-bold uppercase`).
<!-- END:cloudflare-inline-table-editing-rule -->
