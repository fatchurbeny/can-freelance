<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ui-dropdown-style-consistency -->
# Dropdown Style Consistency

When adjusting dropdowns, keep hover, selected, and disabled states aligned with the app's current light and dark design tokens. Match panel background, text contrast, border strength, and selected highlight to nearby existing controls instead of inventing a new palette.
<!-- END:ui-dropdown-style-consistency -->

<!-- BEGIN:prisma-raw-query-safety -->
# Prisma Raw Query Safety

When using `prisma.$queryRaw`, wrap dynamic SQL in `Prisma.sql` and guard optional filters with `Prisma.empty` so empty inputs do not generate invalid placeholders or `IN ()` fragments.
<!-- END:prisma-raw-query-safety -->
