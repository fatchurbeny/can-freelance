/**
 * Integrasi improstd (Deck/Doc) — kontrak I-22 (improstd/knowledge/DECISIONS.md):
 * - Tiket login: JWS compact HS256 dengan `SSO_SECRET` (sama di kedua app), umur 60 dtk, jti acak.
 * - API brief server-ke-server: `Authorization: Bearer <BRIEF_API_KEY>` + `X-Acting-User: <userCode>`;
 *   izin user dicek ulang di setiap panggilan.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { loadAuthUser } from '@/lib/session';
import { can, type AuthUser } from '@/lib/permissions';
import { getAppBaseUrl } from '@/lib/public-origin';

export type ImproTarget = 'deck' | 'doc';
export const isImproTarget = (v: unknown): v is ImproTarget => v === 'deck' || v === 'doc';

export const IMPRO_URL = () => (process.env.IMPRO_URL || 'https://impro.fatchurbeny.com').replace(/\/+$/, '');

/** Basis URL publik can-freelance (root domain, tanpa basePath), untuk tautan yang dibuka manusia. */
export function publicBase(): string {
  return getAppBaseUrl();
}

function secret(name: 'SSO_SECRET' | 'BRIEF_API_KEY'): string | null {
  const s = process.env[name];
  return s && s.length >= 16 ? s : null;
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

export interface TicketClaims {
  sub: string;
  name: string;
  emp: 'FULL_TIME' | 'FREELANCE';
  brand: boolean;
  task: string;
  target: ImproTarget;
}

/** Tiket HS256 sekali pakai (improstd mencatat jti). Null bila SSO_SECRET belum diisi. */
export function signTicket(claims: TicketClaims): string | null {
  const key = secret('SSO_SECRET');
  if (!key) return null;
  const iat = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ iss: 'can-freelance', aud: 'improstd', ...claims, iat, exp: iat + 60, jti: randomBytes(18).toString('base64url') }),
  );
  const sig = createHmac('sha256', key).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

/** Siapa boleh mengirim / membaca brief task: `task.edit` di production task, atau `task.edit.own` untuk task miliknya. */
export function canUseTaskBrief(user: AuthUser, task: { productionUnitId: string; designerId: string | null }): boolean {
  if (can(user, 'task.edit', task.productionUnitId)) return true;
  return can(user, 'task.edit.own', task.productionUnitId) && !!user.designerId && task.designerId === user.designerId;
}

export const apiError = (status: number, message: string) => NextResponse.json({ error: { message } }, { status });

/**
 * Auth panggilan improstd → can-freelance. Mengembalikan user + task, atau response error
 * (401 key salah/tidak dikonfigurasi, 403 user tak berhak/nonaktif, 404 task tidak ada).
 */
export async function authorizeImproCall(
  request: Request,
  taskId: string,
): Promise<
  | { user: AuthUser; task: { id: string; productionUnitId: string; designerId: string | null } }
  | { response: NextResponse }
> {
  const key = secret('BRIEF_API_KEY');
  const got = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(got);
  const b = Buffer.from(key || '');
  if (!key || a.length !== b.length || !timingSafeEqual(a, b)) return { response: apiError(401, 'Kunci API salah.') };

  const code = (request.headers.get('x-acting-user') || '').trim().toUpperCase();
  const row = code ? await prisma.user.findUnique({ where: { userCode: code }, select: { id: true, pinMustChange: true } }) : null;
  const user = row ? await loadAuthUser(row.id) : null; // null bila nonaktif
  if (!user || row?.pinMustChange) return { response: apiError(403, 'User tidak dikenal atau nonaktif.') };

  if (!/^[0-9a-f-]{36}$/i.test(taskId)) return { response: apiError(404, 'Task tidak ditemukan.') };
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, productionUnitId: true, designerId: true } });
  if (!task) return { response: apiError(404, 'Task tidak ditemukan.') };
  if (!canUseTaskBrief(user, task)) return { response: apiError(403, 'User tidak berhak atas task ini.') };
  return { user, task };
}
