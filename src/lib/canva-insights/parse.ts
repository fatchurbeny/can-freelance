/**
 * Parser respons endpoint internal Canva Creator Insights (docs/knowledge/canva-insights-spec.md §1).
 * Fungsi murni, tanpa DB. Fail-closed: field wajib hilang atau tipe salah → ParseError, tidak ada
 * hasil parsial. Huruf field berbeda arti per endpoint, jadi tiap endpoint punya pemetaan sendiri.
 */

/** Naikkan bila pemetaan berubah, lalu jalankan reparse (src/lib/canva-insights/reparse.ts). */
export const PARSER_VERSION = 1;

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

export type ParsedBatch =
  | { endpoint: 'content.by_brand'; templates: TemplateActivity[] }
  | { endpoint: 'content.by_content'; templates: TemplateActivity[]; daily: TemplateDailyRow[] }
  | { endpoint: 'brand.breakdowns'; brandDaily: BrandDailyRow[] }
  | { endpoint: 'tier_scores'; tiers: TierRow[] }
  | { endpoint: 'templates'; metadata: TemplateMeta[] };

const DAY_MS = 24 * 60 * 60 * 1000;
const TEMPLATE_ID = /^EA[A-Za-z0-9_-]{9}$/;

type Row = Record<string, unknown>;

function rowsOf(payload: unknown): Row[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ParseError('payload bukan objek');
  }
  const rows = (payload as Row).A;
  if (!Array.isArray(rows)) throw new ParseError('payload.A bukan array');
  rows.forEach((r, i) => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) throw new ParseError(`A[${i}] bukan objek`);
  });
  return rows as Row[];
}

function count(row: Row, key: string, i: number): number {
  const v = row[key];
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
    throw new ParseError(`A[${i}].${key} harus bilangan bulat ≥ 0, didapat ${JSON.stringify(v)}`);
  }
  return v;
}

function timestamp(row: Row, key: string, i: number): number {
  const v = row[key];
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
    throw new ParseError(`A[${i}].${key} harus timestamp ms, didapat ${JSON.stringify(v)}`);
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

function audience(row: Row, i: number): Audience {
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

function parseContentActivity(rows: Row[]): TemplateActivity[] {
  return mergeActivity(
    rows.map((r, i) => {
      const id = templateId(r, 'e', i);
      count(r, 'C', i);
      count(r, 'D', i);
      return { id, publishedAt: optionalTimestamp(r, 'j', i), lastActivityAt: optionalTimestamp(r, 'E', i) };
    }),
  );
}

function parseByContent(rows: Row[]): TemplateDailyRow[] {
  const byKey = new Map<string, TemplateDailyRow>();
  rows.forEach((r, i) => {
    const row: TemplateDailyRow = {
      templateId: templateId(r, 'e', i),
      date: utcDay(r, 'k', i),
      audience: audience(r, i),
      applies: count(r, 'C', i),
      usages: count(r, 'D', i),
    };
    byKey.set(`${row.templateId}|${row.date.getTime()}|${row.audience}`, row);
  });
  return Array.from(byKey.values());
}

function parseBreakdowns(rows: Row[]): BrandDailyRow[] {
  const byKey = new Map<string, BrandDailyRow>();
  rows.forEach((r, i) => {
    const row: BrandDailyRow = {
      date: utcDay(r, 'e', i),
      audience: audience(r, i),
      applies: count(r, 'C', i),
      usages: count(r, 'D', i),
    };
    byKey.set(`${row.date.getTime()}|${row.audience}`, row);
  });
  return Array.from(byKey.values());
}

function parseTierScores(rows: Row[]): TierRow[] {
  const byDay = new Map<number, TierRow>();
  rows.forEach((r, i) => {
    const score = r.F;
    if (score != null && (typeof score !== 'number' || !Number.isFinite(score))) {
      throw new ParseError(`A[${i}].F harus angka, didapat ${JSON.stringify(score)}`);
    }
    const row: TierRow = {
      date: utcDay(r, 'B', i),
      tier: optionalString(r, 'C', i),
      score: score ?? null,
      raw: r,
    };
    byDay.set(row.date.getTime(), row);
  });
  return Array.from(byDay.values());
}

function parseTemplates(rows: Row[], brandId: string): TemplateMeta[] {
  return rows.map((r, i) => {
    const owner = optionalString(r, 'D', i);
    if (owner && owner !== brandId) {
      throw new ParseError(`A[${i}] milik brand ${owner}, bukan ${brandId}`);
    }
    const keywords = r.T ?? [];
    if (!Array.isArray(keywords) || keywords.some((k) => typeof k !== 'string')) {
      throw new ParseError(`A[${i}].T harus array string`);
    }
    const pages = r.d;
    if (pages != null && (typeof pages !== 'number' || !Number.isInteger(pages))) {
      throw new ParseError(`A[${i}].d harus bilangan bulat, didapat ${JSON.stringify(pages)}`);
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
      pageCount: pages ?? null,
      thumbnailUrl: typeof thumb === 'string' ? thumb : null,
    };
  });
}

export function parseBatch(endpoint: CanvaEndpoint, payload: unknown, brandId: string): ParsedBatch {
  const rows = rowsOf(payload);
  switch (endpoint) {
    case 'content.by_brand':
      return { endpoint, templates: parseContentActivity(rows) };
    case 'content.by_content':
      return { endpoint, templates: parseContentActivity(rows), daily: parseByContent(rows) };
    case 'brand.breakdowns':
      return { endpoint, brandDaily: parseBreakdowns(rows) };
    case 'tier_scores':
      return { endpoint, tiers: parseTierScores(rows) };
    case 'templates':
      return { endpoint, metadata: parseTemplates(rows, brandId) };
  }
}

/** Ekstrak ID desain Canva ("DAH…") dari URL `canva.com/design/<id>/…`. */
export function extractDesignId(url: string | null | undefined): string | null {
  return url?.match(/\/design\/(D[A-Za-z0-9_-]{10})/)?.[1] ?? null;
}
