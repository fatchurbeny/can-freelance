import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { tooManyAttempts } from '@/lib/rate-limit';

/** Batas body ingest (spek §5.1). */
export const MAX_INGEST_BYTES = 2 * 1024 * 1024;

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function sameSecret(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Guard route `/api/insights/*` untuk collector: Bearer INSIGHTS_INGEST_TOKEN (terpisah dari CRON_SECRET),
 * dibandingkan constant-time. Gagal autentikasi dibatasi per IP. Tanpa token di env → selalu ditolak.
 */
export function authorizeCollector(request: Request): NextResponse | null {
  const ip = clientIp(request);
  if (tooManyAttempts(`insights:${ip}`, 2000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const secret = process.env.INSIGHTS_INGEST_TOKEN;
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!secret || !token || !sameSecret(token, secret)) {
    if (tooManyAttempts(`insights-auth:${ip}`)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** Baca body JSON dengan batas ukuran; mengembalikan response error atau objek hasil parse. */
export async function readJsonBody(request: Request): Promise<{ error: NextResponse } | { body: Record<string, unknown> }> {
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_INGEST_BYTES) {
    return { error: NextResponse.json({ error: 'Body melebihi 2 MB' }, { status: 413 }) };
  }
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('bukan objek');
    return { body };
  } catch {
    return { error: NextResponse.json({ error: 'Body bukan JSON objek' }, { status: 400 }) };
  }
}
