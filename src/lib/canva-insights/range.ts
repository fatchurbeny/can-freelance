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

/**
 * Rentang preset relatif ke hari UTC `now`, inklusif kedua ujung. "N hari terakhir" mengikuti request
 * dashboard Canva sendiri: dari hari ini − N sampai hari ini (fixture zahra: Last 30 days = 28 Sep 00:00
 * s/d 29 Okt 00:00 UTC, jadi 31 hari kalender), agar angkanya sama persis dengan Canva.
 */
export function presetRange(preset: Exclude<RangePreset, 'custom'>, now = Date.now()): { from: string; to: string } {
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  const d = new Date(today);
  switch (preset) {
    case '7d':
      return { from: isoDay(today - 7 * DAY_MS), to: isoDay(today) };
    case '30d':
      return { from: isoDay(today - 30 * DAY_MS), to: isoDay(today) };
    case '90d':
      return { from: isoDay(today - 90 * DAY_MS), to: isoDay(today) };
    case 'thisMonth':
      return { from: isoDay(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), to: isoDay(today) };
    case 'lastMonth':
      return {
        from: isoDay(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)),
        to: isoDay(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0)),
      };
  }
}

/**
 * Validasi + periode pembanding seperti dashboard Canva (request breakdowns kedua, 2026-10-29):
 * pembanding = `from` − (N−1) hari s/d `from`, jadi hari `from` ikut di kedua periode. Persen Canva
 * membandingkan rata-rata per hari: periode sekarang dibagi hari yang sudah selesai (hari ini belum
 * dihitung Canva), pembanding dibagi N. `scale` mengalikan total sekarang agar sebanding.
 */
export function comparisonRange(from: string, to: string, now = Date.now()) {
  const f = parseDay(from);
  const t = parseDay(to);
  if (f === null || t === null || t < f) throw new Error('Rentang tanggal tidak valid.');
  const days = Math.round((t - f) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) throw new Error(`Rentang maksimal ${MAX_RANGE_DAYS} hari.`);
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  const completeDays = Math.min(days, Math.max(1, Math.round((today - f) / DAY_MS)));
  return {
    from,
    to,
    prevFrom: isoDay(f - (days - 1) * DAY_MS),
    prevTo: from,
    days: Array.from({ length: days }, (_, i) => isoDay(f + i * DAY_MS)),
    scale: days / completeDays,
  };
}
