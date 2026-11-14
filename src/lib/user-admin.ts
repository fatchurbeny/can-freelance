import prisma from '@/lib/prisma';
import { DESIGNER_ROLES, isRoleKey, ROLE_LABELS, ROLE_PERMISSIONS, ROLE_SCOPE, type RoleKey } from '@/lib/permissions';

/**
 * ID login karyawan tetap = ID PRO dari roster Portal Impro (sama dengan login improstd), mis. PRO20.
 * Freelance tetap memakai nomor urut FL-001 dst.
 */
export const PRO_CODE_RE = /^PRO\d{2,4}$/;

export const normalizeUserCode = (code: string | null | undefined) => String(code ?? '').trim().toUpperCase().replace(/\s+/g, '');

/** Pesan error bila ID PRO tidak valid atau sudah dipakai akun lain; null bila boleh dipakai. */
export async function proCodeError(code: string, exceptUserId?: string): Promise<string | null> {
  if (!PRO_CODE_RE.test(code)) return 'ID PRO harus "PRO" diikuti 2–4 angka, mis. PRO33.';
  const owner = await prisma.user.findUnique({ where: { userCode: code }, select: { id: true, name: true } });
  if (owner && owner.id !== exceptUserId) return `ID ${code} sudah dipakai ${owner.name || 'akun lain'}.`;
  return null;
}

/** ID untuk akun baru: Full-time wajib ID PRO dari Admin, Freelance otomatis FL-xxx. */
export async function newUserCode(
  employmentType: 'FULL_TIME' | 'FREELANCE',
  proCode?: string | null,
): Promise<{ userCode: string } | { error: string }> {
  if (employmentType === 'FREELANCE') return { userCode: await nextUserCode('FL') };
  const code = normalizeUserCode(proCode);
  if (!code) return { error: 'ID PRO wajib diisi untuk akun Full-time.' };
  const err = await proCodeError(code);
  return err ? { error: err } : { userCode: code };
}

/** Nomor ID berikutnya, mis. FL-014. (FT-xxx tidak lagi diterbitkan; Full-time memakai ID PRO.) */
export async function nextUserCode(prefix: 'FT' | 'FL'): Promise<string> {
  const rows = await prisma.user.findMany({ where: { userCode: { startsWith: `${prefix}-` } }, select: { userCode: true } });
  const max = rows.reduce((m, r) => Math.max(m, Number((r.userCode || '').split('-')[1]) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export function hasAdminRole(memberships: { roleKey: string }[]): boolean {
  return memberships.some((m) => isRoleKey(m.roleKey) && ROLE_PERMISSIONS[m.roleKey].includes('user.manage'));
}

/**
 * Pengaman Admin: mengembalikan pesan error bila perubahan akan (a) membuat Admin menonaktifkan/menurunkan
 * dirinya sendiri atau (b) menyisakan 0 Admin aktif; selain itu null.
 * `next`: kondisi target setelah perubahan.
 */
export async function adminSafetyError(
  actorId: string,
  targetId: string,
  next: { isActive: boolean; memberships?: { roleKey: string }[] },
): Promise<string | null> {
  const target = await prisma.user.findUnique({ where: { id: targetId }, include: { memberships: true } });
  if (!target || !target.isActive || !hasAdminRole(target.memberships)) return null; // bukan Admin aktif: aman
  const stillAdmin = next.isActive && (next.memberships ? hasAdminRole(next.memberships) : true);
  if (stillAdmin) return null;
  if (actorId === targetId) return 'Admin tidak boleh menonaktifkan atau menurunkan akunnya sendiri.';
  const others = await prisma.user.findMany({
    where: { isActive: true, id: { not: targetId } },
    include: { memberships: true },
  });
  if (!others.some((u) => hasAdminRole(u.memberships))) return 'Tidak bisa: ini Admin aktif terakhir.';
  return null;
}

export interface MembershipInput {
  roleKey: string;
  productionUnitId: string | null;
}

export interface UserRow {
  id: string;
  userCode: string;
  name: string | null;
  employmentType: string | null;
  isActive: boolean;
  pinMustChange: boolean;
  locked: boolean;
  lastLoginAt: string | null;
  designerId: string | null;
  designerName: string | null;
  memberships: MembershipInput[];
}

/** Semua akun ber-ID (untuk tabel User & Role). */
export async function loadUserRows(): Promise<UserRow[]> {
  const users = await prisma.user.findMany({
    where: { userCode: { not: null } },
    include: { memberships: true, designer: { select: { displayName: true } } },
    orderBy: { userCode: 'asc' },
  });
  const now = Date.now();
  return users.map((u) => ({
    id: u.id,
    userCode: u.userCode as string,
    name: u.name,
    employmentType: u.employmentType,
    isActive: u.isActive,
    pinMustChange: u.pinMustChange,
    locked: !!u.lockedUntil && u.lockedUntil.getTime() > now,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    designerId: u.designerId,
    designerName: u.designer?.displayName ?? null,
    memberships: u.memberships.map((m) => ({ roleKey: m.roleKey, productionUnitId: m.productionUnitId })),
  }));
}

/**
 * Validasi keanggotaan sesuai ROLE_SCOPE. `excludeUserId`: akun yang sedang diedit (boleh memakai profil designer-nya sendiri).
 * Mengembalikan pesan error, atau null bila valid.
 */
export async function validateMembershipInput(
  employmentType: string | null,
  memberships: MembershipInput[],
  designerId: string | null | undefined,
  excludeUserId?: string,
): Promise<string | null> {
  if (memberships.length === 0) return 'Tambahkan minimal satu akses (role).';
  const seen = new Set<string>();
  for (const m of memberships) {
    if (!isRoleKey(m.roleKey)) return 'Role tidak dikenal.';
    const scope = ROLE_SCOPE[m.roleKey];
    if (m.productionUnitId === null && scope === 'unit') return `${ROLE_LABELS[m.roleKey]} harus ditetapkan per production.`;
    if (m.productionUnitId !== null && scope === 'global') return `${ROLE_LABELS[m.roleKey]} hanya berlaku global (semua production).`;
    const key = `${m.roleKey}|${m.productionUnitId ?? 'ALL'}`;
    if (seen.has(key)) return 'Ada akses yang duplikat.';
    seen.add(key);
  }
  const unitIds = memberships.map((m) => m.productionUnitId).filter((id): id is string => !!id);
  if (unitIds.length) {
    const found = await prisma.productionUnit.count({ where: { id: { in: unitIds } } });
    if (found !== new Set(unitIds).size) return 'Production tidak ditemukan.';
  }
  const roleKeys = memberships.map((m) => m.roleKey as RoleKey);
  const designerRoles = roleKeys.filter((r) => DESIGNER_ROLES.includes(r));
  if (designerRoles.length > 0) {
    if (designerRoles.length !== roleKeys.length || new Set(designerRoles).size > 1) {
      return 'Role designer tidak boleh digabung dengan role lain.';
    }
    if (!designerId) return 'Pilih profil designer untuk role designer.';
    const expected = designerRoles[0] === 'designer_fulltime' ? 'FULL_TIME' : 'FREELANCE';
    if (employmentType !== expected) return `Role ${ROLE_LABELS[designerRoles[0]]} harus bertipe ${expected === 'FULL_TIME' ? 'Full-time' : 'Freelance'}.`;
    const designer = await prisma.designer.findUnique({ where: { id: designerId }, include: { user: { select: { id: true } } } });
    if (!designer) return 'Profil designer tidak ditemukan.';
    if (designer.user && designer.user.id !== excludeUserId) return 'Profil designer itu sudah punya akun.';
  } else if (designerId) {
    return 'Profil designer hanya untuk role designer.';
  }
  return null;
}
