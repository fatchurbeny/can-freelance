# CLAUDE.md — Claude Code Instructions & Protocols

This repository uses a **Hybrid Knowledge Graph & Session Handover System**. To ensure continuity across AI agents and development environments:

## 🚀 Mandatory Pre-Execution Check
Before executing any tool, generating code, or planning architecture:
1. **Read Master Knowledge Index**: [`docs/knowledge/index.md`](docs/knowledge/index.md)
2. **Read Session Handover Log**: [`docs/knowledge/session-handover.md`](docs/knowledge/session-handover.md) to inspect active status and pending work. Keep it small (≈5 KB); full history lives in `docs/knowledge/archive/` and must NOT be read in full — use `grep` there only when a specific past decision is needed.
3. **Identify Your Role & Scope**: Read [`docs/knowledge/roles.md`](docs/knowledge/roles.md). Restrict edits strictly to files owned by your active engineering role.
4. **Read on demand only**: after `index.md`, open only the knowledge modules relevant to the task (see its navigation table). Do not read every file in `docs/knowledge/`.
5. **Impact / dependency questions** ("what uses X", "what breaks if X changes"): query `graph.json` first (e.g. `jq '.links[] | select(.target=="component:X")' graph.json`) before opening source files. If `graph.json` looks stale, run `npm run graphify`.

## 🛠️ Build & Verification Commands
- **Dev Server**: `npm run dev` (Runs Next.js 16 on http://127.0.0.1:3002)
- **Typecheck**: `npx tsc --noEmit`
- **Rebuild Knowledge Graph AST**: `npm run graphify`
- **Prisma Generate**: `npx prisma generate`

## 📏 Non-Negotiable Core Invariants
- **Typography**: Universal **`Inter` (`font-sans`)** for ALL UI components. `font-mono` is strictly quarantined to technical quote fields (Notion DB IDs, secret tokens, code tags, terminal logs).
- **RSC Directives**: Always preserve `"use client"` at line 1 of interactive components.
- **Prisma Serialization**: Wrap raw SQL in `Prisma.sql`. Serialize Decimal fields via `JSON.parse(JSON.stringify(...))`. Coerce dates with `.getTime()`.
- **Cloudflare UI Standard**: Continuous container `rounded-none`, symmetrical 2-column tables, flat search toolbars.
- **Session Handover Closure**: Before ending your conversation, ALWAYS update [`docs/knowledge/session-handover.md`](docs/knowledge/session-handover.md) with your current role signature, status, and decisions. Keep the file ≈5 KB: move older entries to `docs/knowledge/archive/` instead of letting it grow.
