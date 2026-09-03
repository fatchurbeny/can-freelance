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

3. **Standardisasi Token Desain, Form & Tipografi (Strict Non-Negotiable)**:
   - Salin langsung class Tailwind dari kontrol tetangga ketimbang meng-invent warna/hex baru.
   - **Prohibisi Select Native**: DILARANG KERAS menggunakan `<select>` HTML native. Selalu gunakan komponen custom Cloudflare Dropdown (`CategorySelectCell`, `RoleSelectCell`, atau dropdown panel custom).
   - **Mandatory Inter (`font-sans`)**: Seluruh teks UI (tabel, handle nama, subtitle identifier, aspek rasio, nominal `Rp 15.000`, modal, dan form controls) WAJIB menggunakan Inter (`font-sans`). `font-mono` HANYA diizinkan untuk Notion DB ID, secret tokens, `<pre><code>`, dan console logs.
   - **Zero Open Question**: LLM DILARANG menanyakan open question terkait penggunaan select native atau font. Langsung terapkan aturan baku secara otomatis.

4. **Keamanan Directives, Audit Checklist & Type Safety**:
   - Selalu sertakan directive `"use client"` di baris paling atas untuk client components.
   - **Mandatory UI Grep Audit**: Jalankan `grep_search` pada file yang diubah untuk memastikan 0 tag `<select>` dan 0 `font-mono` ilegal.
   - Verifikasi ekspor icon `lucide-react` dan jalankan `npx tsc --noEmit` setelah perubahan JSX.

5. **Sinkronisasi Knowledge Graph**:
   - Setelah membuat sub-komponen baru, catat jalurnya di `docs/knowledge/modules.md`.
