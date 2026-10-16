import { createHash, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE, SESSION_TTL_MS, VIEW_AS_COOKIE, VIEW_AS_TTL_MS, signSessionCookie, verifySessionCookie } from '@/lib/session-cookie';
import type { AuthUser } from '@/lib/permissions';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await prisma.session.create({
    data: { userId, tokenHash: sha256(token), expiresAt: new Date(expiresAt) },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSessionCookie(token, expiresAt), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = await verifySessionCookie(jar.get(SESSION_COOKIE)?.value);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
  jar.delete(VIEW_AS_COOKIE);
}

export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/** User dari sesi aktif (diverifikasi ke DB), atau null. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (process.env.AUTH_MODE !== 'session') return null;
  const jar = await cookies();
  const token = await verifySessionCookie(jar.get(SESSION_COOKIE)?.value);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { memberships: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now() || !session.user.isActive) return null;
  return toAuthUser(session.user);
}

function toAuthUser(u: {
  id: string; name: string | null; userCode: string | null; employmentType: string | null; designerId: string | null;
  pinMustChange: boolean; memberships: { roleKey: string; productionUnitId: string | null }[];
}): AuthUser {
  return {
    id: u.id,
    name: u.name,
    userCode: u.userCode,
    employmentType: u.employmentType,
    designerId: u.designerId,
    pinMustChange: u.pinMustChange,
    memberships: u.memberships.map((m) => ({ roleKey: m.roleKey, productionUnitId: m.productionUnitId })),
  };
}

/** Akun aktif berdasarkan id (untuk mode "Lihat sebagai"), atau null. */
export async function loadAuthUser(userId: string): Promise<AuthUser | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { memberships: true } });
  return u && u.isActive ? toAuthUser(u) : null;
}

/** Id akun yang sedang dipratinjau (cookie bertanda tangan), atau null. */
export async function getViewAsUserId(): Promise<string | null> {
  const jar = await cookies();
  return verifySessionCookie(jar.get(VIEW_AS_COOKIE)?.value);
}

export async function setViewAs(userId: string): Promise<void> {
  const expiresAt = Date.now() + VIEW_AS_TTL_MS;
  const jar = await cookies();
  jar.set(VIEW_AS_COOKIE, await signSessionCookie(userId, expiresAt), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function clearViewAs(): Promise<void> {
  const jar = await cookies();
  jar.delete(VIEW_AS_COOKIE);
}
