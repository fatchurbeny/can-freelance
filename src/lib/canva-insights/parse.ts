/**
 * Parser respons endpoint internal Canva Creator Insights (docs/knowledge/canva-insights-spec.md §1).
 * Fungsi murni, tanpa DB. Validasi per baris: baris yang field wajibnya hilang atau tipenya salah
 * dilewati dan dicatat di `skipped`, baris lain tetap dipakai. ParseError hanya bila bentuk payload
 * rusak atau SEMUA baris tidak valid (tanda pemetaan berubah, jangan diam-diam menulis kosong).
 * Huruf field berbeda arti per endpoint, jadi tiap endpoint punya pemetaan sendiri.
 */

/** Naikkan bila pemetaan berubah, lalu jalankan reparse (src/lib/canva-insights/reparse.ts). */
export const PARSER_VERSION = 2;

export const CANVA_ENDPOINTS = [
  'content.by_brand',
  'content.by_content',
  'brand.breakdowns',
  'tier_scores',
  'templates',
] as const;

export type CanvaEndpoint = (typeof CANVA_ENDPOINTS)[number];

export function isCanvaEndpoint(value: unknown): value is CanvaEndpoint {
  return typeof value === 'string' && (CANVA_ENDPOINTS as readonly string[]).includes(value);
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/** Audiens = field `F` mentah ("B" Free, "C" Pro) atau "ALL" bila request tanpa contentRoyalties. */
export type Audience = string;

export interface TemplateActivity {
  id: string;
  publishedAt: Date | null;
  lastActivityAt: Date | null;
}

export interface TemplateDailyRow {
  templateId: string;
  date: Date;
  audience: Audience;
  applies: number;
  usages: number;
}

export interface BrandDailyRow {
  date: Date;
  audience: Audience;
  applies: number;
  usages: number;
}

export interface TierRow {
  date: Date;
  tier: string | null;
  score: number | null;
  raw: Record<string, unknown>;
}

export interface TemplateMeta {
  id: string;
  sourceDesignId: string | null;
  title: string | null;
  keywords: string[];
  license: string | null;
  pageCount: number | null;
  thumbnailUrl: string | null;
}

/** Baris yang dilewati: jumlah + beberapa alasan pertama (untuk kolom `error` batch). */
export interface Skipped {
  count: number;
  reasons: string[];
}

export type ParsedBatch = { skipped: Skipped } & (
  | { endpoint: 'content.by_brand'; templates: TemplateActivity[] }
  | { endpoint: 'content.by_content'; templates: TemplateActivity[]; daily: TemplateDailyRow[] }
  | { endpoint: 'brand.breakdowns'; brandDaily: BrandDailyRow[] }
  | { endpoint: 'tier_scores'; tiers: TierRow[] }
  | { endpoint: 'templates'; metadata: TemplateMeta[] }
);

const DAY_MS = 24 * 60 * 60 * 1000;
const TEMPLATE_ID = /^EA[A-Za-z0-9_-]{9}$/;

type Row = Record<string, unknown>;

function rowsOf(payload: unknown): Row[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ParseError('payload bukan objek');
  }
  const rows = (payload as Row).A;
  if (!Array.isArray(rows)) throw new ParseError('payload.A bukan array');
  return rows as Row[];
}

const MAX_REASONS = 3;

/**
 * Jalankan `fn` per baris; baris yang melempar ParseError dilewati dan dicatat. Semua baris gagal
 * (dan ada baris) → ParseError dengan alasan pertama, agar perubahan format Canva tetap ketahuan.
 */
function eachRow<T>(rows: Row[], fn: (r: Row, i: number) => T): { out: T[]; skipped: Skipped } {
  const out: T[] = [];
  const skipped: Skipped = { count: 0, reasons: [] };
  rows.forEach((r, i) => {
    try {
      if (!r || typeof r !== 'object' || Array.isArray(r)) throw new ParseError(`A[${i}] bukan objek`);
      out.push(fn(r, i));
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;
      skipped.count++;
      if (skipped.reasons.length < MAX_REASONS) skipped.reasons.push(e.message);
    }
  });
  if (rows.length > 0 && out.length === 0) {
    throw new ParseError(`semua ${rows.length} baris tidak valid; contoh: ${skipped.reasons[0]}`);
  }
  return { out, skipped };
}

/** Angka dari Canva: number atau string angka ("12"). */
function numeric(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/**
 * Applies/Usages. Kosong (null/tidak ada) = 0, seperti dashboard menghitung hari tanpa baris.
 * Negatif diterima: koreksi dari Canva ikut dijumlah agar total sama dengan dashboard Canva.
 */
function count(row: Row, key: string, i: number): number {
  const raw = row[key];
  if (raw == null) return 0;
  const v = numeric(raw);
  if (v === null || !Number.isInteger(v)) {
    throw new ParseError(`A[${i}].${key} harus bilangan bulat, didapat ${JSON.stringify(raw)}`);
  }
  return v;
}

function timestamp(row: Row, key: string, i: number): number {
  const raw = row[key];
  const v = numeric(raw);
  if (v === null || v <= 0) {
    throw new ParseError(`A[${i}].${key} harus timestamp ms, didapat ${JSON.stringify(raw)}`);
  }
  return v;
}

function optionalTimestamp(row: Row, key: string, i: number): Date | null {
  return row[key] == null ? null : new Date(timestamp(row, key, i));
}

/** Hari UTC (rollup harian Canva = hari UTC, dikonfirmasi user). */
function utcDay(row: Row, key: string, i: number): Date {
  return new Date(Math.floor(timestamp(row, key, i) / DAY_MS) * DAY_MS);
}

function optionalString(row: Row, key: string, i: number): string | null {
  const v = row[key];
  if (v == null) return null;
  if (typeof v !== 'string') throw new ParseError(`A[${i}].${key} harus string, didapat ${JSON.stringify(v)}`);
  return v;
}

function templateId(row: Row, key: string, i: number): string {
  const v = row[key];
  if (typeof v !== 'string' || !TEMPLATE_ID.test(v)) {
    throw new ParseError(`A[${i}].${key} bukan template ID, didapat ${JSON.stringify(v)}`);
  }
  return v;
}

/** Audiens `F` ("B" Free, "C" Pro); angka diterima sebagai teks. */
function audience(row: Row, i: number): Audience {
  const v = row.F;
  if (typeof v === 'number') return String(v);
  return optionalString(row, 'F', i) ?? 'ALL';
}

/** Gabung aktivitas per template: publish pertama yang ada, aktivitas terakhir terbaru. */
function mergeActivity(list: TemplateActivity[]): TemplateActivity[] {
  const byId = new Map<string, TemplateActivity>();
  for (const t of list) {
    const prev = byId.get(t.id);
    if (!prev) {
      byId.set(t.id, { ...t });
      continue;
    }
    prev.publishedAt ??= t.publishedAt;
    if (t.lastActivityAt && (!prev.lastActivityAt || t.lastActivityAt > prev.lastActivityAt)) {
      prev.lastActivityAt = t.lastActivityAt;
    }
  }
  return Array.from(byId.values());
}

function activityRow(r: Row, i: number): TemplateActivity {
  const id = templateId(r, 'e', i);
  count(r, 'C', i);
  count(r, 'D', i);
  return { id, publishedAt: optionalTimestamp(r, 'j', i), lastActivityAt: optionalTimestamp(r, 'E', i) };
}

function dedupe<T>(rows: T[], key: (r: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const r of rows) byKey.set(key(r), r);
  return Array.from(byKey.values());
}

/** Gabung catatan baris yang dilewati dari beberapa pemetaan atas baris yang sama. */
function mergeSkipped(...list: Skipped[]): Skipped {
  return {
    count: Math.max(...list.map((s) => s.count)),
    reasons: [...new Set(list.flatMap((s) => s.reasons))].slice(0, MAX_REASONS),
  };
}

export function parseBatch(endpoint: CanvaEndpoint, payload: unknown, brandId: string): ParsedBatch {
  const rows = rowsOf(payload);
  switch (endpoint) {
    case 'content.by_brand': {
      const { out, skipped } = eachRow(rows, activityRow);
      return { endpoint, templates: mergeActivity(out), skipped };
    }
    case 'content.by_content': {
      const activity = eachRow(rows, activityRow);
      const daily = eachRow(rows, (r, i): TemplateDailyRow => ({
        templateId: templateId(r, 'e', i),
        date: utcDay(r, 'k', i),
        audience: audience(r, i),
        applies: count(r, 'C', i),
        usages: count(r, 'D', i),
      }));
      return {
        endpoint,
        templates: mergeActivity(activity.out),
        daily: dedupe(daily.out, (d) => `${d.templateId}|${d.date.getTime()}|${d.audience}`),
        skipped: mergeSkipped(activity.skipped, daily.skipped),
      };
    }
    case 'brand.breakdowns': {
      const { out, skipped } = eachRow(rows, (r, i): BrandDailyRow => ({
        date: utcDay(r, 'e', i),
        audience: audience(r, i),
        applies: count(r, 'C', i),
        usages: count(r, 'D', i),
      }));
      return { endpoint, brandDaily: dedupe(out, (d) => `${d.date.getTime()}|${d.audience}`), skipped };
    }
    case 'tier_scores': {
      const { out, skipped } = eachRow(rows, (r, i): TierRow => {
        const score = r.F == null ? null : numeric(r.F);
        if (r.F != null && score === null) {
          throw new ParseError(`A[${i}].F harus angka, didapat ${JSON.stringify(r.F)}`);
        }
        return { date: utcDay(r, 'B', i), tier: optionalString(r, 'C', i), score, raw: r };
      });
      return { endpoint, tiers: dedupe(out, (t) => String(t.date.getTime())), skipped };
    }
    case 'templates': {
      const { out, skipped } = eachRow(rows, (r, i) => parseTemplate(r, i, brandId));
      return { endpoint, metadata: out, skipped };
    }
  }
}

function parseTemplate(r: Row, i: number, brandId: string): TemplateMeta {
  const owner = optionalString(r, 'D', i);
  if (owner && owner !== brandId) {
    throw new ParseError(`A[${i}] milik brand ${owner}, bukan ${brandId}`);
  }
  const keywords = r.T ?? [];
  if (!Array.isArray(keywords) || keywords.some((k) => typeof k !== 'string')) {
    throw new ParseError(`A[${i}].T harus array string`);
  }
  const pages = r.d == null ? null : numeric(r.d);
  if (r.d != null && (pages === null || !Number.isInteger(pages))) {
    throw new ParseError(`A[${i}].d harus bilangan bulat, didapat ${JSON.stringify(r.d)}`);
  }
  // Respons asli: m[0].C[0].A; fixture yang sudah dibersihkan menyimpannya sebagai `thumbnail`.
  const media = r.m as { C?: { A?: unknown }[] }[] | undefined;
  const thumb = r.thumbnail ?? media?.[0]?.C?.[0]?.A ?? null;
  return {
    id: templateId(r, 'A', i),
    sourceDesignId: optionalString(r, 'I', i),
    title: optionalString(r, 'R', i),
    keywords: keywords as string[],
    license: optionalString(r, '0', i),
    pageCount: pages,
    thumbnailUrl: typeof thumb === 'string' ? thumb : null,
  };
}

/** Ekstrak ID desain Canva ("DAH…") dari URL `canva.com/design/<id>/…`. */
export function extractDesignId(url: string | null | undefined): string | null {
  return url?.match(/\/design\/(D[A-Za-z0-9_-]{10})/)?.[1] ?? null;
}
