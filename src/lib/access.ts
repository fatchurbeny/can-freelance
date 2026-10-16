import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser, getViewAsUserId, loadAuthUser } from '@/lib/session';
import {
  accessibleProductionUnitIds,
  can,
  effectivePermissions,
  isRoleKey,
  ROLE_LABELS,
  type AccessInfo,
  type AuthUser,
  type Permission,
} from '@/lib/permissions';

export interface Access {
  /** false = AUTH_MODE bukan `session` (Basic Auth lama): semua diizinkan. */
  enabled: boolean;
  /** Akun efektif: saat pratinjau = akun yang dilihat Admin; selain itu user yang login. */
  user: AuthUser | null;
  /** User yang benar-benar login (Admin saat pratinjau). */
  realUser: AuthUser | null;
  /** true saat "Lihat sebagai": semua aksi ubah ditolak. */
  readOnly: boolean;
  allows: (permission: Permission, productionUnitId?: string | null) => boolean;
  unitIds: string[] | null;
  info: AccessInfo;
}

function labelsOf(user: AuthUser | null): string[] {
  return Array.from(new Set((user?.memberships ?? []).filter((m) => isRoleKey(m.roleKey)).map((m) => ROLE_LABELS[m.roleKey as keyof typeof ROLE_LABELS])));
}

export async function getAccess(): Promise<Access> {
  const enabled = process.env.AUTH_MODE === 'session';
  const realUser = enabled ? await getCurrentUser() : null;

  // "Lihat sebagai": hanya Admin (user.manage), hanya akun aktif non-admin; izin user.manage tidak ikut terbawa.
  let user = realUser;
  let previewUser: AuthUser | null = null;
  if (realUser && can(realUser, 'user.manage')) {
    const targetId = await getViewAsUserId();
    if (targetId && targetId !== realUser.id) {
      const target = await loadAuthUser(targetId);
      if (target && !can(target, 'user.manage')) {
        previewUser = { ...target, pinMustChange: false };
        user = previewUser;
      }
    }
  }

  const unitIds = !enabled ? null : accessibleProductionUnitIds(user);
  const realUnitIds = !enabled ? null : accessibleProductionUnitIds(realUser);
  const unitNames = realUnitIds
    ? (await prisma.productionUnit.findMany({ where: { id: { in: realUnitIds } }, orderBy: { createdAt: 'asc' }, select: { name: true } })).map((u) => u.name)
    : null;
  return {
    enabled,
    user,
    realUser,
    readOnly: !!previewUser,
    allows: (permission, productionUnitId) => !enabled || can(user, permission, productionUnitId),
    unitIds,
    info: {
      enabled,
      permissions: effectivePermissions(user),
      unitIds,
      userName: realUser?.name ?? null,
      userCode: realUser?.userCode ?? null,
      roleLabels: labelsOf(realUser),
      unitNames,
      canPreview: !!realUser && can(realUser, 'user.manage'),
      hasProfile: !!user?.designerId,
      preview: previewUser ? { userCode: previewUser.userCode, name: previewUser.name, roleLabels: labelsOf(previewUser) } : null,
    },
  };
}

/** Halaman tujuan bila user membuka sesuatu yang bukan haknya. */
export async function landingPath(access: Access): Promise<string> {
  if (!access.enabled) return '/';
  if (access.allows('overview.view') && access.unitIds === null) return '/';
  const unit = await prisma.productionUnit.findFirst({
    where: {
      isActive: true,
      ...(access.unitIds ? { id: { in: access.unitIds } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: { slug: true },
  });
  return unit ? `/production/${unit.slug}` : '/login';
}

/**
 * Guard halaman server. Tanpa sesi → /login; PIN awal belum diganti → /change-pin;
 * tanpa salah satu permission → landing user. Mengembalikan Access untuk dipakai lanjut.
 */
export async function requireAccess(permissions: Permission[], productionUnitId?: string | null): Promise<Access> {
  const access = await getAccess();
  if (!access.enabled) return access;
  if (!access.user) redirect('/login');
  if (access.user.pinMustChange) redirect('/change-pin');
  if (!permissions.some((p) => access.allows(p, productionUnitId))) {
    redirect(await landingPath(access));
  }
  return access;
}

/** Untuk server action: lempar error bila tidak berhak (tanpa redirect). */
export async function assertPermission(permission: Permission, productionUnitId?: string | null): Promise<Access> {
  const access = await getAccess();
  if (access.readOnly) throw new Error('Mode pratinjau hanya-baca.');
  if (access.enabled && !access.allows(permission, productionUnitId)) {
    throw new Error('Anda tidak punya izin untuk aksi ini.');
  }
  return access;
}

/**
 * Edit task: `task.edit` (management) atau `task.edit.own` untuk task milik designer itu sendiri.
 * Melempar error bila tidak berhak.
 */
export async function assertCanEditTask(taskId: string): Promise<Access> {
  const access = await getAccess();
  if (!access.enabled) return access;
  if (!access.user) throw new Error('Sesi berakhir. Silakan masuk lagi.');
  if (access.readOnly) throw new Error('Mode pratinjau hanya-baca.');
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { designerId: true, productionUnitId: true } });
  if (!task) throw new Error('Task tidak ditemukan.');
  if (access.allows('task.edit', task.productionUnitId)) return access;
  if (
    access.allows('task.edit.own', task.productionUnitId) &&
    access.user.designerId &&
    task.designerId === access.user.designerId
  ) {
    return access;
  }
  throw new Error('Anda hanya dapat mengubah task milik Anda sendiri.');
}

/**
 * Guard server action tanpa melempar: mengembalikan `{ success:false, error }` bila tidak berhak
 * (salah satu permission cukup), atau null bila boleh lanjut. Jangan dipakai di dalam
 * `runInBackground` (konteks request/cookies sudah hilang) — guard di awal action saja.
 */
export async function denyUnless(...permissions: Permission[]): Promise<{ success: false; error: string } | null> {
  const access = await getAccess();
  if (!access.enabled) return null;
  if (!access.user || access.user.pinMustChange) return { success: false, error: 'Sesi berakhir. Silakan masuk lagi.' };
  if (permissions.some((p) => access.allows(p))) return null;
  return { success: false, error: 'Anda tidak punya izin untuk aksi ini.' };
}

/** Seperti `denyUnless` tetapi untuk aksi UBAH data: ditolak juga saat mode pratinjau (hanya-baca). */
export async function denyWrite(...permissions: Permission[]): Promise<{ success: false; error: string } | null> {
  const access = await getAccess();
  if (access.readOnly) return { success: false, error: 'Mode pratinjau hanya-baca.' };
  return denyUnless(...permissions);
}

/** True bila Admin sedang di mode "Lihat sebagai" (untuk memblokir aksi manajemen user). */
export async function isPreviewing(): Promise<boolean> {
  return (await getAccess()).readOnly;
}
