# Pola Dropdown Sidebar (gaya grup tab Dia)

Standar untuk menu sidebar yang punya submenu. Implementasi acuan: `src/components/Sidebar.tsx` (grup **Overview** dan **Production**). Ikuti pola ini saat menambah dropdown baru.

## Perilaku (wajib)

1. **Tertutup secara default.** Grup tidak menampilkan anak apa pun kecuali ada anak yang aktif atau grup di-expand.
2. **Ada anak aktif → hanya anak aktif yang tampil.** Anak lain disembunyikan (seperti tab aktif di grup tab Dia). Item aktif = kartu tipis berborder + teks oranye.
3. **Klik chevron → expand semua anak.** Klik lagi → kembali ke "hanya yang aktif" (atau tertutup bila tidak ada yang aktif).
4. **Grup lain tidak terpengaruh.** Status expand disimpan per nama grup (`expandedGroups[item.name]`), bukan global. Membuka halaman di grup lain tidak boleh membuka/menutup grup ini.
5. **Header grup**:
   - Punya halaman sendiri (mis. Production → `/production`): header = `Link`, chevron = tombol terpisah.
   - Belum punya halaman (mis. Overview): header = `button` yang hanya toggle; root `/` mengarahkan ke anak pertama (`redirect` di `page.tsx`).
6. **Aksi tambahan** (mis. "Tambah Production") hanya tampil saat grup expand penuh, atau saat halamannya sendiri sedang aktif.
7. Status expand **tidak** disimpan di `localStorage`; selalu mulai dari "hanya yang aktif".

## Rumus state

```ts
const childActive = /* pathname/query cocok dengan salah satu anak */;
const expanded = !!expandedGroups[item.name];
const isOpen = hasChildren && (expanded || childActive);   // render kontainer anak
const activeUnitOnly = !expanded && childActive;           // filter: hanya anak aktif
```

Daftar anak: `children.filter(c => !activeUnitOnly || c.isActive)`.

## Gaya (struktur pohon dengan garis pemandu)

- **Tidak ada kontainer berlatar dan tidak ada bayangan.** Anak berada di bawah header dengan garis vertikal 1px di kiri (`ml-5 pl-3 border-l border-gray-200`), sejajar dengan tengah ikon header, seperti pohon file.
- Anak: `px-3 py-1.5 rounded-lg border text-xs`. Aktif: `bg-gray-50 border-gray-200 text-[#ff5e1f] font-semibold` (kartu tipis berborder, teks oranye). Tidak aktif: `border-transparent` + abu-abu, hover tint. Tidak ada titik indikator di anak.
- Header aktif memakai tint `bg-[#f0f0f0]` tanpa border. Chevron `absolute right-0` DI DALAM baris header (header memberi `pr-8`).
- Chevron `ChevronRight` memutar `rotate-90` saat `expanded`; `aria-expanded` + `aria-label` wajib.
- Font tetap `Inter` (`font-sans`); jangan pakai `font-mono`.
- Jangan menambah `shadow` pada item aktif; bayangan terpotong oleh `overflow-hidden` pembungkus animasi.

## Menambah dropdown baru

1. Tambahkan item di `menuItems` dan tentukan sumber anak-nya.
2. Definisikan `childActive` untuk item itu.
3. Pakai kontainer/anak yang sama; jangan salin state baru — cukup `expandedGroups`.
4. Anak yang membawa filter bulan menambahkan `period` ke URL (`?` atau `&` sesuai base).
5. Verifikasi: buka halaman anak → hanya anak itu tampil; buka halaman grup lain → grup ini tertutup; klik chevron → semua tampil.

## Kelancaran navigasi (wajib dijaga)

- `Sidebar` dipasang **sekali** di `src/app/layout.tsx` lewat `components/AppSidebar.tsx` (bukan di tiap `page.tsx`), sehingga tidak dibuat ulang saat pindah halaman. Halaman yang tidak butuh sidebar didaftarkan di `NO_SIDEBAR_PREFIXES`. **Jangan** render `<Sidebar>` di page/komponen halaman lagi.
- Status aktif dihitung langsung dari `usePathname()` + `useSearchParams()` (tanpa `useEffect`/state) agar tidak berkedip.
- Daftar anak di-refetch senyap tiap `pathname` berubah; daftar lama tetap tampil selama menunggu.
- Buka/tutup dianimasikan: kontainer anak selalu dirender dengan `grid` + `transition-[grid-template-rows,opacity]` (`0fr` ↔ `1fr`), bukan render bersyarat.
