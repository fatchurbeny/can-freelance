import prisma from '@/lib/prisma';
import type { Prisma } from '../../../generated/prisma';
import { ingestBatch, type IngestResult } from './ingest';
import { isCanvaEndpoint } from './parse';

/**
 * Jalur manual (spek §5.2): impor fixture `{ brandId, captures: [{ endpoint, query, response }] }`
 * atau satu respons `{ brandId, endpoint, query, payload }`. Memakai handler ingest yang sama.
 */

export interface ImportSummary {
  brandId: string;
  results: (IngestResult & { endpoint: string })[];
  templates: { total: number; designId: number; title: number; manual: number; unmatched: number };
}

interface Capture {
  endpoint: unknown;
  query?: unknown;
  response?: unknown;
  payload?: unknown;
}

export async function importInsightsJson(raw: unknown): Promise<ImportSummary> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('JSON harus berupa objek');
  const doc = raw as { brandId?: unknown; captures?: unknown } & Capture;
  if (typeof doc.brandId !== 'string' || !doc.brandId) throw new Error('brandId wajib ada di JSON');
  const brandId = doc.brandId;

  const captures: Capture[] = Array.isArray(doc.captures) ? doc.captures : [doc];
  captures.forEach((c, i) => {
    if (!isCanvaEndpoint(c.endpoint)) throw new Error(`captures[${i}].endpoint tidak dikenal: ${String(c.endpoint)}`);
  });

  const results: ImportSummary['results'] = [];
  for (const c of captures) {
    const result = await ingestBatch({
      brandId,
      endpoint: c.endpoint as Parameters<typeof ingestBatch>[0]['endpoint'],
      query: (c.query ?? {}) as Prisma.InputJsonValue,
      payload: (c.payload ?? c.response ?? null) as Prisma.InputJsonValue,
      source: 'manual',
    });
    results.push({ ...result, endpoint: String(c.endpoint) });
  }

  const grouped = await prisma.canvaTemplate.groupBy({
    by: ['matchMethod'],
    where: { canvaBrandId: brandId },
    _count: { _all: true },
  });
  const countOf = (m: string | null) => grouped.find((g) => g.matchMethod === m)?._count._all ?? 0;
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
  return {
    brandId,
    results,
    templates: {
      total,
      designId: countOf('design_id'),
      title: countOf('title'),
      manual: countOf('manual'),
      unmatched: countOf(null),
    },
  };
}
