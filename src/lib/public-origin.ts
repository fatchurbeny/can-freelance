import type { NextRequest } from 'next/server';
import { LEGACY_BASE_PATH } from '@/lib/base-path';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

/** Domain publik produksi (sejak 2026-11 pindah dari portal.fatchurbeny.com). Lihat docs/knowledge/domain-migration-meetimpro.md. */
export const PUBLIC_APP_URL_DEFAULT = 'https://portal.meetimpro.site';
/** Domain lama: kini hanya redirect 308 ke domain baru; callback OAuth-nya terdaftar dengan prefix `/can-freelance`. */
export const LEGACY_PUBLIC_HOST = 'portal.fatchurbeny.com';

/**
 * Basis URL publik untuk tautan absolut yang dibaca manusia/layanan luar (gambar upload, Notion, email, improstd).
 * `NEXT_PUBLIC_APP_URL` di-inline saat build di Mac (nilai lokal), jadi `APP_URL` (dibaca saat runtime) didahulukan,
 * dan nilai lokal jatuh ke domain produksi agar URL yang tersimpan tidak pernah berisi localhost.
 */
export function getAppBaseUrl(): string {
  for (const raw of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (!LOCAL_HOST.test(url.host)) return url.origin;
    } catch {
      /* abaikan nilai rusak */
    }
  }
  return PUBLIC_APP_URL_DEFAULT;
}

/**
 * Redirect URI OAuth untuk `path` (mis. `/api/google/oauth/callback`) dari origin publik.
 * Harus identik di langkah start dan callback, dan terdaftar di konsol penyedia:
 * - domain lama → `https://portal.fatchurbeny.com/can-freelance<path>` (didaftarkan dulu, dialihkan 308);
 * - lokal → `<origin>/can-freelance<path>` (pendaftaran lokal lama);
 * - domain lain (portal.meetimpro.site) → `<origin><path>`.
 */
export function oauthCallbackUrl(origin: string, path: string): string {
  const clean = origin.replace(/\/+$/, '');
  let host = '';
  try {
    host = new URL(clean).host;
  } catch {
    /* origin tanpa skema */
  }
  if (host === LEGACY_PUBLIC_HOST) return `https://${LEGACY_PUBLIC_HOST}${LEGACY_BASE_PATH}${path}`;
  if (!host || LOCAL_HOST.test(host)) return `${clean}${LEGACY_BASE_PATH}${path}`;
  return `${clean}${path}`;
}

function envAppUrl(): URL | null {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/**
 * Origin publik untuk redirect absolut dari route handler.
 * Di VPS (Next standalone di belakang Nginx), `request.nextUrl.origin` bernilai
 * `http://localhost:3002`, jadi redirect selesai OAuth mendarat di localhost.
 * Urutan: header X-Forwarded-Host/Host bila bukan host lokal → APP_URL bila bukan lokal → origin request.
 */
export function getPublicOrigin(request: NextRequest): string {
  const headers = request.headers;
  const host = headers.get('x-forwarded-host')?.split(',')[0]?.trim() || headers.get('host')?.trim() || '';
  const env = envAppUrl();

  if (host && !LOCAL_HOST.test(host)) {
    if (env && env.host === host) return env.origin;
    const proto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
    return `${proto}://${host}`;
  }
  if (env && !LOCAL_HOST.test(env.host)) return env.origin;
  if (host) {
    const proto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || request.nextUrl.protocol.replace(':', '');
    return `${proto}://${host}`;
  }
  return request.nextUrl.origin;
}
