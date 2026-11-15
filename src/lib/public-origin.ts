import type { NextRequest } from 'next/server';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

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
