/** Panjang PIN (keputusan pemilik 2026-11-16: 4 angka, sebelumnya 6). */
export const PIN_LENGTH = 4;
/** PIN 6 angka lama masih diterima untuk login & sebagai "PIN lama", lalu wajib diganti. */
export const LEGACY_PIN_LENGTH = 6;

const PIN_RE = new RegExp(`^\\d{${PIN_LENGTH}}$`);

/** PIN 6 angka dari sebelum 2026-11-16. */
export const isLegacyPin = (pin: string) => /^\d{6}$/.test(pin);

/** Format yang boleh dikirim saat login / sebagai PIN lama (4 angka, atau 6 angka lama). */
export const isAcceptedPinInput = (pin: string) => PIN_RE.test(pin) || isLegacyPin(pin);

/** Aman dipakai di client. null = PIN baru valid; selain itu pesan error. */
export function validatePinStrength(pin: string): string | null {
  if (!PIN_RE.test(pin)) return `PIN harus tepat ${PIN_LENGTH} angka.`;
  if (/^(\d)\1+$/.test(pin)) return 'PIN tidak boleh angka berulang.';
  const d = pin.split('').map(Number);
  const asc = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  const desc = d.every((v, i) => i === 0 || v === d[i - 1] - 1);
  if (asc || desc) return 'PIN tidak boleh angka berurutan.';
  return null;
}
