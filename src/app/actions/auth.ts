'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { tooManyAttempts } from '@/lib/rate-limit';
import { generatePin, hashPin, validatePinStrength, verifyPin } from '@/lib/pin';
import { clearViewAs, createSession, destroyAllSessions, destroySession, getCurrentUser, setViewAs } from '@/lib/session';
import { isPreviewing } from '@/lib/access';
import { adminSafetyError, nextUserCode } from '@/lib/user-admin';
import { can, isRoleKey, ROLE_LABELS, ROLE_PERMISSIONS, type RoleKey } from '@/lib/permissions';

const MAX_FAILED = 5;
const GENERIC_LOGIN_ERROR = 'ID atau PIN salah.';

function lockMinutes(failed: number): number {
  const step = Math.floor(failed / MAX_FAILED); // 1,2,3…
  return Math.min(60, 5 * 2 ** (step - 1));
}

export async function loginAction(userCode: string, pin: string) {
  try {
    const h = await headers();
    const ip = (h.get('x-forwarded-for') || h.get('x-real-ip') || 'local').split(',')[0].trim();
    if (tooManyAttempts(ip)) {
      return { success: false, error: 'Terlalu banyak percobaan dari perangkat ini. Coba lagi beberapa menit lagi.' };
    }
    const code = userCode.trim().toUpperCase();
    const user = code ? await prisma.user.findUnique({ where: { userCode: code } }) : null;

    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return { success: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit atau hubungi Admin.` };
    }

    const ok = verifyPin(pin, user?.pinHash);
    if (!user || !ok) {
      if (user) {
        const failed = user.failedAttempts + 1;
        const lock = failed % MAX_FAILED === 0 ? new Date(Date.now() + lockMinutes(failed) * 60000) : null;
        await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: failed, lockedUntil: lock } });
        const left = MAX_FAILED - (failed % MAX_FAILED);
        if (!lock) return { success: false, error: `${GENERIC_LOGIN_ERROR} Sisa ${left} percobaan.` };
        return { success: false, error: 'Terlalu banyak percobaan. Akun dikunci sementara.' };
      }
      return { success: false, error: GENERIC_LOGIN_ERROR };
    }
    if (!user.isActive) return { success: false, error: 'Akun dinonaktifkan. Hubungi Admin.' };

    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await createSession(user.id);
    return { success: true, mustChangePin: user.pinMustChange };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal masuk.' };
  }
}

export async function logoutAction() {
  await destroySession();
  return { success: true };
}

export async function changePinAction(oldPin: string, newPin: string, confirmPin: string) {
  try {
    if (await isPreviewing()) return { success: false, error: 'Mode pratinjau hanya-baca.' };
    const me = await getCurrentUser();
    if (!me) return { success: false, error: 'Sesi berakhir. Silakan masuk lagi.' };
    if (newPin !== confirmPin) return { success: false, error: 'Ulangi PIN baru tidak sama.' };
    const weak = validatePinStrength(newPin);
    if (weak) return { success: false, error: weak };
    if (newPin === oldPin) return { success: false, error: 'PIN baru harus berbeda dari PIN lama.' };

    const user = await prisma.user.findUnique({ where: { id: me.id } });
    if (!user || !verifyPin(oldPin, user.pinHash)) return { success: false, error: 'PIN lama salah.' };

    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: hashPin(newPin), pinMustChange: false, pinChangedAt: new Date() },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengganti PIN.' };
  }
}

function employmentFromContract(contractType: string | null | undefined): 'FULL_TIME' | 'FREELANCE' {
  return /full/i.test(contractType || '') ? 'FULL_TIME' : 'FREELANCE';
}

/**
 * Buat akun login untuk satu profil designer (tombol "Buat Akun Login" di Account & Team).
 * Tipe/role diturunkan dari `Designer.contractType`. PIN awal dikembalikan SEKALI.
 */
export async function createDesignerLoginAction({
  designerId,
  productionUnitIds,
}: {
  designerId: string;
  productionUnitIds: string[];
}) {
  try {
    if (await isPreviewing()) return { success: false, error: 'Mode pratinjau hanya-baca.' };
    const me = await getCurrentUser();
    if (!can(me, 'user.manage')) return { success: false, error: 'Tidak punya izin.' };
    if (productionUnitIds.length === 0) return { success: false, error: 'Pilih minimal satu production.' };

    const designer = await prisma.designer.findUnique({ where: { id: designerId }, include: { user: true } });
    if (!designer) return { success: false, error: 'Designer tidak ditemukan.' };
    if (designer.user) return { success: false, error: `Designer sudah punya akun (${designer.user.userCode}).` };

    const employmentType = employmentFromContract(designer.contractType);
    const roleKey: RoleKey = employmentType === 'FULL_TIME' ? 'designer_fulltime' : 'designer_freelance';
    const userCode = await nextUserCode(employmentType === 'FULL_TIME' ? 'FT' : 'FL');
    const pin = generatePin();

    await prisma.user.create({
      data: {
        name: designer.displayName,
        email: designer.email || null,
        userCode,
        employmentType,
        pinHash: hashPin(pin),
        pinMustChange: true,
        designerId: designer.id,
        role: roleKey,
        memberships: { create: productionUnitIds.map((id) => ({ roleKey, productionUnitId: id })) },
      },
    });

    revalidatePath('/account-team');
    return { success: true, userCode, pin, roleKey };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat akun.' };
  }
}

export async function resetPinAction(userId: string) {
  try {
    if (await isPreviewing()) return { success: false, error: 'Mode pratinjau hanya-baca.' };
    const me = await getCurrentUser();
    if (!can(me, 'user.manage')) return { success: false, error: 'Tidak punya izin.' };
    const pin = generatePin();
    await prisma.user.update({
      where: { id: userId },
      data: { pinHash: hashPin(pin), pinMustChange: true, failedAttempts: 0, lockedUntil: null },
    });
    await destroyAllSessions(userId);
    return { success: true, pin };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mereset PIN.' };
  }
}

export async function setUserActiveAction(userId: string, isActive: boolean) {
  try {
    if (await isPreviewing()) return { success: false, error: 'Mode pratinjau hanya-baca.' };
    const me = await getCurrentUser();
    if (!can(me, 'user.manage')) return { success: false, error: 'Tidak punya izin.' };
    if (!isActive) {
      const unsafe = await adminSafetyError(me!.id, userId, { isActive: false });
      if (unsafe) return { success: false, error: unsafe };
    }
    await prisma.user.update({ where: { id: userId }, data: { isActive } });
    if (!isActive) await destroyAllSessions(userId);
    revalidatePath('/account-team');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah status akun.' };
  }
}

export async function setMembershipsAction(userId: string, roleKey: string, productionUnitIds: string[]) {
  try {
    if (await isPreviewing()) return { success: false, error: 'Mode pratinjau hanya-baca.' };
    const me = await getCurrentUser();
    if (!can(me, 'user.manage')) return { success: false, error: 'Tidak punya izin.' };
    if (!isRoleKey(roleKey)) return { success: false, error: 'Role tidak dikenal.' };
    const unsafe = await adminSafetyError(me!.id, userId, { isActive: true, memberships: [{ roleKey }] });
    if (unsafe) return { success: false, error: unsafe };
    await prisma.$transaction([
      prisma.membership.deleteMany({ where: { userId } }),
      prisma.membership.createMany({
        data: productionUnitIds.length
          ? productionUnitIds.map((id) => ({ userId, roleKey, productionUnitId: id }))
          : [{ userId, roleKey, productionUnitId: null }],
      }),
    ]);
    revalidatePath('/account-team');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan akses.' };
  }
}

/** Ubah daftar production yang boleh diakses user (role tetap). Minimal satu production. */
export async function updateUserUnitAccessAction(userId: string, productionUnitIds: string[]) {
  try {
    if (await isPreviewing()) return { success: false, error: 'Mode pratinjau hanya-baca.' };
    const me = await getCurrentUser();
    if (!can(me, 'user.manage')) return { success: false, error: 'Tidak punya izin.' };
    if (productionUnitIds.length === 0) return { success: false, error: 'Pilih minimal satu production.' };
    const current = await prisma.membership.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (!current) return { success: false, error: 'User belum punya role.' };
    if (current.productionUnitId === null) return { success: false, error: 'Akun ini punya akses global; ubah role-nya, bukan production.' };
    await prisma.$transaction([
      prisma.membership.deleteMany({ where: { userId } }),
      prisma.membership.createMany({ data: productionUnitIds.map((id) => ({ userId, roleKey: current.roleKey, productionUnitId: id })) }),
    ]);
    await destroyAllSessions(userId); // sesi lama dibuat ulang agar hak akses baru langsung berlaku
    revalidatePath('/account-team');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan akses.' };
  }
}

function canManageUsers(memberships: { roleKey: string }[]): boolean {
  return memberships.some((m) => isRoleKey(m.roleKey) && ROLE_PERMISSIONS[m.roleKey].includes('user.manage'));
}

export interface PreviewableUser {
  id: string;
  userCode: string;
  name: string | null;
  roleLabels: string[];
  unitNames: string[];
}

/** Daftar akun aktif (bukan admin) yang bisa dipratinjau Admin lewat "Lihat sebagai". */
export async function listPreviewableUsersAction(): Promise<{ success: boolean; users: PreviewableUser[]; error?: string }> {
  try {
    const me = await getCurrentUser();
    if (!can(me, 'user.manage')) return { success: false, users: [], error: 'Tidak punya izin.' };
    const [rows, units] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, userCode: { not: null }, id: { not: me!.id } },
        include: { memberships: true },
        orderBy: { userCode: 'asc' },
      }),
      prisma.productionUnit.findMany({ select: { id: true, name: true } }),
    ]);
    const unitName = new Map(units.map((u) => [u.id, u.name]));
    const users: PreviewableUser[] = rows
      .filter((u) => !canManageUsers(u.memberships))
      .map((u) => ({
        id: u.id,
        userCode: u.userCode as string,
        name: u.name,
        roleLabels: Array.from(new Set(u.memberships.filter((m) => isRoleKey(m.roleKey)).map((m) => ROLE_LABELS[m.roleKey as RoleKey]))),
        unitNames: Array.from(new Set(u.memberships.map((m) => (m.productionUnitId ? unitName.get(m.productionUnitId) ?? '?' : 'Semua production')))),
      }));
    return { success: true, users };
  } catch (error: any) {
    return { success: false, users: [], error: error.message || 'Gagal memuat daftar akun.' };
  }
}

export async function startPreviewAction(userId: string) {
  try {
    const me = await getCurrentUser();
    if (!can(me, 'user.manage')) return { success: false, error: 'Tidak punya izin.' };
    const target = await prisma.user.findUnique({ where: { id: userId }, include: { memberships: true } });
    if (!target || !target.isActive) return { success: false, error: 'Akun tidak ditemukan atau nonaktif.' };
    if (canManageUsers(target.memberships)) {
      return { success: false, error: 'Akun dengan izin Admin tidak bisa dipratinjau.' };
    }
    await setViewAs(target.id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memulai pratinjau.' };
  }
}

export async function stopPreviewAction() {
  await clearViewAs();
  return { success: true };
}
