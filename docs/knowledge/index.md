# Master Knowledge Graph Index — CAN-Freelance

Dokumen ini merupakan **Peta Utama (Master Index)** untuk Knowledge Graph proyek `can-freelance`. Dokumen ini dirancang khusus untuk memberikan penelusuran kontekstual (*on-demand token retrieval*) bagi LLM (Gemini, Claude, GPT) dan Code Editor (Antigravity IDE, Cursor, VS Code, Claude Code).

---

## 📌 Navigasi Cepat Modul Pengetahuan

Untuk menghemat konsumsi token, **baca hanya modul yang relevan** dengan tugas yang sedang Anda kerjakan:

| Modul Pengetahuan | Path File | Isi Utama & Cakupan Informasi |
| :--- | :--- | :--- |
| **Engineering Roles & Ownership** | [`docs/knowledge/roles.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/roles.md) | Definisi 6 peran rekayasa (`Frontend`, `Backend`, `API`, `Business`, `Architecture`, `DevOps`), *file ownership*, *invariants*, & protokol penambahan peran baru. |
| **Data Models & Schema** | [`docs/knowledge/entities.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/entities.md) | Skema Prisma DB, Properti Notion API, Relasi Entitas (`Task`, `Designer`, `Doctype`, `Brand`, `DesignStatus`, dll.). |
| **App Architecture & Modules** | [`docs/knowledge/modules.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/modules.md) | Peta Rute App Router (`/production`, `/billing-statement`, `/knowledge-graph`), Server Actions, & Component Tree. |
| **SaaS Business Rules** | [`docs/knowledge/business-rules.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/business-rules.md) | Rumus resmi (`QTY Pages = qty_submit * pages`), Aturan Payroll Designer Resign, & Dynamic Month Labeling. |
| **Notion Sync Data Flows** | [`docs/knowledge/data-flows.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/data-flows.md) | Alur Full Sync vs Incremental Cron Sync, Parsing Notion Rich Text, & Pemetaan Status Alias. |
| **Form, Drawer & CRUD Layout Standard** | [`docs/knowledge/form-crud-rules.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/form-crud-rules.md) | Blueprint standar resmi untuk Slide-over Drawer Modal, Custom Cloudflare Dropdowns, Symmetrical 2-Column Table Grid, Slim Label Line Heights, & Palet Warna. |
| **Issues, Gotchas & Layout Rules** | [`docs/knowledge/issues-and-fixes.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/issues-and-fixes.md) | Catatan pencegahan bug, Next.js `"use client"` directives, Prisma Decimal serialization, & Tailwind layout traps. |
| **Session Handover Log** | [`docs/knowledge/session-handover.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/session-handover.md) | Status tugas aktif, histori keputusan arsitektur terkini, & catatan kontinuitas antar LLM/editor. |

---

## 🤖 Protokol Indexing LLM (LLM Quick Protocol)

1. **Awal Sesi**:
   - Periksa [`docs/knowledge/session-handover.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/session-handover.md) untuk memahami tugas aktif terakhir.
   - Buka modul spesifik di atas sesuai fokus pengerjaan (contoh: jika mengerjakan UI/Komponen, baca `modules.md` & `issues-and-fixes.md`).
2. **Penelusuran Kode Teknis (AST Call Graph)**:
   - Jika membutuhkan penelusuran panggilan fungsi atau dependensi import level rendah, periksa `graph.json` jika tersedia.
   - Struktur: `nodes[]` (`id`, `label`, `type` = page|component|action|model|doc, `filepath`) dan `links[]` (`source`, `target`, `relation` = renders|invokes|queries|enforces|imports). Prefix id: `page:/route`, `layout:/route`, `component:Nama`, `action:<file actions>`, `lib:<file src/lib>` (kecuali `action:sync-notion`/`action:queries`), `api:/route`, `model:NamaPrisma`. Ditemukan otomatis oleh `scripts/graphify-parser.ts`. Jangan dibaca utuh (±150 KB); filter dengan `jq`.
   - Contoh: `jq '.links[] | select(.target=="component:TopBar") | .source' graph.json`
   - Jika terlihat usang, jalankan `npm run graphify`.
3. **Akhir Sesi**:
   - WAJIB perbarui [`docs/knowledge/session-handover.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/session-handover.md) sebelum menutup sesi percakapan.

- [Multi-Production Plan](multi-production-plan.md) — rencana bertahap production per platform (Fase 1–7)
- [Spec Tab Parameter Issue & Email Notification](production-tabs-spec.md) — konsep + akses Art Director / Project Manager
- [Backlog: Resources Library / Asset Library](../backlog/resources-library.md) — Asset Library jalur manual + mirror Notion (`/assets`, picker di Design Brief) sudah diimplementasikan; jalur Canva API ditunda (MFA)
- [Spec User Role & Login ID+PIN](user-role-spec.md) — 7 role berbasis permission, Membership per production, login ID+PIN, Lihat sebagai, Profil; wireframe: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL
- [Backlog: Role kustom & matriks bisa diedit](../backlog/custom-roles-matrix.md) — rencana role kustom (tabel Role, editor matriks); BELUM dikerjakan
- [Pola Dropdown Sidebar](sidebar-dropdown-pattern.md) — aturan grup/dropdown sidebar gaya tab Dia (hanya anak aktif, expand per grup)
- [Spec Canva Insights Tracker](canva-insights-spec.md) — Applies/Usages harian per template dari 5 akun Creator (collector Playwright di iMac → API ingest), tautan template ↔ task via ID desain; brief kerja: [`../backlog/canva-insights-implementation.md`](../backlog/canva-insights-implementation.md); mapping field per endpoint: [`../canva-insights-endpoints.md`](../canva-insights-endpoints.md); Fase 1 (skema, parser, API) di branch `feat/canva-insights`, belum `db push`
- [Arsip Session Handover](archive/session-handover-through-2026-10-16.md) — riwayat lengkap sampai 2026-10-16; JANGAN dibaca utuh, cukup `grep`
