<!-- BEGIN:rounded-charts-rule -->
# Chart Design Style

Always ensure that all charts (Bar charts, Donut charts, Gauge charts, etc.) use a rounded corner design style. 
For Recharts:
- Use `cornerRadius` on `<Pie>` components.
- Use `radius` on `<Bar>` components.
- Ensure appropriate gaps between segments using `paddingAngle` for pies/donuts, or a stroke colored the same as the background for stacked bars.
<!-- END:rounded-charts-rule -->

<!-- BEGIN:prisma-schema-update-workflow -->
# Prisma Schema Updates

When making changes to the `schema.prisma` file (e.g., adding or modifying fields):
1. Always run `npx prisma db push` (or `migrate dev`) to sync the database schema.
2. Always run `npx prisma generate` to rebuild the TypeScript types for `@prisma/client`.
3. If the Next.js dev server is running, explicitly instruct the user to restart it so the updated Prisma Client is properly loaded.
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
