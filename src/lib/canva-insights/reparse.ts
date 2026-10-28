import prisma from '@/lib/prisma';
import { processBatch, type IngestResult } from './ingest';
import { matchTemplates } from './match';

/**
 * Parse ulang batch tersimpan dengan parser terbaru (dipakai bila pemetaan field berubah).
 * Urut dari batch terlama agar data terbaru yang menang saat upsert.
 */
export async function reparseBatches(opts: { brandId?: string; batchIds?: string[] } = {}): Promise<IngestResult[]> {
  const batches = await prisma.canvaIngestBatch.findMany({
    where: {
      status: { in: ['PARSED', 'REJECTED'] },
      ...(opts.brandId ? { canvaBrandId: opts.brandId } : {}),
      ...(opts.batchIds ? { id: { in: opts.batchIds } } : {}),
    },
    orderBy: { receivedAt: 'asc' },
    select: { id: true },
  });

  const results: IngestResult[] = [];
  const templateIds = new Set<string>();
  for (const b of batches) {
    const { templateIds: touched, ...result } = await processBatch(b.id);
    touched.forEach((id) => templateIds.add(id));
    results.push(result);
  }
  if (templateIds.size > 0) await matchTemplates(Array.from(templateIds));
  return results;
}
