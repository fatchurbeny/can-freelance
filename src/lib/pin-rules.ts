const PIN_RE = /^\d{6}$/;

/** Aman dipakai di client. null = PIN valid; selain itu pesan error. */
export function validatePinStrength(pin: string): string | null {
  if (!PIN_RE.test(pin)) return 'PIN harus tepat 6 angka.';
  if (/^(\d)\1{5}$/.test(pin)) return 'PIN tidak boleh angka berulang.';
  const d = pin.split('').map(Number);
  const asc = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  const desc = d.every((v, i) => i === 0 || v === d[i - 1] - 1);
  if (asc || desc) return 'PIN tidak boleh angka berurutan.';
  return null;
}
