'use server';

import { denyWrite, getAccess } from '@/lib/access';
import prisma from '@/lib/prisma';
import { importInsightsJson, type ImportSummary } from '@/lib/canva-insights/import';
import { insightsBrandsForPlatform, loadBrandDaily, loadBrandStatus, loadTemplateCounts, loadTemplatePage } from '@/lib/canva-insights/queries';
import { comparisonRange } from '@/lib/canva-insights/range';
import type { InsightsBrandView, InsightsData, InsightsQuery } from '@/lib/canva-insights/view';
import { UnknownBrandError } from '@/lib/canva-insights/ingest';
import { MAX_INGEST_BYTES } from '@/lib/canva-insights/api-auth';

/**
 * Unggah/tempel JSON respons Canva Insights secara manual (fixture atau satu respons).
 * Diproses oleh handler ingest yang sama dengan collector, `source = "manual"`.
 */
export async function importCanvaInsightsAction(
  jsonText: string,
): Promise<{ success: true; summary: ImportSummary } | { success: false; error: string }> {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied;
  // Fixture berisi beberapa respons; batas per respons tetap dicek di sisi collector.
  if (Buffer.byteLength(jsonText) > MAX_INGEST_BYTES * 10) {
    return { success: false, error: 'File terlalu besar (maks 20 MB).' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return { success: false, error: 'Isi bukan JSON yang valid.' };
  }
  try {
    return { success: true, summary: await importInsightsJson(raw) };
  } catch (e) {
    if (e instanceof UnknownBrandError) {
      return { success: false, error: `${e.message}. Jalankan scripts/seed-canva-brands.ts terlebih dahulu.` };
    }
    console.error('[importCanvaInsightsAction]', e);
    return { success: false, error: (e as Error).message || 'Gagal mengimpor data Canva Insights.' };
  }
}

const STALE_MS = 48 * 60 * 60 * 1000;
const PAGE_SIZES = new Set([10, 25, 50, 100]);
const AUDIENCES = new Set(['all', 'B', 'C']);

/**
 * Data tab Canva Insights di Production (spek §7): brand dari akun platform production itu.
 * `brandId = "all"` → ringkasan & seri harian semua brand; satu brand → plus tabel template.
 */
export async function getCanvaInsightsAction(
  query: InsightsQuery,
): Promise<{ success: true; data: InsightsData } | { success: false; error: string }> {
  try {
    const access = await getAccess();
    if (access.enabled && (!access.user || access.user.pinMustChange || !access.allows('insights.view', query.productionUnitId))) {
      return { success: false, error: 'Anda tidak punya izin untuk melihat Canva Insights.' };
    }
    const unit = await prisma.productionUnit.findUnique({ where: { id: query.productionUnitId }, select: { platformId: true } });
    if (!unit) return { success: false, error: 'Production tidak ditemukan.' };
    if (!AUDIENCES.has(query.audience)) return { success: false, error: 'Audiens tidak valid.' };

    const range = comparisonRange(query.from, query.to);
    const allBrands = await insightsBrandsForPlatform(unit.platformId);
    if (query.brandId !== 'all' && !allBrands.some((b) => b.brandId === query.brandId)) {
      return { success: false, error: 'Brand tidak terhubung ke production ini.' };
    }
    const ids = allBrands.map((b) => b.brandId);
    const [daily, status] = await Promise.all([loadBrandDaily(ids, range, query.audience), loadBrandStatus(ids)]);

    const dayIndex = new Map(range.days.map((d, i) => [d, i]));
    const now = Date.now();
    const brands: InsightsBrandView[] = allBrands.map((b) => {
      const series = { applies: range.days.map(() => 0), usages: range.days.map(() => 0) };
      let prevApplies = 0;
      let prevUsages = 0;
      let hasData = false;
      for (const p of daily) {
        if (p.brandId !== b.brandId) continue;
        hasData = true;
        const i = dayIndex.get(p.day);
        if (i !== undefined) {
          series.applies[i] = p.applies;
          series.usages[i] = p.usages;
        } else if (p.day <= range.prevTo) {
          prevApplies += p.applies;
          prevUsages += p.usages;
        }
      }
      const run = status.runs.find((r) => r.canvaBrandId === b.brandId) ?? null;
      const lastOk = run && run.status === 'OK' ? (run.finishedAt ?? run.startedAt).getTime() : null;
      return {
        brandId: b.brandId,
        name: b.name,
        tier: status.tiers.find((t) => t.canvaBrandId === b.brandId)?.tier ?? null,
        lastRun: run
          ? { status: run.status, at: (run.finishedAt ?? run.startedAt).toISOString(), host: run.host, message: run.message }
          : null,
        stale: lastOk === null || now - lastOk > STALE_MS,
        applies: series.applies.reduce((a, v) => a + v, 0),
        usages: series.usages.reduce((a, v) => a + v, 0),
        prevApplies,
        prevUsages,
        hasData,
        series,
      };
    });

    let templates: InsightsData['templates'] = null;
    if (query.brandId !== 'all' && query.templates) {
      const t = query.templates;
      const pageSize = PAGE_SIZES.has(t.pageSize) ? t.pageSize : 25;
      const [page, counts] = await Promise.all([
        loadTemplatePage({
          brandId: query.brandId,
          range,
          audience: query.audience,
          link: t.link,
          search: t.search.trim().slice(0, 100),
          sort: t.sort,
          page: Math.max(1, Math.floor(t.page)),
          pageSize,
        }),
        loadTemplateCounts(query.brandId),
      ]);
      templates = {
        total: page.total,
        counts,
        rows: page.rows.map((r) => ({
          ...r,
          publishedAt: r.publishedAt?.toISOString() ?? null,
          isNew: !!r.publishedAt && r.publishedAt.toISOString().slice(0, 10) >= range.from,
        })),
      };
    }

    return { success: true, data: { range, brands, templates } };
  } catch (e) {
    console.error('[getCanvaInsightsAction]', e);
    return { success: false, error: (e as Error).message || 'Gagal memuat Canva Insights.' };
  }
}
