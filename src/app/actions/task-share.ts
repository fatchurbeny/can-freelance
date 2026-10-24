'use server';

import { randomBytes } from 'crypto';
import { getAccess } from '@/lib/access';
import prisma from '@/lib/prisma';

/**
 * Link publik view-only task (/share/t/<token>). Satu link aktif per task; tanpa kedaluwarsa,
 * dicabut lewat `revokedAt`. Halaman publiknya ada di src/app/share/t/[token]/page.tsx.
 */

type ShareResult = { success: true; token: string | null } | { success: false; error: string };

async function guardShare(taskId: string, write: boolean): Promise<string | null> {
  const access = await getAccess();
  if (write && access.readOnly) return 'Mode pratinjau hanya-baca.';
  if (!access.enabled) return null;
  if (!access.user || access.user.pinMustChange) return 'Sesi berakhir. Silakan masuk lagi.';
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { productionUnitId: true } });
  if (!task) return 'Task tidak ditemukan.';
  if (!access.allows('task.share', task.productionUnitId)) return 'Anda tidak punya izin untuk aksi ini.';
  return null;
}

async function activeToken(taskId: string): Promise<string | null> {
  const link = await prisma.taskShareLink.findFirst({
    where: { taskId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { token: true },
  });
  return link?.token ?? null;
}

export async function getTaskShareLinkAction(taskId: string): Promise<ShareResult> {
  const error = await guardShare(taskId, false);
  if (error) return { success: false, error };
  return { success: true, token: await activeToken(taskId) };
}

export async function createTaskShareLinkAction(taskId: string): Promise<ShareResult> {
  const error = await guardShare(taskId, true);
  if (error) return { success: false, error };
  const existing = await activeToken(taskId);
  if (existing) return { success: true, token: existing };
  const access = await getAccess();
  const link = await prisma.taskShareLink.create({
    data: { taskId, token: randomBytes(24).toString('base64url'), createdById: access.user?.id ?? null },
    select: { token: true },
  });
  return { success: true, token: link.token };
}

export async function revokeTaskShareLinkAction(taskId: string): Promise<ShareResult> {
  const error = await guardShare(taskId, true);
  if (error) return { success: false, error };
  await prisma.taskShareLink.updateMany({ where: { taskId, revokedAt: null }, data: { revokedAt: new Date() } });
  return { success: true, token: null };
}
