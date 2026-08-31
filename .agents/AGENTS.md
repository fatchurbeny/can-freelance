<!-- BEGIN:rounded-charts-rule -->
# Chart Design Style

Always ensure that all charts (Bar charts, Donut charts, Gauge charts, etc.) use a rounded corner design style. 
For Recharts:
- Use `cornerRadius` on `<Pie>` components.
- Use `radius` on `<Bar>` components.
- Ensure appropriate gaps between segments using `paddingAngle` for pies/donuts, or a stroke colored the same as the background for stacked bars.
<!-- END:rounded-charts-rule -->

<!-- BEGIN:prisma-schema-update-workflow -->
# Prisma Schema & Build Workflow

When making changes to `schema.prisma` or configuring Prisma in this project:
1. Always run `npx prisma db push` (or `migrate dev`) to sync the database schema.
2. Always run `npx prisma generate` to rebuild TypeScript types for `@prisma/client`.
3. If custom output paths are used (`output = "../generated/prisma"`), ensure `package.json` contains `"postinstall": "prisma generate"` under `scripts` so cloud deployments (Vercel) automatically generate Prisma Client during package installation before `next build`.
4. If the Next.js dev server is running, explicitly instruct the user to restart it so the updated Prisma Client is properly loaded.
<!-- END:prisma-schema-update-workflow -->

<!-- BEGIN:notion-indonesian-months-rule -->
# Notion Data Localization

This project synchronizes data from Notion where month inputs are formatted using Indonesian names (e.g., 'Mei-2026', 'Juni-2026'). 
When writing mock data, formatting dates, or parsing month strings, ALWAYS use Indonesian month names:
['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
<!-- END:notion-indonesian-months-rule -->

<!-- BEGIN:notion-rich-text-parsing-rule -->
# Notion API Rich Text Parsing

When parsing `title` or `rich_text` properties from the Notion API, NEVER access just the first element (e.g., `title[0].plain_text`). Notion splits text into multiple segments if there is mixed formatting (like bold text). 

ALWAYS map and join all segments to ensure no text is lost:
```typescript
// BAD
const name = properties.Name?.title?.[0]?.plain_text || 'Untitled';

// GOOD
const name = properties.Name?.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
```
<!-- END:notion-rich-text-parsing-rule -->

<!-- BEGIN:saas-dashboard-metrics-rule -->
# SaaS Dashboard Metrics & Calculations

When working with tasks, templates, and pages in this project, adhere to the following formulas and definitions:
1. **Count QTY Pages**: Always calculated as `qty_submit` * `pages` per task.
2. **Count Templates**: Represents the `qty_submit` value.
3. **Count Tasks / Approved Tasks**: Refers to the number of individual Notion Cards/rows.
4. **Base Template Pages**: When displaying the static size of a doctype (e.g., `@12Pages`), use the distinct value (e.g., `MAX(pages)` in a grouped SQL query), NOT the sum of pages across tasks.

# Tooltip & Legend Formatting Standard
- Tooltips across charts (e.g., Tren Volume, Pipeline, Doctype) should standardly break down Total Volume into:
  - **Task**: Number of tasks
  - **Template**: Submitted quantity (`qty_submit`)
  - **Pages**: Total calculated pages (`qty_submit * pages`)
- When displaying doctype distributions in legends, use the format: `[Doctype] ([TaskCount]/[TemplateCount]Template @[BasePageCount]Pages)` (e.g., `Regular-Presentation (4/4Template @12Pages)`).
<!-- END:saas-dashboard-metrics-rule -->

<!-- BEGIN:ui-tailwind-best-practices -->
# Tailwind & CSS Layout Best Practices

When building user interfaces, adhere to the following rules to prevent common layout bugs:

1. **Avoid Hallucinated Utility Classes**: Do not use non-standard Tailwind classes (e.g., `hide-scrollbar`) unless you have explicitly verified they are defined in the project's `globals.css` or Tailwind configuration. To hide scrollbars natively, use standard arbitrary variants: `[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`.
2. **Prevent Overflow Clipping on Floating UI**: Never place `absolute` positioned floating elements (like tooltips, popovers, or toggle buttons that extend outward) inside a parent container that uses `overflow-hidden`, `overflow-auto`, or `overflow-scroll`. These properties will clip any child content that attempts to break out of the container's boundaries. If scrolling is required, ensure the floating elements are positioned outside the scrollable container or use React Portals.
3. **Prevent Stacking Context Traps**: Applying utility classes like `opacity-*`, `grayscale`, `transform`, `filter`, or `backdrop-blur` to a parent container creates a new CSS stacking context. If a child element is an absolute-positioned floating UI (like a dropdown) with a high `z-index`, it will be trapped within this stacking context and render underneath subsequent sibling containers. To apply visual states (like inactive rows), apply these utility classes directly to the individual static child elements (text, avatars) rather than the parent wrapper that houses the floating UI.
<!-- END:ui-tailwind-best-practices -->

<!-- BEGIN:nextjs-preserve-directives-rule -->
# Preserve Next.js Directives

When modifying, replacing, or rewriting Next.js component files (especially using code replacement tools), you MUST strictly preserve any existing file-level directives at the very top of the file, most notably `"use client"`. 
- If a component relies on React hooks (`useState`, `useEffect`, `useRef`), event listeners (`onClick`), or browser APIs, it MUST have the `"use client"` directive at the top.
- Failure to preserve this directive will cause React Server Component (RSC) build errors and crash the application.
<!-- END:nextjs-preserve-directives-rule -->

<!-- BEGIN:manual-git-push-rule -->
# Manual Git Push & Deployment

Do NOT automatically commit and push changes to git after completing a task. Pushing to git triggers automatic deployments on Vercel in this project. 
Only stage, commit, and push changes to git when the user explicitly instructs you to do so (e.g., "push to git", "commit this").
<!-- END:manual-git-push-rule -->

<!-- BEGIN:workspace-write-tool-rule -->
# Workspace File Writes

`write_to_file` is artifact-only. Do not use it to create or overwrite files in the project workspace. For workspace code files, use a shell write command or the dedicated code-edit tools with the workspace path. Use `write_to_file` only for brain artifacts such as plans, walkthroughs, task lists, and scratch notes.
<!-- END:workspace-write-tool-rule -->

<!-- BEGIN:prisma-decimal-serialization -->
# Prisma Decimal Serialization

Prisma `Decimal` fields (`poolScore`, `pages`, `qtySubmit`) are NOT plain JS objects. When fetching data that will be passed to a Client Component, serialize with `JSON.parse(JSON.stringify(...))` to convert `Decimal` instances to plain numbers.

`DateTime` fields (`createdTime`, `lastEditedTime`, `createdAt`) survive that same serialization as **ISO strings**, not `Date` objects. Type them as `string | number | null` in Client Component props and coerce before comparing:

```ts
// BAD - subtracts two strings, yields NaN, and sort() silently no-ops
return (a.lastEditedTime || 0) - (b.lastEditedTime || 0);

// GOOD
const time = (v?: string | number | null) =>
  v == null ? 0 : typeof v === 'number' ? v : new Date(v).getTime();
return time(b.lastEditedTime) - time(a.lastEditedTime);
```
<!-- END:prisma-decimal-serialization -->

<!-- BEGIN:table-layout-best-practices -->
# Table Layout & Spacing Consistency

When modifying or creating full-width tables (`w-full`) in this project:
1. **Absorb Extra Space**: Always apply `w-full` to the primary textual column (e.g., "Task" or "Name") so it absorbs all slack space.
2. **Compact Action Columns**: For right-aligned action or input columns, use fixed minimum widths (e.g., `w-[130px]`) and tight padding (e.g., `px-1` or `px-2`) to keep them visually close together without stretching.
3. **Prevent Wrapping**: Always apply `whitespace-nowrap` to short data columns (Doctype, Brand, QTY, Pages) to prevent text from breaking into multiple lines.
<!-- END:table-layout-best-practices -->

<!-- BEGIN:ui-dropdown-style-consistency -->
# Dropdown Style & Dimensional Consistency

When adjusting dropdowns, keep hover, selected, and disabled states aligned with the app's current light and dark design tokens. Match panel background, text contrast, border strength, and selected highlight to nearby existing controls instead of inventing a new palette.

**Dimensional Symmetry**: When a table header contains a batch-action dropdown and the body contains per-row dropdowns, they MUST have the exact same fixed width (e.g., `w-[130px]`) and internal alignment (`justify-between` or `justify-center`) to ensure vertical visual symmetry.

**Copy, Don't Approximate**: When adding a new control (button, pill, dropdown, panel) next to existing ones, COPY the exact Tailwind class strings from the nearest sibling control — shape metrics (`rounded-*`, `px-*`, `py-*`, `text-[..]`), border color, text color, hover state, and active/accent highlight. Do not invent a near-miss variant (e.g., `rounded-[6px]` vs `rounded-full`, custom hex vs the app's `#615FFF` accent). Only deviate when the user explicitly requests it.

**Verify Icon Exports**: Before using a `lucide-react` icon, confirm it exists in the installed version (e.g., grep `node_modules/lucide-react` or check exports) — icon names from training data may not exist in older versions (e.g., `CalendarMonth` is absent in v1.23; use `Calendar`). Run `npx tsc --noEmit` after any icon or JSX change.
<!-- END:ui-dropdown-style-consistency -->

<!-- BEGIN:designer-status-handling -->
# Designer Status Handling

The Designer model uses a string `status` field, NOT a boolean `isActive` flag. 
- Active check: Use `designer.status === 'Active'`.
- Resigned check: Use `designer.status === 'Resign'`.
- **Business Logic**: Designers with a `Resign` status should have their calculated payroll payments strictly set to `0`.
- **UI Logic**: Resigned designers should be displayed with visually distinct badges (e.g., Red badge with strikethrough text), whereas other non-active statuses (e.g., 'Hold' or 'Inactive') should use an Amber badge.
<!-- END:designer-status-handling -->

<!-- BEGIN:jsx-modification-safety -->
# JSX Modification Safety

When using code replacement tools to refactor React components (like wrapping elements or moving onClick handlers), it is very easy to miscount opening/closing tags. 

Before and after executing any file replacement in React components, meticulously verify that all opening HTML/JSX tags (e.g., <div>, <>) have exactly one corresponding closing tag (</div>, </>). Pay special attention to nested wrappers to avoid dropping or adding extraneous closing tags.
<!-- END:jsx-modification-safety -->

<!-- BEGIN:accordion-ui-dividers -->
# Accordion UI and Divider Lines

When converting a UI component into an accordion or collapsible container, if you apply a `border-t` utility class to separate the expanded content, you MUST check for and remove any redundant `<hr />` tags at the top of the inner content to prevent double lines.
<!-- END:accordion-ui-dividers -->

<!-- BEGIN:git-branching-workflow -->
# Git Branching & Deployment Workflow

To keep production stable while developing new features:
1. **`main` branch** is production. Never push unfinished code directly.
2. **Feature branches**: `git checkout -b <feature-name>` for every change.
3. **Commit & push** feature branch often: `git push origin <feature-name>`.
4. **Pull Request (PR)**: When feature is done, open PR to merge into `main`. Vercel creates preview deployment.
5. **Merge**: Only after testing. Merging to `main` triggers production deploy.

Vercel only auto-deploys from `main`. All development happens on branches.
<!-- END:git-branching-workflow -->

<!-- BEGIN:full-file-rewrite-truncation -->
# Full-File Rewrites

`replace_file_content` cannot delete a trailing range. Anchoring a whole-file rewrite on the first few lines appends the new body and leaves the old one below it - a file with two `export default`s that fails to build.

- Prefer rewriting in place with targeted, non-contiguous chunks.
- If a file already has a duplicated tail, do NOT try to select it as `TargetContent`. Find the real end and truncate:
  `head -n <line> file.tsx > tmp && mv tmp file.tsx`
- Run `npx tsc --noEmit` immediately after; a duplicated tail always trips it.
<!-- END:full-file-rewrite-truncation -->

<!-- BEGIN:sidebar-mini-rail-default -->
# Sidebar Default State

The sidebar uses a mini icon rail as its DEFAULT state on desktop (Figma "sidebar-menu/hide"):
- **Default**: collapsed to a ~72px icon-only rail, ALWAYS visible on desktop (`md:` breakpoint). It stays in the flex row flow — never unmount, never `-translate-x-full` on desktop.
- **Expanded**: user clicks the brand/collapse button to widen to full labels (`w-64`).
- "Hide" means collapse to icons, NOT removing the sidebar.
- Mobile keeps drawer behavior (`w-64`, overlay backdrop, hamburger in top bar).
- Never gate the `<aside>` render on `isMobileOpen` for desktop; use `md:translate-x-0` with mobile-only translate.
<!-- END:sidebar-mini-rail-default -->

<!-- BEGIN:dynamic-period-labels -->
# Dynamic Period Labels

When a UI string references a time period (e.g., "this month", "last week", "today"), it MUST reflect the active filter state instead of being hardcoded. In the Production board, the month filter (`filters.taskMonths`) drives these labels:
- Single month: `Doctype created <MonthName-YYYY>` (e.g., `Doctype created Agustus-2026`).
- Multiple months: `Doctype created in N months` (match the toolbar's `N Bulan` convention; keep the label's base language).
- No selection: fall back to the generic base label (`Doctype created`).

Do not ship a static period string anywhere a period filter exists.
<!-- END:dynamic-period-labels -->

<!-- BEGIN:dashboard-card-layout-learning -->
# Dashboard Card Layout Changes

When the user asks to move, align, swap, or remove dashboard cards, make the smallest possible layout change. Preserve untouched rows, keep sibling cards aligned within the same grid row, and do not introduce extra cards or hidden placeholders unless explicitly requested.

If a component file becomes corrupted during a UI edit, restore it by rewriting the full file cleanly, then verify with `npx tsc --noEmit` before continuing.
<!-- END:dashboard-card-layout-learning -->

<!-- BEGIN:notion-status-case-and-alias-handling -->
# Notion Status Case Sensitivity & Alias Handling

When fetching, filtering, or rendering tasks synchronized from Notion:
1. **Case-Insensitive Array Matching**: Server-side queries (`BOARD_STATUSES` in `page.tsx`) and client-side column filters (`COLUMNS` and `STATUS_CARDS` in `SortableTaskLists.tsx`) MUST include both title-case and lowercase variants (e.g., `['Not Started', 'Not started']`, `['In Progress', 'In progress']`).
2. **Support Status Aliases**: Include common alias variants for statuses (e.g. QA variants: `['QA', 'qa', 'Q&A', 'q&a', 'In QA', 'in qa', 'QA Process', 'Quality Assurance']`).
3. **Intelligent Sync Mapping**: In `syncNotionData`, normalize or match status names using case-insensitive and substring checks so that new status records are mapped to canonical existing status entities whenever possible.
<!-- END:notion-status-case-and-alias-handling -->

<!-- BEGIN:notion-sync-mode-and-manual-trigger -->
# Notion Sync Mode & Manual Sync Defaults

1. **Manual User Sync**: When a server action is invoked directly from a user UI action (such as clicking the "Notion Sync" button via `triggerSyncAction`), it MUST default to **Full Sync mode** (`syncNotionData('full')`) to guarantee complete reconciliation of updated statuses, deleted pages, and new tasks.
2. **Background Cron Sync**: Background automated syncs (e.g., `/api/sync/cron`) may use incremental mode for routine polling, but should run full sync reconciliation periodically.
<!-- END:notion-sync-mode-and-manual-trigger -->

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
<!-- END:knowledge-graph-hybrid-protocol -->

<!-- BEGIN:period-picker-dynamic-pathname-rule -->
# PeriodPicker & Shared Filter Dynamic Pathname Routing

When building or updating shared filter components that modify URL search parameters (like `PeriodPicker` or `MonthFilter`):
- NEVER hardcode the target route to `/` or a specific page path in `router.push()`.
- ALWAYS use `usePathname()` from `next/navigation` to dynamically retain the current page location:
  ```ts
  const pathname = usePathname();
  const params = new URLSearchParams(searchParams.toString());
  params.set('period', updatedPeriod);
  router.push(`${pathname}?${params.toString()}`);
  ```
This ensures the filter works seamlessly across any page (e.g. Dashboard `/`, `/production`, `/billing-statement`) without causing unwanted page redirects.
<!-- END:period-picker-dynamic-pathname-rule -->

<!-- BEGIN:period-string-normalization-rule -->
# Period & Month String Normalization Protocol

When filtering tasks or calculating metrics based on month/period selections:
- NEVER rely on strict literal equality (`taskMonth === filter`) or raw `Array.includes()`.
- ALWAYS use a canonical normalization helper (such as `isTaskInPeriods` / `parseTaskMonthToKey` from `@/lib/period-utils`) that converts both the filter key and `taskMonth` strings into standard `YYYY-MM` format before matching.
- This guarantees accurate filtering regardless of whether `taskMonth` is stored as an Indonesian full month (`Agustus-2026`), short month (`Agt-2026`), ISO string (`2026-08`), or numeric month (`8-2026`).
<!-- END:period-string-normalization-rule -->

<!-- BEGIN:unwrapped-metric-cards-rule -->
# Unwrapped Metric Cards Layout Standard

When rendering groups of KPI metric cards or status overview cards:
- DO NOT wrap the grid of cards inside a secondary outer card container (`rounded-2xl border border-[#E8E0D8] bg-white p-6`).
- Render each metric card as an **individual card directly on the page background** (`glass dark:bg-[#111827] rounded-2xl p-5 border border-[#E8E0D8] dark:border-gray-800 bg-white shadow-sm hover:shadow-md transition-all`).
- Maintain standard typography: `font-display font-bold text-3xl` for metric counts, and `w-8 h-8 rounded-lg` with 10% opacity backgrounds (`bg-color/10`) for status icons.
<!-- END:unwrapped-metric-cards-rule -->

<!-- BEGIN:cloudflare-checkbox-style -->
# Cloudflare Checkbox Design & Contrast Inversion Standard

When styling native or custom checkboxes across the application, enforce Cloudflare's exact light/dark contrast inversion pattern:

1. **Light Mode**:
   - Unchecked: `border border-gray-300 bg-white rounded-[5px]`
   - Checked: `bg-black border-black text-white rounded-[5px]`
2. **Dark Mode**:
   - Unchecked: `border border-[#272a34] bg-[#16181d] rounded-[5px]`
   - Checked: `bg-white border-white text-black rounded-[5px]`
3. **Native HTML Inputs**:
   - Native `<input type="checkbox">` should rely on the global CSS rules in `src/app/globals.css` which automatically apply this contrast inversion.
<!-- END:cloudflare-checkbox-style -->

<!-- BEGIN:cloudflare-continuous-card-layout -->
# Cloudflare Continuous Card Container Layout Standard

When building or refactoring multi-section pages (like `/rate-card`, `/billing-statement`, `/account-team`):

1. **Unified Outer Wrapper**: Wrap all sections inside a single continuous container:
   `w-full rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none`.
2. **Corner Radius Preservation**:
   - The top-most child inside the container MUST specify `rounded-t-xl`.
   - The bottom-most child (or `<tbody>` container) MUST specify `rounded-b-xl`.
3. **Sticky Stacking & Overflow Trap Rules**:
   - Top navigation bar: `CloudflareTopBar` (`sticky top-0 z-50 h-14` / `56px`).
   - Inner sticky headers / tab bars: `sticky top-[56px] z-30 bg-white dark:bg-[#0d0e12]`.
   - Ancestor `<main>` and container elements MUST NOT use `overflow-hidden` or `overflow-x-hidden`, which breaks CSS `position: sticky` relative to the window viewport.
<!-- END:cloudflare-continuous-card-layout -->

