# Spec: Tab Parameter Issue & Email Notification (Production)

Status: **dicatat + konfigurasi akses ditambahkan; belum di-enforce di UI** (sistem role user belum ada).

## Konsep
| Tab | Tujuan |
| :--- | :--- |
| **Parameter Issue** | Menampilkan task dengan field yang belum terisi / belum lengkap (mis. akun, doctype, link, QTY). |
| **Email Notification** | Terhubung ke email untuk *double check* dan notifikasi ketika ada template yang tidak diterima. |

## Hak akses
Kedua fitur (tab + data + action terkait) hanya untuk role: **Art Director**, **Project Manager**.
Role lain (designer, dll.) tidak melihat tab ini.

Konfigurasi: `src/lib/production-tab-access.ts` (`TAB_ACCESS`, `canAccessProductionTab`).

## Catatan implementasi (belum dikerjakan)
- Belum ada role user yang bisa dicek: `User.role` default `"manager"`, `Designer.role` hanya berisi `Art Director` (tanpa `Project Manager`). Tambahkan `Project Manager` ke daftar role setelah sistem role dibuat.
- Saat role tersedia: filter tab di `ProductionTabNav.tsx`, guard render di `ProductionView.tsx`, dan cek role di server action `parameter-issue.ts` / `email-notification.ts` / `api/email-sync`.
- Overview dan Kanban terbuka untuk semua role (diputuskan 2026-10-16).
- Akses per production: user dengan role tertentu nantinya hanya bisa mengakses production (ProductionUnit) tertentu. Belum didesain: perlu relasi user/role ke ProductionUnit, guard di `production/[slug]/page.tsx`, dan filter sidebar/Hub.
