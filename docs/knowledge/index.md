# Master Knowledge Graph Index — CAN-Freelance

Dokumen ini merupakan **Peta Utama (Master Index)** untuk Knowledge Graph proyek `can-freelance`. Dokumen ini dirancang khusus untuk memberikan penelusuran kontekstual (*on-demand token retrieval*) bagi LLM (Gemini, Claude, GPT) dan Code Editor (Antigravity IDE, Cursor, VS Code, Claude Code).

---

## 📌 Navigasi Cepat Modul Pengetahuan

Untuk menghemat konsumsi token, **baca hanya modul yang relevan** dengan tugas yang sedang Anda kerjakan:

| Modul Pengetahuan | Path File | Isi Utama & Cakupan Informasi |
| :--- | :--- | :--- |
| **Data Models & Schema** | [`docs/knowledge/entities.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/entities.md) | Skema Prisma DB, Properti Notion API, Relasi Entitas (`Task`, `Designer`, `Doctype`, `Brand`, `DesignStatus`, dll.). |
| **App Architecture & Modules** | [`docs/knowledge/modules.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/modules.md) | Peta Rute App Router (`/production`, `/billing-statement`, `/knowledge-graph`), Server Actions, & Component Tree. |
| **SaaS Business Rules** | [`docs/knowledge/business-rules.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/business-rules.md) | Rumus resmi (`QTY Pages = qty_submit * pages`), Aturan Payroll Designer Resign, & Dynamic Month Labeling. |
| **Notion Sync Data Flows** | [`docs/knowledge/data-flows.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/data-flows.md) | Alur Full Sync vs Incremental Cron Sync, Parsing Notion Rich Text, & Pemetaan Status Alias. |
| **Issues, Gotchas & Layout Rules** | [`docs/knowledge/issues-and-fixes.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/issues-and-fixes.md) | Catatan pencegahan bug, Next.js `"use client"` directives, Prisma Decimal serialization, & Tailwind layout traps. |
| **Session Handover Log** | [`docs/knowledge/session-handover.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/session-handover.md) | Status tugas aktif, histori keputusan arsitektur terkini, & catatan kontinuitas antar LLM/editor. |

---

## 🤖 Protokol Indexing LLM (LLM Quick Protocol)

1. **Awal Sesi**:
   - Periksa [`docs/knowledge/session-handover.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/session-handover.md) untuk memahami tugas aktif terakhir.
   - Buka modul spesifik di atas sesuai fokus pengerjaan (contoh: jika mengerjakan UI/Komponen, baca `modules.md` & `issues-and-fixes.md`).
2. **Penelusuran Kode Teknis (AST Call Graph)**:
   - Jika membutuhkan penelusuran panggilan fungsi atau dependensi import level rendah, periksa `graph.json` jika tersedia.
3. **Akhir Sesi**:
   - WAJIB perbarui [`docs/knowledge/session-handover.md`](file:///Users/fatchurbeny/Documents/Project/can-freelance/docs/knowledge/session-handover.md) sebelum menutup sesi percakapan.
