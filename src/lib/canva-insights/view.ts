/** Bentuk data tab Canva Insights yang dikirim server action ke client (tanpa import server). */

export type InsightsAudience = 'all' | 'B' | 'C';
export type TemplateSort = 'published' | 'applies' | 'usages';
export type TemplateLinkFilter = 'all' | 'linked' | 'unlinked';

export interface InsightsQuery {
  productionUnitId: string;
  /** "all" atau Canva brandId. */
  brandId: string;
  from: string;
  to: string;
  audience: InsightsAudience;
  templates?: {
    link: TemplateLinkFilter;
    search: string;
    sort: TemplateSort;
    page: number;
    pageSize: number;
  };
}

export interface InsightsBrandView {
  brandId: string;
  name: string;
  tier: string | null;
  lastRun: { status: string; at: string; host: string | null; message: string | null } | null;
  /** Belum pernah OK, atau OK terakhir > 48 jam lalu. */
  stale: boolean;
  applies: number;
  usages: number;
  prevApplies: number;
  prevUsages: number;
  hasData: boolean;
  series: { applies: number[]; usages: number[] };
}

export interface InsightsTemplateView {
  id: string;
  title: string | null;
  license: string | null;
  pageCount: number | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  isNew: boolean;
  matchMethod: string | null;
  applies: number;
  usages: number;
  prevApplies: number;
  prevUsages: number;
  taskName: string | null;
  taskUrl: string | null;
  designer: string | null;
}

export interface InsightsData {
  /** `scale`: pengali total sekarang untuk persen pembanding (rata-rata per hari, lihat range.ts). */
  range: { from: string; to: string; prevFrom: string; prevTo: string; days: string[]; scale: number };
  brands: InsightsBrandView[];
  templates: {
    rows: InsightsTemplateView[];
    total: number;
    counts: { all: number; linked: number; unlinked: number };
  } | null;
}

/** Hari dalam 7 hari terakhir (UTC) masih bisa direvisi Canva. */
export const PROVISIONAL_DAYS = 7;
