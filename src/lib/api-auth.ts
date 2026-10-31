import { NextResponse } from 'next/server';
import { getAccess } from '@/lib/access';
import type { Permission } from '@/lib/permissions';

function hasCronSecret(request?: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !request) return false;
  if (request.headers.get('authorization') === `Bearer ${secret}`) return true;
  return new URL(request.url).searchParams.get('secret') === secret;
}

/**
 * Guard route handler `/api/*` (di luar gerbang proxy). Mengembalikan response error bila
 * ditolak, atau null bila boleh lanjut. Tanpa AUTH_MODE=session perilaku lama (terbuka) dipertahankan.
 * `allowCronSecret`: izinkan juga pemanggil terjadwal dengan CRON_SECRET.
 */
export async function authorizeApi(
  permission: Permission | Permission[],
  opts: { request?: Request; allowCronSecret?: boolean; write?: boolean } = {},
): Promise<NextResponse | null> {
  const access = await getAccess();
  if (!access.enabled) return null;
  if (opts.allowCronSecret && hasCronSecret(opts.request)) return null;
  if (!access.user || access.user.pinMustChange) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (opts.write && access.readOnly) {
    return NextResponse.json({ error: 'Mode pratinjau hanya-baca.' }, { status: 403 });
  }
  const required = Array.isArray(permission) ? permission : [permission];
  if (!required.some((p) => access.allows(p))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
