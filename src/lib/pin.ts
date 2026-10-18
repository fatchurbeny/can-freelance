import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto';
import { validatePinStrength } from '@/lib/pin-rules';

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPin(pin: string, stored: string | null | undefined): boolean {
  // Selalu jalankan scrypt agar waktu respons tidak membocorkan keberadaan ID.
  const [scheme, saltB64, hashB64] = (stored || 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(43) + '=').split('$');
  const salt = Buffer.from(saltB64 || '', 'base64');
  const expected = Buffer.from(hashB64 || '', 'base64');
  const actual = scryptSync(pin, salt, expected.length || 32);
  const ok = scheme === 'scrypt' && expected.length > 0 && actual.length === expected.length && timingSafeEqual(actual, expected);
  return Boolean(stored) && ok;
}

export { validatePinStrength };

export function generatePin(): string {
  for (;;) {
    const pin = String(randomInt(0, 1_000_000)).padStart(6, '0');
    if (!validatePinStrength(pin)) return pin;
  }
}
