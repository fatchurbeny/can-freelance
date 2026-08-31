# Issues, Gotchas & Layout Rules — CAN-Freelance

Dokumen ini mencatat histori bug, edge cases, serta aturan layout CSS/React untuk mencegah bug terulang di masa depan.

---

## ⚡ Gotchas Teknis & Framework Rules

### 1. Preservasi Directive Next.js `"use client"`
* **Masalah**: Refactoring atau rewrite file React Server Component yang membutuhkan React hooks (`useState`, `useEffect`) tanpa `"use client"` akan menyebabkan crash RSC.
* **Aturan**: Wajib mempertahankan directive `"use client"` di baris paling atas file komponen client.

### 2. Prisma Decimal & Date Serialization
* **Decimal Fields**: Field Prisma `Decimal` (`poolScore`, `pages`, `qtySubmit`) BUKAN JS primitive number. Saat mengirim data ke Client Component, WAJIB diserialisasi dengan `JSON.parse(JSON.stringify(data))`.
* **DateTime Fields**: Coerce field tanggal sebelum melakukan perbandingan timestamp:
  ```typescript
  const getTime = (v?: string | number | null) => 
    v == null ? 0 : typeof v === 'number' ? v : new Date(v).getTime();
  return getTime(b.lastEditedTime) - getTime(a.lastEditedTime);
  ```

---

## 🎨 Tailwind & UI Layout Rules

### 1. Prevensi Overflow Clipping pada Floating UI
* **Masalah**: Elemen melayang (*floating UI* seperti dropdown/tooltip) terpotong (*clipped*) oleh kontainer induk.
* **Aturan**: Dilarang menempatkan elemen melayang berposisi `absolute` di dalam kontainer induk yang menggunakan `overflow-hidden`, `overflow-auto`, atau `overflow-scroll`.

### 2. Prevensi Stacking Context Trap
* **Masalah**: Penggunaan `opacity-*`, `transform`, `grayscale`, atau `backdrop-blur` pada kontainer induk membuat stacking context baru yang menjebak dropdown di bawah baris berikutnya.
* **Aturan**: Terapkan kelas visual state langsung ke elemen anak spesifik (teks/avatar), bukan pada pembungkus induk tempat dropdown berada.

### 3. Sidebar Desktop Default State (Mini Rail ~72px)
* **Aturan Layout**: Pada layar desktop (`md:` breakpoint), Sidebar berstatus default mini icon rail (~72px) yang selalu tampil di dalam flow flex row (`md:translate-x-0`). Jangan pernah meng-unmount atau memberikan `-translate-x-full` pada desktop.
