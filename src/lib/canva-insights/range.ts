/** Rentang tanggal tab Canva Insights. Hari = hari UTC, format "YYYY-MM-DD" (dipakai client & server). */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_RANGE_DAYS = 400;

export type RangePreset = '7d' | '30d' | '90d' | 'thisMonth' | 'lastMonth' | 'custom';

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: '7d', label: '7 hari terakhir' },
  { value: '30d', label: '30 hari terakhir' },
  { value: '90d', label: '90 hari terakhir' },
  { value: 'thisMonth', label: 'Bulan ini' },
  { value: 'lastMonth', label: 'Bulan lalu' },
  { value: 'custom', label: 'Kustom' },
];

export function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function parseDay(day: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const ms = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

/** Rentang preset relatif ke hari UTC `now` (inklusif kedua ujung, seperti dashboard Canva). */
export function presetRange(preset: Exclude<RangePreset, 'custom'>, now = Date.now()): { from: string; to: string } {
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  const d = new Date(today);
  switch (preset) {
    case '7d':
      return { from: isoDay(today - 6 * DAY_MS), to: isoDay(today) };
    case '30d':
      return { from: isoDay(today - 29 * DAY_MS), to: isoDay(today) };
    case '90d':
      return { from: isoDay(today - 89 * DAY_MS), to: isoDay(today) };
    case 'thisMonth':
      return { from: isoDay(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), to: isoDay(today) };
    case 'lastMonth':
      return {
        from: isoDay(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)),
        to: isoDay(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0)),
      };
  }
}

/** Validasi + periode pembanding dengan panjang sama tepat sebelum `from`. */
export function comparisonRange(from: string, to: string) {
  const f = parseDay(from);
  const t = parseDay(to);
  if (f === null || t === null || t < f) throw new Error('Rentang tanggal tidak valid.');
  const days = Math.round((t - f) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) throw new Error(`Rentang maksimal ${MAX_RANGE_DAYS} hari.`);
  return {
    from,
    to,
    prevFrom: isoDay(f - days * DAY_MS),
    prevTo: isoDay(f - DAY_MS),
    days: Array.from({ length: days }, (_, i) => isoDay(f + i * DAY_MS)),
  };
}
