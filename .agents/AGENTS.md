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
<!-- END:ui-tailwind-best-practices -->

<!-- BEGIN:nextjs-preserve-directives-rule -->
# Preserve Next.js Directives

When modifying, replacing, or rewriting Next.js component files (especially using code replacement tools), you MUST strictly preserve any existing file-level directives at the very top of the file, most notably `"use client"`. 
- If a component relies on React hooks (`useState`, `useEffect`, `useRef`), event listeners (`onClick`), or browser APIs, it MUST have the `"use client"` directive at the top.
- Failure to preserve this directive will cause React Server Component (RSC) build errors and crash the application.
<!-- END:nextjs-preserve-directives-rule -->
