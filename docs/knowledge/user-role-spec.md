# Spec: User Role & Login (ID + PIN)

Status: **keputusan dicatat 2026-10-16; belum ada kode.** Menggantikan catatan "belum didesain" di `production-tabs-spec.md`.

## Wireframe (sumber visual)
Artifact: https://claude.ai/artifact/Fvq1og4yp9W5YTAz298HQL — disinkronkan dengan implementasi per 2026-10-16. Artboard **dibuat**: 1 Login ID+PIN, 2 Ganti PIN (wajib & sukarela), 3 Drawer designer › Akun Login, 4 Dropdown akun & Lihat sebagai (+ banner pratinjau), 5 Halaman Profil, 6 Matriks menu & fitur per role. Artboard **USULAN** (belum dibuat): 7 User & Role (daftar), 8 Tambah/edit user. Setiap perubahan UI/role: perbarui artboard terkait agar desain dan kode tidak berbeda.

## Keputusan
1. **Finance dipisah dari Admin** (role sendiri).
2. **Designer boleh melihat task designer lain** (tidak dibatasi ke task miliknya). Edit tetap terbatas pada task miliknya.
3. **Login memakai user yang sudah didaftarkan** (invite-only, tanpa registrasi mandiri):
   - Full-time punya ID sendiri.
   - Freelance punya ID sendiri.
   - Autentikasi **ID + PIN**, bukan password.

## Prinsip
- Role berisi **permission**; kode hanya memanggil `can(user, 'permission', productionUnitId?)`.
- Role melekat pada **Membership** (user x production), `productionUnitId = null` berarti global.
- Cek dilakukan di server (server action, route, page guard); menyembunyikan menu hanya tampilan.

## Role

| Role | Cakupan | Catatan |
| :--- | :--- | :--- |
| `admin` | Global | Semua akses, integrasi (Notion/Dropbox/Google), manajemen user, wizard production. |
| `art_director` | Per production | Kanban, Parameter Issue, Email Notification, Rate Card, review task. |
| `project_manager` | Per production | Seperti AD + Account & Team + buat task. Tanpa konfigurasi integrasi. |
| `finance` | Global / per production | Billing Statement, Approval Payroll, Rate Card (baca). |
| `designer_fulltime` | Per production | Lihat semua task **termasuk Brand/Akun Canva**; edit status/upload task miliknya; Upload Link saja; billing pribadi (baca). |
| `designer_freelance` | Per production | Seperti `designer_fulltime` tetapi **Brand/Akun Canva disembunyikan** (privasi). |
| `viewer` | Per production | Overview + Kanban, baca saja. |

Agency = `designer` dengan flag `isAgency` (satu akun, delegasi diurus agency).

## Privasi Brand/Akun (keputusan 2026-10-16)
Nama brand/akun Canva tidak boleh diketahui semua designer. Hanya **designer full-time** (dan Admin/AD/PM/Finance) yang melihatnya; **designer freelance tidak**.

Hubungan dengan Account & Team: ya. Baris **Brand** di detail task (`TaskDetailSheet.tsx`, field `taskAccounts`/`accountIds`) adalah relasi `Task` ke entitas `Account`, yang dikelola di tab **Canva Accounts** pada halaman Account & Team (bersama tab Designer Team). Jadi sumber datanya sama; yang diatur adalah *siapa boleh melihat*.

- Permission baru: `account.view` (nama brand/akun). Dimiliki Admin, AD, PM, Finance, `designer_fulltime`; tidak untuk `designer_freelance` dan `viewer`.
- Disembunyikan di sisi server (payload tidak memuat `taskAccounts`/`brandName` untuk role tanpa `account.view`), bukan hanya di UI. Cakupan: baris Brand di detail task, kartu Kanban, filter/sort Brand, kolom brand di Billing, dan semua query yang mengembalikan `taskAccounts`/`brandName`.
- Task freelance yang butuh konteks brand: tampilkan label netral (mis. nama doctype/judul), tanpa brand.
- Halaman Account & Team (Designer Team, Canva Accounts) hanya untuk Admin, AD, PM; tidak untuk designer.
- Tipe designer ditentukan `employmentType` user (FT/FL) dan disarankan otomatis saat memilih role di drawer user.
- `viewer` tidak boleh melihat brand/akun (diputuskan 2026-10-16).

## Matriks permission

| Permission | Admin | AD | PM | Finance | Designer | Viewer |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: |
| Overview, Kanban (lihat semua) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Buat/edit task | ✓ | ✓ | ✓ | – | milik sendiri (status, upload) | – |
| Parameter Issue, Email Notification | ✓ | ✓ | ✓ | – | – | – |
| Dropbox Link (view) | ✓ | ✓ | ✓ | – | – | – |
| Upload Link | ✓ | ✓ | ✓ | – | ✓ | – |
| Brand/Akun Canva (`account.view`) | ✓ | ✓ | ✓ | ✓ | FT ✓ · FL – | – |
| Account & Team, Rate Card (edit) | ✓ | ✓ | ✓ | baca | – | – |
| Billing, Payroll | ✓ | – | – | ✓ | milik sendiri | – |
| Integrasi, manajemen user | ✓ | – | – | – | – | – |
| Asset Library — lihat (`asset.view`) | ✓ | ✓ | ✓ | – | ✓ (FT & FL) | – |
| Asset Library — kelola, Asset Report (`asset.manage`) | ✓ semua | production sendiri | production sendiri | – | – | – |
| Production › Canva Insights (`insights.view`) | ✓ | production sendiri | production sendiri | – | – | – |

### Akses aset (2026-10-25)
- Cakupan aset = `Asset.productions` (`AssetProduction`); kosong = **aset bersama** semua production Canva. Designer/AD/PM melihat aset bersama + aset production mereka (`loadAssetLibrary(access.unitIds)`).
- `asset.view`: Admin, AD, PM, designer FT & FL. **Tidak** untuk Finance & Viewer (kartu Assets di brief tetap terlihat lewat `kanban.view`).
- `asset.manage`: AD/PM hanya aset yang **semua** production-nya ada di membership mereka (`canManageAsset`), wajib ≥1 production. Aset bersama, kategori, Sync, dan Impor Notion hanya membership global (`canManageAllAssets`, praktiknya Admin). Asset Report untuk AD/PM sudah difilter ke production sendiri.
- Jangan memakai `can(user, 'asset.manage')` tanpa production untuk aset bersama: itu true untuk membership production mana pun. Guard server: `denyAssetScope` / `denyAssetGlobal` di `src/app/actions/assets.ts`.

## Login ID + PIN
- **ID unik per orang**, format dengan awalan tipe: `FT-001` (full-time), `FL-014` (freelance). Disimpan di `User.userCode` (unique) + `User.employmentType` (`FULL_TIME` | `FREELANCE`).
- **PIN 6 digit**, disimpan sebagai hash (argon2/bcrypt), tidak pernah plaintext.
- Karena PIN ruang kuncinya kecil, wajib:
  - rate limit per ID dan per IP; kunci sementara setelah 5 gagal beruntun (naik bertahap);
  - PIN awal dibuat Admin, **wajib diganti saat login pertama**; reset PIN hanya oleh Admin;
  - tolak PIN lemah (`123456`, `000000`, berulang/berurutan);
  - sesi: cookie httpOnly, signed, kedaluwarsa (mis. 7 hari), dicabut saat user dinonaktifkan;
  - tetap di belakang Basic Auth Nginx sampai migrasi selesai (lapisan luar).
- User nonaktif (`isActive = false`) tidak bisa login; riwayat tetap ada.

## Data (Prisma, rencana)
```
Role        { id, key, name, permissions String[] }
User        { ..., userCode @unique, employmentType, pinHash, pinChangedAt, failedAttempts, lockedUntil, isActive, designerId? }
Membership  { id, userId, roleId, productionUnitId? }   // null = global
Session     { id, userId, expiresAt, ... }
```
Permission key dikumpulkan di `src/lib/permissions.ts`; `src/lib/production-tab-access.ts` dipetakan ke permission tersebut.

## Status implementasi (2026-10-16, pilot Slides Colony)
- Role & permission didefinisikan di kode (`src/lib/permissions.ts`), bukan tabel `Role` (tabel baru hanya `Membership`, `Session`); custom role = fase lanjut.
- **Perubahan dari matriks awal:** `designer_fulltime`/`designer_freelance` **tidak punya Overview** (dashboard agregat memuat brand & total lintas production); landing mereka = Kanban production yang diizinkan.
- Terpasang: guard halaman (`requireAccess`), sidebar per role, tab Parameter Issue/Email disembunyikan, brand/akun dan Dropbox Link dilepas dari payload tanpa `account.view`/`dropboxLink.view`, edit task hanya milik sendiri (`assertCanEditTask`), create/duplicate/delete butuh `task.create`/`task.edit`, Billing designer = `OwnBillingView` (milik sendiri), tombol **Buat Akun Login** di drawer designer (Account & Team).
- Guard server action (`denyUnless` di awal action; jangan dipakai di dalam `runInBackground`): approval-payroll, bundle(-order), designer, email-notification, notion-config, parameter-issue, payroll-status, production-unit, qa (komentar), rate-card, sync. Sengaja TIDAK diguard karena dipanggil dari background/cron: `syncPlatformOptionsToNotion`, `syncDoctypeOptionToNotion`, `syncCanvaEmailsAction`, `getLatestSyncStatus`/`getSyncProgressAction` (hanya metadata log).
- Guard `/api/*` lewat `src/lib/api-auth.ts` (`authorizeApi`): knowledge-graph, notion/databases, OAuth Dropbox/Google (`integration.manage`), upload (`kanban.view`), email-sync (`emailNotification.view` atau `CRON_SECRET`). Tetap publik: `palette/strip`, `uploads/[filename]` (dipakai embed Notion), `sync/cron` (punya `CRON_SECRET` sendiri).
- Rate limit login per IP (`src/lib/rate-limit.ts`, in-memory, 30 percobaan/10 menit) + kunci per akun (5 gagal → 5 menit, naik bertahap).
- Admin bisa mengubah production yang diakses user (tombol Ubah di baris Akun Login) — sesi user dicabut agar hak baru langsung berlaku.
- Belum: halaman manajemen user terpisah, rate limit terdistribusi (bila PM2 cluster >1), Bundle Order hanya untuk Admin (butuh `billing.view` + `task.create`).

## Mode "Lihat sebagai" (pratinjau Admin)
- Admin (`user.manage`) memilih akun aktif non-admin dari dropdown akun di top bar → seluruh app tampil sesuai hak akun itu (sidebar, tab, brand/Dropbox Link tersembunyi, Billing milik sendiri).
- Cookie `cf_view_as` bertanda tangan HMAC (8 jam); hanya berlaku bila sesi nyata punya `user.manage`. Akun dengan izin Admin tidak bisa dipratinjau, dan `user.manage` tidak ikut terbawa.
- **Hanya-baca**: aksi ubah ditolak di server ("Mode pratinjau hanya-baca"): `denyWrite` (action tulis), `assertPermission`, `assertCanEditTask`, `authorizeApi({write:true})`, dan action manajemen user. Aksi baca (`get*/fetch*/list*/check*/validate*/test*`) tetap memakai `denyUnless`. Action tulis baru wajib memakai `denyWrite`.
- Banner bawah layar + tombol "Keluar pratinjau"; Keluar (logout) juga menghapus cookie pratinjau.
- Ditambah: baris Brand & Dropbox Link di drawer task disembunyikan di client untuk role tanpa `account.view`/`dropboxLink.view` (`useAccess`).

## Akun sendiri (semua user login)
- Menu akun di top bar: **Profil Saya** (bila akun terhubung ke profil designer), **Ganti PIN**, **Keluar**.
- **Ganti PIN** = `/change-pin` (sukarela; `forced` hanya untuk PIN awal). Memakai PIN lama, aturan sama (6 angka, bukan berulang/berurutan).
- **Profil Saya** (`MyProfileSlideModal`, hanya-baca) memakai `getMyProfileAction()` — tanpa parameter id (selalu akun efektif), tanpa brand/akun Canva. Isi: statistik (approved/templates/pages), profil (kontrak, status, kontak, rekening), tab **Timeline Karir & Logs** termasuk milestone otomatis (Leaderboard #1, 500/1.000+ pages, promosi, kontrak). Tanpa tambah milestone/promosi; data diubah Admin.
- Dalam mode "Lihat sebagai", menu ini menampilkan profil akun yang dipratinjau dan Ganti PIN disembunyikan.

## Pembaruan menu akun & sidebar (2026-10-16)
- Daftar "Lihat sebagai": penanda akun yang sedang dilihat = label **AKTIF** (titik hijau); baris lain tanpa penanda (bukan checkbox). Daftar hanya tampil untuk Admin.
- Saat pratinjau, tautan **Kelola User & Akses** disembunyikan (hanya tampil di tampilan Admin penuh); Ganti PIN juga disembunyikan.
- **Profil** (sidebar, tepat setelah Billing Statement) → halaman `/profile` (`MyProfileView`) menggantikan drawer; hanya untuk akun terhubung ke profil designer. Menu akun "Profil Saya" menautkan ke halaman yang sama.

## Dropdown akun — versi ringkas (2026-10-16)
- Akun non-admin yang punya profil designer: dropdown hanya **info akun + Keluar**. **Nama akun adalah CTA** ke `/profile` (chevron kanan); tombol "Profil Saya" dan "Ganti PIN" dihapus dari dropdown — Ganti PIN ada di halaman Profil.
- Akun tanpa profil (mis. Admin): tetap ada Ganti PIN. Admin: daftar Lihat sebagai + Kelola User & Akses + Keluar; saat pratinjau ada "Profil akun ini".

## Design Brief hanya-baca untuk designer (2026-10-16)
- Mengubah brief (isi task/`bodyText`) hanya untuk role dengan `task.edit` (Admin, Art Director, Project Manager). Designer FT/FL tetap bisa **membaca, Copy, dan berkomentar**.
- UI: tombol Edit/Preview dan "+ Tambah" di tab Design Brief disembunyikan tanpa `task.edit` (`DesignBriefSection`).
- Server: `updateTaskFieldsAction` membuang `bodyText` bila tanpa `task.edit`; `/api/upload` (gambar referensi/palet brief) kini butuh `task.edit`.

## Halaman User & Role (dibangun 2026-10-16)
- Menu sidebar **User & Role** (MANAGE & OBSERVE, hanya `user.manage`) → `/user-role`: tab **Daftar User** (filter Role/Tipe/Production/Status) dan **Matriks Hak Akses** (dihitung dari `ROLE_PERMISSIONS` via `FEATURE_MATRIX`).
- Drawer Tambah/Edit: nama, tipe (terkunci saat edit), baris akses **role per production**, profil designer (wajib untuk role designer), Reset PIN, Nonaktifkan. Akun non-designer (AD/PM/Finance/Viewer/Admin) dibuat langsung tanpa profil designer.
- Aturan `ROLE_SCOPE`: Admin hanya global; Finance global/per production; lainnya per production. Role designer tidak digabung role lain dan harus cocok dengan tipe (FT/FL).
- Pengaman Admin (`adminSafetyError`): Admin tak bisa menonaktifkan/menurunkan dirinya sendiri; Admin aktif terakhir tak bisa dihapus.
- Kode: `actions/user-management.ts`, `lib/user-admin.ts`, `components/user-role/*`.

## Fase
1. Fondasi: tabel Role/Membership/Session, seed 6 role, login ID+PIN, helper `can()`. User yang ada → Admin.
2. Enforce: tab Parameter Issue/Email Notification, filter sidebar, field Upload/Dropbox Link, billing (Finance).
3. Akses per production: guard `production/[slug]/page.tsx`, filter Hub & sidebar.
4. Halaman manajemen user: tambah user, terbitkan ID, reset PIN, atur role + production, nonaktifkan.

## Scale up
Custom role dari daftar permission; scope per brand/field di `Membership`; multi-tenant (`Organization`); client portal (viewer + approval); audit log (billing/payroll); approval berjenjang payroll; opsional login Google/SSO atau 2FA untuk role sensitif (admin, finance) bila PIN dirasa kurang.

## Risiko yang diterima
PIN-only lebih lemah dari password; dimitigasi lewat rate limit, lockout, dan Basic Auth Nginx. Disarankan 2FA/password untuk `admin` dan `finance` pada fase lanjutan.
