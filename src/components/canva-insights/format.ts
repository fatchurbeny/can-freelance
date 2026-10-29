/** Format angka, delta & gaya brand untuk tab Canva Insights. */

const NUM = new Intl.NumberFormat('id-ID');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const fmtNum = (n: number) => NUM.format(n);

export function fmtDay(day: string, withYear = false): string {
  const [y, m, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`;
}

export function fmtRange(from: string, to: string): string {
  return `${fmtDay(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmtDay(to, true)}`;
}

export type Tone = 'up' | 'down' | 'flat' | 'none';

/** `scale` = InsightsData.range.scale: membandingkan rata-rata per hari seperti Canva. */
export function delta(cur: number, prev: number, scale = 1): { text: string; tone: Tone } {
  if (!prev) return { text: cur ? 'baru' : '—', tone: 'none' };
  const v = ((cur * scale - prev) / prev) * 100;
  if (Math.abs(v) < 0.05) return { text: '0,0%', tone: 'flat' };
  const s = Math.abs(v).toFixed(1).replace('.', ',');
  return v < 0 ? { text: `▼ ${s}%`, tone: 'down' } : { text: `▲ ${s}%`, tone: 'up' };
}

export const TONE_PILL: Record<Tone, string> = {
  up: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  down: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
  flat: 'bg-gray-500/10 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
  none: 'bg-gray-500/10 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
};

export const TONE_TEXT: Record<Tone, string> = {
  up: 'text-emerald-700 dark:text-emerald-400',
  down: 'text-rose-700 dark:text-rose-400',
  flat: 'text-gray-500 dark:text-gray-400',
  none: 'text-gray-500 dark:text-gray-400',
};

/** Selisih dua rasio (0–1) dalam poin persen, mis. 36,0% → 41,7% = "▲ 5,7 poin". */
export function pointDelta(cur: number, prev: number, hasPrev: boolean): { text: string; tone: Tone } {
  if (!hasPrev) return { text: '—', tone: 'none' };
  const v = (cur - prev) * 100;
  if (Math.abs(v) < 0.05) return { text: '0,0 poin', tone: 'flat' };
  const s = Math.abs(v).toFixed(1).replace('.', ',');
  return v < 0 ? { text: `▼ ${s} poin`, tone: 'down' } : { text: `▲ ${s} poin`, tone: 'up' };
}

export function ratio(usages: number, applies: number): string {
  return applies ? `${((usages / applies) * 100).toFixed(1).replace('.', ',')}%` : '—';
}

/** Warna + pola garis per brand (urutan daftar brand). Pola membedakan garis tanpa bergantung warna. */
const BRAND_STYLES = [
  { color: '#2563eb', dash: undefined },
  { color: '#c2410c', dash: '7 5' },
  { color: '#7c3aed', dash: undefined },
  { color: '#0f766e', dash: '2 4' },
  { color: '#be185d', dash: '10 4 2 4' },
  { color: '#4d7c0f', dash: '4 4' },
];

export function brandStyle(index: number) {
  return BRAND_STYLES[index % BRAND_STYLES.length];
}

export const RUN_LABEL: Record<string, string> = {
  OK: 'OK',
  RUNNING: 'Berjalan',
  NEEDS_LOGIN: 'Perlu login',
  ERROR: 'Gagal',
};

export function relativeTime(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}
