import prisma from '@/lib/prisma';
import { Prisma } from '../../../generated/prisma';
import type { InsightsAudience, TemplateLinkFilter, TemplateSort } from './view';

/**
 * Query tab Canva Insights (docs/knowledge/canva-insights-spec.md §7). Semua tanggal = hari UTC
 * ("YYYY-MM-DD"), sama dengan dashboard Canva.
 *
 * Audiens: "all" memakai baris Free (B) + Pro (C); baris "ALL" (respons tanpa contentRoyalties)
 * hanya dipakai bila hari itu tidak punya baris B/C, agar tidak terhitung ganda (spek §4).
 */

export interface InsightsBrand {
  brandId: string;
  name: string;
}

export interface BrandDailyPoint {
  brandId: string;
  day: string;
  applies: number;
  usages: number;
}

export interface TemplateRow {
  id: string;
  title: string | null;
  license: string | null;
  pageCount: number | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  matchMethod: string | null;
  applies: number;
  usages: number;
  prevApplies: number;
  prevUsages: number;
  taskName: string | null;
  taskUrl: string | null;
  designer: string | null;
}

export interface DateRange {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
}

function audienceSum(column: 'applies' | 'usages', audience: InsightsAudience): Prisma.Sql {
  const col = Prisma.raw(column);
  if (audience === 'all') {
    return Prisma.sql`COALESCE(SUM(${col}) FILTER (WHERE audience IN ('B', 'C')), SUM(${col}) FILTER (WHERE audience = 'ALL'), 0)`;
  }
  return Prisma.sql`COALESCE(SUM(${col}) FILTER (WHERE audience = ${audience}), 0)`;
}

/** Brand Canva yang terhubung ke akun platform production ini. */
export async function insightsBrandsForPlatform(platformId: string): Promise<InsightsBrand[]> {
  const accounts = await prisma.account.findMany({
    where: { platformId, canvaBrandId: { not: null } },
    select: { canvaBrandId: true, displayName: true },
    orderBy: { displayName: 'asc' },
  });
  return accounts.map((a) => ({ brandId: a.canvaBrandId!, name: a.displayName }));
}

/** Total harian akun (endpoint breakdowns) untuk rentang sebelumnya + sekarang. */
export async function loadBrandDaily(brandIds: string[], range: DateRange, audience: InsightsAudience): Promise<BrandDailyPoint[]> {
  if (brandIds.length === 0) return [];
  const rows = await prisma.$queryRaw<{ brand_id: string; day: string; applies: number; usages: number }[]>(Prisma.sql`
    SELECT canva_brand_id AS brand_id, to_char(date, 'YYYY-MM-DD') AS day,
      ${audienceSum('applies', audience)}::int AS applies,
      ${audienceSum('usages', audience)}::int AS usages
    FROM canva_brand_daily
    WHERE canva_brand_id = ANY(${brandIds}::text[])
      AND date BETWEEN ${range.prevFrom}::date AND ${range.to}::date
    GROUP BY canva_brand_id, date`);
  return rows.map((r) => ({ brandId: r.brand_id, day: r.day, applies: r.applies, usages: r.usages }));
}

/** Tier terbaru & sinkron terakhir per brand. */
export async function loadBrandStatus(brandIds: string[]) {
  const [tiers, runs] = await Promise.all([
    prisma.canvaTierScore.findMany({
      where: { canvaBrandId: { in: brandIds } },
      orderBy: { date: 'desc' },
      distinct: ['canvaBrandId'],
      select: { canvaBrandId: true, tier: true, date: true },
    }),
    prisma.canvaCollectorRun.findMany({
      where: { canvaBrandId: { in: brandIds } },
      orderBy: { startedAt: 'desc' },
      distinct: ['canvaBrandId'],
      select: { canvaBrandId: true, status: true, startedAt: true, finishedAt: true, host: true, message: true },
    }),
  ]);
  return { tiers, runs };
}

export async function loadTemplateCounts(brandId: string) {
  const [all, linked] = await Promise.all([
    prisma.canvaTemplate.count({ where: { canvaBrandId: brandId } }),
    prisma.canvaTemplate.count({ where: { canvaBrandId: brandId, taskId: { not: null } } }),
  ]);
  return { all, linked, unlinked: all - linked };
}

const SORT_SQL: Record<TemplateSort, Prisma.Sql> = {
  published: Prisma.sql`t.published_at DESC NULLS LAST`,
  applies: Prisma.sql`applies DESC`,
  usages: Prisma.sql`usages DESC`,
};

/** Tabel template satu brand: agregasi per template, filter, urut, LIMIT/OFFSET di SQL. */
export async function loadTemplatePage(opts: {
  brandId: string;
  range: DateRange;
  audience: InsightsAudience;
  link: TemplateLinkFilter;
  search: string;
  sort: TemplateSort;
  page: number;
  pageSize: number;
}): Promise<{ rows: TemplateRow[]; total: number }> {
  const { brandId, range, audience } = opts;
  const linkSql =
    opts.link === 'linked' ? Prisma.sql`AND t.task_id IS NOT NULL` : opts.link === 'unlinked' ? Prisma.sql`AND t.task_id IS NULL` : Prisma.empty;
  const searchSql = opts.search ? Prisma.sql`AND t.title ILIKE ${`%${opts.search}%`}` : Prisma.empty;

  const rows = await prisma.$queryRaw<
    {
      id: string; title: string | null; license: string | null; page_count: number | null; thumbnail_url: string | null;
      published_at: Date | null; match_method: string | null; applies: number; usages: number; prev_applies: number;
      prev_usages: number; task_name: string | null; task_url: string | null; designer: string | null; total: number;
    }[]
  >(Prisma.sql`
    WITH td AS (
      SELECT d.template_id, d.date,
        ${audienceSum('applies', audience)} AS applies,
        ${audienceSum('usages', audience)} AS usages
      FROM canva_template_daily d
      JOIN canva_templates t ON t.id = d.template_id
      WHERE t.canva_brand_id = ${brandId}
        AND d.date BETWEEN ${range.prevFrom}::date AND ${range.to}::date
      GROUP BY d.template_id, d.date
    ), agg AS (
      SELECT template_id,
        SUM(applies) FILTER (WHERE date >= ${range.from}::date) AS applies,
        SUM(usages) FILTER (WHERE date >= ${range.from}::date) AS usages,
        SUM(applies) FILTER (WHERE date <= ${range.prevTo}::date) AS prev_applies,
        SUM(usages) FILTER (WHERE date <= ${range.prevTo}::date) AS prev_usages
      FROM td GROUP BY template_id
    )
    SELECT t.id, t.title, t.license, t.page_count, t.thumbnail_url, t.published_at, t.match_method,
      COALESCE(agg.applies, 0)::int AS applies, COALESCE(agg.usages, 0)::int AS usages,
      COALESCE(agg.prev_applies, 0)::int AS prev_applies, COALESCE(agg.prev_usages, 0)::int AS prev_usages,
      k.name AS task_name, k.notion_url AS task_url, ds.display_name AS designer,
      (COUNT(*) OVER ())::int AS total
    FROM canva_templates t
    LEFT JOIN agg ON agg.template_id = t.id
    LEFT JOIN tasks k ON k.id = t.task_id
    LEFT JOIN designers ds ON ds.id = k.designer_id
    WHERE t.canva_brand_id = ${brandId} ${linkSql} ${searchSql}
    ORDER BY ${SORT_SQL[opts.sort]}, t.id
    LIMIT ${opts.pageSize} OFFSET ${(opts.page - 1) * opts.pageSize}`);

  return {
    total: rows[0]?.total ?? 0,
    rows: rows.map((r) => ({
      id: r.id,
      title: r.title,
      license: r.license,
      pageCount: r.page_count,
      thumbnailUrl: r.thumbnail_url,
      publishedAt: r.published_at,
      matchMethod: r.match_method,
      applies: r.applies,
      usages: r.usages,
      prevApplies: r.prev_applies,
      prevUsages: r.prev_usages,
      taskName: r.task_name,
      taskUrl: r.task_url,
      designer: r.designer,
    })),
  };
}
