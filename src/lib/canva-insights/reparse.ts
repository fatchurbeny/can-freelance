import prisma from '@/lib/prisma';
import { Prisma } from '../../../generated/prisma';
import { processBatch, type IngestResult } from './ingest';
import { matchTemplates } from './match';

/**
 * Parse ulang batch tersimpan dengan parser terbaru (dipakai bila pemetaan field berubah).
 * Urut dari batch terlama agar data terbaru yang menang saat upsert. Batch yang payload-nya sudah
 * dikosongkan retensi (`{ purgedAt }`, lihat retention.ts) dilewati.
 */
export async function reparseBatches(opts: { brandId?: string; batchIds?: string[] } = {}): Promise<IngestResult[]> {
  const batches = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM canva_ingest_batches
    WHERE status IN ('PARSED', 'REJECTED')
      AND NOT (payload ? 'purgedAt')
      ${opts.brandId ? Prisma.sql`AND canva_brand_id = ${opts.brandId}` : Prisma.empty}
      ${opts.batchIds ? Prisma.sql`AND id = ANY(${opts.batchIds}::uuid[])` : Prisma.empty}
    ORDER BY received_at ASC`);

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
