# SaaS Business Rules & Metrics Standard — CAN-Freelance

Dokumen ini mendefinisikan seluruh aturan bisnis, rumus perhitungan SaaS, dan standar penamaan dinamis yang wajib dipatuhi oleh seluruh sistem.

---

## 📊 Rumus Perhitungan SaaS Metrics

| Metrik | Formula / Definis Perhitungan | Penjelasan & Contoh |
| :--- | :--- | :--- |
| **Count QTY Pages** | `SUM(qty_submit * pages)` per task | Jumlah total halaman aktual yang dikerjakan. Contoh: 2 template submit @12 pages = 24 pages. |
| **Count Templates** | `SUM(qty_submit)` | Nilai dari kuantitas template yang disubmit desainer. |
| **Count Tasks / Approved Tasks** | `COUNT(distinct task_id)` | Jumlah total kartu/baris tugas Notion aktual. |
| **Base Template Pages** | `MAX(pages)` dalam grouped query | Jumlah ukuran halaman statis doctype (misal `@12Pages`), BUKAN penjumlahan halaman antar tugas. |

---

## 💰 Aturan Logika Payroll & Designer Status

1. **Pemeriksaan Status Desainer**:
   * Desainer Aktif: `designer.status === 'Active'`
   * Desainer Resign: `designer.status === 'Resign'`
2. **Aturan Khusus Resign**:
   * Desainer dengan status `Resign` **HARUS memiliki total pembayaran payroll = 0**.
   * Di antarmuka UI (`ApprovalPayrollTable.tsx`), desainer bertatus Resign ditampilkan dengan badge merah dan teks dicoret (*strikethrough*).
3. **Status Non-Aktif Lainnya**:
   * Status seperti `'Hold'` atau `'Inactive'` menggunakan badge warna Amber (Kuning) dan kalkulasi payroll mengikuti aturan penangguhan.

---

## 🗓️ Dynamic Period Labels Standard

Setiap string UI yang mereferensikan periode waktu (seperti pada header board atau widget) **WAJIB menyesuaikan dengan filter bulan yang aktif** (`filters.taskMonths`):

* **Single Month**: `Doctype created <NamaBulan>-<Tahun>` (contoh: `Doctype created Agustus-2026`).
* **Multiple Months**: `Doctype created in N months` (menyesuaikan dengan konvensi `N Bulan` pada toolbar).
* **Tanpa Seleksi Filter**: Kembali ke label dasar umum (`Doctype created`).
* **Lokalisasi Bulan**: Selalu gunakan bahasa Indonesia (`Januari`, `Februari`, `Maret`, `April`, `Mei`, `Juni`, `Juli`, `Agustus`, `September`, `Oktober`, `November`, `Desember`).
