<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ui-dropdown-style-consistency -->
# Dropdown Style Consistency

When adjusting dropdowns, keep hover, selected, and disabled states aligned with the app's current light and dark design tokens. Match panel background, text contrast, border strength, and selected highlight to nearby existing controls instead of inventing a new palette.

**Native HTML Select Prohibition**: NEVER use native HTML `<select>` elements for form dropdowns or filters. Native `<select>` inputs render OS-dependent blue popovers that break the application's dark mode design tokens. ALWAYS use custom Cloudflare Dropdown Panel components (`bg-white dark:bg-[#16181d] border-[#272a34] shadow-xl p-1.5`) featuring Cloudflare Contrast Checkboxes (`w-4 h-4 rounded-[5px] border flex items-center justify-center`).

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
3. **Tab Navigation Bar Standard**: All top tab bars across pages (`ProductionTabNav.tsx`, `AccountTeamSection.tsx`, etc.) MUST strictly use:
   - Font Size: **`text-xs font-sans`** (12px), NEVER `text-sm`.
   - Padding: `px-4 py-2.5` (or `px-5 py-3 text-xs`).
   - Casing: Title Case for tab names (`Overview`, `Kanban Board`, `Designer Team (6)`).
   - Far-Right Action Button: `ml-auto flex items-center gap-1.5 px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider bg-[#ff5e1f] text-white hover:bg-[#ff7038] border-l border-[#f0f0f0] dark:border-[#272a34]`.
   - Active Indicator: Bottom line `<span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />`.
4. **Flat Search Toolbar & Dropdown Sort/Filter Controls**: Input pencarian disusun sebagai sel header flat (`h-11 px-3.5 divide-x border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12]`) tanpa box padding `p-4 sm:p-5` atau border kotak internal terpisah. Fitur filter status (`ALL Status`, `Active`, `Inactive`, `Resign`) dan sorting disajikan sebagai **Dropdown Menu Terintegrasi Sel Header Flat** (`h-full px-4 flex items-center gap-2 text-xs font-sans font-medium border-r border-[#272a34] outline-none focus:outline-none focus-visible:outline-none`). Panel dropdown melayang (`bg-white dark:bg-[#16181d] p-1.5 shadow-xl border-[#272a34]`) dilengkapi **Cloudflare Checkbox** di sebelah kanan (`w-4 h-4 rounded-[5px] border flex items-center justify-center`). Badge informasi non-interaktif (seperti `LEADERBOARD #1: Putery`) adalah label tag independen (`px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20`), tidak perlu dipaksakan menjadi sel tabel simetris.
<!-- END:cloudflare-symmetrical-table-layout-rule -->

<!-- BEGIN:cloudflare-modal-popup-layout-rule -->
# Cloudflare Slide-over Drawer Modal & Form CRUD Standard

When creating or modifying forms, input dialogs, view/edit drawers, or modal popups (e.g. `DoctypeSlideModal.tsx`, `AddTeamAccountSlideModal.tsx`, `ContractRateEditor.tsx`):
1. **Master Architecture Specification**:
   - Refer to [`docs/knowledge/form-crud-rules.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/form-crud-rules.md) for full blueprints.
2. **Slide-over Drawer Container**:
   - Overlay: `fixed inset-0 z-70 bg-black/40 cursor-pointer`.
   - Panel: `absolute right-0 top-0 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]`.
   - Header Bar: `flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 shrink-0`. Square 8x8 header icon box (`text-[#ff5e1f] bg-white dark:bg-[#16181d] border-[#272a34]`) and square close button `X`.
3. **Edge-to-Edge Continuous 2-Column Symmetrical Table Grid Form Body**:
   - `divide-y divide-[#f0f0f0] dark:divide-[#272a34]`. Outer row: `flex items-stretch text-xs font-sans min-h-[44px]`.
   - Left Label Cell: `w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap`.
   - **Slim Label Rule (No Asterisk Wrap)**: Label titles MUST NOT contain trailing asterisks `*` or line breaks that force text onto a 2nd line. Keep label title on 1 single line with `whitespace-nowrap` for a slim, compact `min-h-[44px]` height.
   - Right Input Cell: `flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]`. Input: `w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f]`.
4. **Cloudflare Custom Dropdown Prohibition**:
   - Native HTML `<select>` is strictly PROHIBITED.
   - Always use custom Cloudflare Dropdowns featuring Cloudflare contrast checkboxes (`w-4 h-4 rounded-[5px]`) and custom write-in option (`Ketik ... Kustom...`).
5. **Color Palette & Accents**:
   - Primary Accent Orange: `#ff5e1f` (Save buttons, main highlights, header icons, calculation totals).
   - Secondary Accent Purple: `#615fff` (Secondary option buttons).
   - Active Emerald Green: `#00a67d` (ACTIVE status buttons/badges).
   - Neutral Gray: `#6e7687` (INACTIVE/RESIGN status buttons/badges).
6. **Symmetrical 2-Column Action Footer**:
   - `grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-t border-[#f0f0f0] dark:border-[#272a34] shrink-0`. Left 50% `CANCEL` (`bg-gray-50/50 dark:bg-[#16181d]/50`), Right 50% `+ SAVE` (`bg-[#ff5e1f] hover:bg-[#ff7038] text-white`).
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
   - Normal view: Single full-height action block `w-full h-full min-h-[44px] border-l border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 hover:bg-[#ff5e1f] text-gray-700 dark:text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider`. Button text: **`EDIT`** or **`PROMOTE`**.
   - Editing view: 2-column symmetrical table cell grid `grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-l border-[#f0f0f0] dark:border-[#272a34] h-full min-h-[44px] items-stretch font-sans text-xs`. Left 50% = `SAVE` (`bg-[#ff5e1f] hover:bg-[#ff7038] text-white font-bold uppercase`), Right 50% = `CANCEL` (`bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300 font-bold uppercase`).
4. **Isolated Status Cells & Dedicated Far-Right Action Columns**:
   - Do NOT mix action buttons (such as `Edit` or `Promote`) inside status badge cells (`STATUS`).
   - Status cells MUST contain only the status selection dropdown. All row action triggers MUST be placed in a dedicated far-right `ACTION` column (`w-[120px] p-0 h-full align-stretch border-l border-[#272a34]`).
<!-- END:cloudflare-inline-table-editing-rule -->

<!-- BEGIN:inter-primary-font-rule -->
# Inter Universal Typography Standard

To ensure clean, modern, and unified SaaS typography across the entire application:

1. **Universal Primary Font (`font-sans`)**:
   - The entire user interface MUST strictly use **`Inter`** (`font-sans`).
   - This includes all headings, KPI metric cards, body text, data tables, table subtitles, brand handles (`Chital`, `Azzahra`), doctype identifiers (`Instagram-Carousel`), aspect ratios (`16:9`), currency numbers (`Rp 15.000`), filter toolbars, tabs, buttons, dropdowns, badges, pill tags, and form fields.
   - Do NOT use `font-mono` for secondary subtitles or table handles under titles.
   - Do NOT use Google Font `Outfit` (`font-display`) or any other heading font.
   
2. **Strict Monospace (`font-mono`) Isolation**:
   - `font-mono` is strictly restricted to **technical quote fields and code snippets**:
     - Notion Database ID / UUID quote blocks (e.g. `notion.so/workspace/2f40e19aa1358026a0e1d9caab5cdbb7?v=...`).
     - Secret tokens, API keys, and hash digests.
     - Inline code tags (`<code>...</code>`) and block code containers (`<pre><code>...</code></pre>`).
     - Terminal execution consoles and sync process logs (e.g. `SyncButton` terminal console).
   - Standard UI components (table headers, row cells, subtitles, status badges, buttons, inputs) MUST NEVER use `font-mono`.
<!-- END:inter-primary-font-rule -->

<!-- BEGIN:role-based-handover-protocol -->
# Role-Based Engineering Domains & Multi-LLM Handover Protocol

To maintain complete context retention and prevent perception loss across multiple AI agents (Gemini, Claude, GPT, Codex) and Code Editors (Antigravity, Claude Code, Cursor, VS Code):

1. **Role Identification & Scope Boundary**:
   - Before executing code edits, the agent MUST inspect [`docs/knowledge/roles.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/roles.md) to identify the active engineering role:
     - `🎨 Frontend & UI/UX` (components, CSS, layouts, Inter font)
     - `⚙️ Backend & Database` (Prisma schema, PostgreSQL, Decimal/Date serialization)
     - `🔄 API & Notion Integration` (Notion client, server actions, incremental cron sync)
     - `💼 Business & Domain Logic` (SaaS metrics, QTY pages formula, resign status logic)
     - `🏛️ Architecture & Knowledge Ops` (knowledge graph, handover log, rule governance)
     - `🛡️ DevOps & Release` (vercel.json cron, environment deployment)
   - Do NOT modify files outside your active role's ownership without explicit multi-role justification.

2. **Session Signature & Handover Update**:
   - At the conclusion of a task, the agent WAJIB updates [`docs/knowledge/session-handover.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/session-handover.md) with:
     - `Session ID` (e.g. `#SESS-YYYYMMDD-XX`)
     - `Active Engineering Role`
     - `Last Active Agent / Tool`
     - `Task State & Key Decisions`
     - `Recommended Next Role`
   - Sync the changes to Tab 7 of the Web UI in `KnowledgeGraphViewer.tsx`.
<!-- END:role-based-handover-protocol -->
