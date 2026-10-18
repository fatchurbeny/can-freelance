# Backlog: Role kustom & matriks hak akses yang bisa diedit

Status: **dicatat 2026-10-16, belum dikerjakan.** Lanjutan dari `docs/knowledge/user-role-spec.md` (halaman User & Role sudah dibangun, matriks masih baca-saja).

## Latar belakang
Tujuh role dan permission-nya ditulis di kode (`src/lib/permissions.ts`: `ROLE_PERMISSIONS`, `ROLE_SCOPE`, `FEATURE_MATRIX`). Mengubah hak akses = ubah kode + deploy. Semua pengecekan sudah lewat satu pintu (`can(user, permission, unitId)`, `denyUnless`/`denyWrite`, `requireAccess`, `authorizeApi`), jadi arsitekturnya siap dibuat fleksibel tanpa menulis ulang guard.

## Tujuan
Admin bisa membuat role baru (mis. "Reviewer QA", "PM Billing") dengan kombinasi permission sendiri, lalu memilihnya di drawer user seperti role lain.

## Pendekatan yang disarankan
1. **Role kustom** (prioritas). Tabel `Role` (`key`, `name`, `permissions String[]`, `isSystem`). 7 role bawaan di-seed dan terkunci (`isSystem = true`; tidak bisa diubah/dihapus). `Membership.roleKey` sudah teks → bisa menunjuk role kustom tanpa migrasi data.
2. **Penyesuaian per user** (opsional, setelah 1): tambah/cabut permission di atas role untuk kasus langka. Risiko: pengecualian menumpuk dan sulit dilacak.

## Rancangan teknis
- **DB:** model `Role`; opsional `RoleAuditLog` (siapa mengubah apa & kapan, snapshot sebelum/sesudah).
- **Kode:** `ROLE_PERMISSIONS` diganti pembacaan dari DB dengan cache (invalidasi saat matriks diubah); seed role bawaan idempoten saat start. `ROLE_LABELS`, `ROLE_SCOPE`, `isRoleKey`, `ROLE_KEYS` ikut dinamis. Pastikan `src/lib/permissions.ts` yang dipakai di client (sidebar, `AccessInfo`) tetap menerima data lewat props/context, bukan impor konstanta.
- **Daftar permission tetap dari kode** (`Permission` union): yang fleksibel adalah kombinasinya; jenis izin baru tetap butuh perubahan kode karena tiap izin harus dijaga di server.
- **UI:** tab Matriks di `/user-role` berubah menjadi editor: kolom per role, centang per permission, tombol **Tambah Role**, **Duplikat**, **Hapus** (hanya role kustom tak terpakai). Hak "terbatas" (◐) tetap berasal dari pasangan `.own` (`task.edit.own`, `billing.view.own`), bukan opsi bebas.
- **Pengaman:** `user.manage` hanya boleh dimiliki role yang tak bisa dihapus (minimal satu Admin tetap ada); perubahan matriks mencabut sesi user terkait (`destroyAllSessions`); role yang masih dipakai Membership tidak bisa dihapus; Lihat sebagai tetap menolak akun dengan `user.manage`.
- **`ROLE_SCOPE` kustom:** role baru memilih cakupan (global / per production / keduanya) saat dibuat.

## Pertanyaan yang perlu diputuskan sebelum mulai
1. Apakah hak ◐ (baca saja / milik sendiri) perlu bisa dikustomisasi? Saran: tidak dulu.
2. Apakah perubahan matriks dicatat (audit log)? Saran: ya, satu tabel sederhana.
3. Apakah role bawaan boleh diubah? Saran: tidak, cukup diduplikat lalu diedit.
4. Apakah perlu penyesuaian per user (opsi 2) di fase yang sama? Saran: nanti.

## Dampak ke dokumen/desain
- Perbarui `user-role-spec.md` (model data), wireframe artboard 6 (matriks) menjadi editor, dan `FEATURE_MATRIX` agar tetap diturunkan dari data role dinamis.
- Verifikasi: buat role kustom, tetapkan ke user uji, cek lewat Lihat sebagai (sidebar/tab/aksi server), coba hapus role terpakai & cabut `user.manage` dari role terakhir (harus ditolak).
