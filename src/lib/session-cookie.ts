/**
 * Cookie sesi bertanda tangan HMAC (Web Crypto, aman dipakai di proxy maupun server action).
 * Format: `<token>.<expiresAtMs>.<signature>`. Proxy hanya memverifikasi tanda tangan;
 * keabsahan sesi di DB (dicabut/nonaktif) diperiksa `getCurrentUser()`.
 */

export const SESSION_COOKIE = 'cf_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const VIEW_AS_COOKIE = 'cf_view_as';
export const VIEW_AS_TTL_MS = 8 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET (min 16 karakter) wajib diisi saat AUTH_MODE=session.');
  return s;
}

async function hmac(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signSessionCookie(token: string, expiresAt: number): Promise<string> {
  const body = `${token}.${expiresAt}`;
  return `${body}.${await hmac(body)}`;
}

/** Mengembalikan token bila tanda tangan valid & belum kedaluwarsa, selain itu null. */
export async function verifySessionCookie(value: string | undefined | null): Promise<string | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [token, exp, sig] = parts;
  const expiresAt = Number(exp);
  if (!token || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  const expected = await hmac(`${token}.${exp}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? token : null;
}
