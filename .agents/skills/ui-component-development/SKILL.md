---
name: ui-component-development
description: Standar pengembangan, refactoring, dan edit komponen UI Next.js 16/React hemat token untuk proyek can-freelance. Trigger otomatis saat membuat/memodifikasi file di src/components/.
---

# UI Component Development & Micro-Refactoring Skill

Gunakan skill ini setiap kali membuat, mengedit, atau merestrukturisasi komponen UI di `src/components/`.

## 📌 Aturan Utama Development UI Hemat Token

1. **Batas Ukuran Baris (Micro-Components Atomization)**:
   - Komponen UI dilarang melebihi **250–300 baris kode** (~15KB).
   - Jika komponen mendekati/melebihi batas ini, WAJIB dipecah ke dalam folder sub-domain (contoh: `src/components/payroll/`, `src/components/kanban/`, `src/components/knowledge/`).

2. **Pengubahan Kode Presisi (Targeted Line Replacement Only)**:
   - DILARANG keras melakukan *full-file rewrite* untuk file >200 baris saat melakukan penyesuaian UI.
   - Selalu gunakan editan baris presisi (`replace_file_content` / `multi_replace_file_content`).

3. **Standardisasi Token Desain & Preservasi Styling**:
   - Salin langsung class Tailwind dari kontrol tetangga ketimbang meng-invent warna/hex baru.
   - Enforce aturan Cloudflare Continuous Card layout (`rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y`).
   - Gunakan `font-mono text-[10px] font-bold uppercase rounded-full px-2.5 py-0.5` untuk pill/badge metrics.

4. **Keamanan Directives & Type Safety**:
   - Selalu sertakan directive `"use client"` di baris paling atas untuk client components.
   - Verifikasi ekspor icon `lucide-react` dan jalankan `npx tsc --noEmit` setelah perubahan JSX.

5. **Sinkronisasi Knowledge Graph**:
   - Setelah membuat sub-komponen baru, catat jalurnya di `docs/knowledge/modules.md`.
