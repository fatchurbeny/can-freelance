'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { generatePin, hashPin } from '@/lib/pin';
import { destroyAllSessions, getCurrentUser } from '@/lib/session';
import { isPreviewing } from '@/lib/access';
import { can } from '@/lib/permissions';
import {
  adminSafetyError,
  loadUserRows,
  nextUserCode,
  validateMembershipInput,
  type MembershipInput,
  type UserRow,
} from '@/lib/user-admin';

/** Akun nyata dengan izin user.manage, di luar mode pratinjau; selain itu pesan error. */
async function requireManager(write: boolean): Promise<{ me: { id: string } } | { error: string }> {
  if (write && (await isPreviewing())) return { error: 'Mode pratinjau hanya-baca.' };
  const me = await getCurrentUser();
  if (!me || !can(me, 'user.manage')) return { error: 'Tidak punya izin.' };
  return { me };
}

export async function listUsersAction(): Promise<{ success: boolean; users: UserRow[]; error?: string }> {
  try {
    const auth = await requireManager(false);
    if ('error' in auth) return { success: false, users: [], error: auth.error };
    return { success: true, users: await loadUserRows() };
  } catch (error: any) {
    return { success: false, users: [], error: error.message || 'Gagal memuat user.' };
  }
}

/** Buat user baru (non-designer maupun designer). ID otomatis; PIN awal dikembalikan SEKALI. */
export async function createUserAction(input: {
  name: string;
  employmentType: string;
  memberships: MembershipInput[];
  designerId?: string | null;
}) {
  try {
    const auth = await requireManager(true);
    if ('error' in auth) return { success: false as const, error: auth.error };
    const name = input.name.trim();
    if (!name) return { success: false as const, error: 'Nama wajib diisi.' };
    if (input.employmentType !== 'FULL_TIME' && input.employmentType !== 'FREELANCE') {
      return { success: false as const, error: 'Tipe harus Full-time atau Freelance.' };
    }
    const invalid = await validateMembershipInput(input.employmentType, input.memberships, input.designerId);
    if (invalid) return { success: false as const, error: invalid };

    const userCode = await nextUserCode(input.employmentType === 'FULL_TIME' ? 'FT' : 'FL');
    const pin = generatePin();
    const primaryRole = input.memberships[0].roleKey;
    await prisma.user.create({
      data: {
        name,
        userCode,
        employmentType: input.employmentType,
        pinHash: hashPin(pin),
        pinMustChange: true,
        designerId: input.designerId || null,
        role: primaryRole,
        memberships: { create: input.memberships.map((m) => ({ roleKey: m.roleKey, productionUnitId: m.productionUnitId })) },
      },
    });
    revalidatePath('/user-role');
    revalidatePath('/account-team');
    return { success: true as const, userCode, pin };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal membuat user.' };
  }
}

/** Ubah nama + seluruh keanggotaan (role per production). Sesi user dicabut agar hak baru langsung berlaku. */
export async function updateUserAction(input: { userId: string; name: string; memberships: MembershipInput[] }) {
  try {
    const auth = await requireManager(true);
    if ('error' in auth) return { success: false as const, error: auth.error };
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) return { success: false as const, error: 'User tidak ditemukan.' };
    const name = input.name.trim();
    if (!name) return { success: false as const, error: 'Nama wajib diisi.' };

    const invalid = await validateMembershipInput(user.employmentType, input.memberships, user.designerId, user.id);
    if (invalid) return { success: false as const, error: invalid };
    const unsafe = await adminSafetyError(auth.me.id, user.id, { isActive: user.isActive, memberships: input.memberships });
    if (unsafe) return { success: false as const, error: unsafe };

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { name, role: input.memberships[0].roleKey } }),
      prisma.membership.deleteMany({ where: { userId: user.id } }),
      prisma.membership.createMany({
        data: input.memberships.map((m) => ({ userId: user.id, roleKey: m.roleKey, productionUnitId: m.productionUnitId })),
      }),
    ]);
    await destroyAllSessions(user.id);
    revalidatePath('/user-role');
    revalidatePath('/account-team');
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal menyimpan user.' };
  }
}
