import prisma from '@/lib/prisma';
import { Prisma } from '../../../generated/prisma';

/**
 * Retensi respons mentah Canva Insights (docs/knowledge/canva-insights-spec.md §4).
 * Collector mengambil ulang 14 hari terakhir setiap hari, jadi payload mentah adalah bagian terbesar
 * database. Baris harian tidak tersentuh; batch lama hanya kehilangan kemampuan diparse ulang.
 */

/** Payload batch lebih tua dari ini diganti penanda `{ purgedAt }`. */
export const PAYLOAD_RETENTION_DAYS = 60;
/** Baris batch (status, rowCount) lebih tua dari ini dihapus seluruhnya. */
export const BATCH_RETENTION_DAYS = 365;

const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;
let lastPruneAt = 0;

export interface PruneResult {
  payloadsPurged: number;
  batchesDeleted: number;
}

export async function pruneIngestBatches({
  payloadDays = PAYLOAD_RETENTION_DAYS,
  batchDays = BATCH_RETENTION_DAYS,
  dryRun = false,
} = {}): Promise<PruneResult> {
  // received_at ditulis Prisma (bukan default DB), jadi batas waktu dihitung di JS agar konsisten.
  const payloadCutoff = new Date(Date.now() - payloadDays * 24 * 60 * 60 * 1000);
  const batchCutoff = new Date(Date.now() - batchDays * 24 * 60 * 60 * 1000);

  if (dryRun) {
    const [row] = await prisma.$queryRaw<{ payloads: bigint; batches: bigint }[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE received_at < ${payloadCutoff} AND NOT (payload ? 'purgedAt')) AS payloads,
        COUNT(*) FILTER (WHERE received_at < ${batchCutoff}) AS batches
      FROM canva_ingest_batches`);
    return { payloadsPurged: Number(row.payloads), batchesDeleted: Number(row.batches) };
  }

  const batchesDeleted = await prisma.$executeRaw(Prisma.sql`
    DELETE FROM canva_ingest_batches WHERE received_at < ${batchCutoff}`);
  const payloadsPurged = await prisma.$executeRaw(Prisma.sql`
    UPDATE canva_ingest_batches
    SET payload = jsonb_build_object('purgedAt', to_jsonb(now()))
    WHERE received_at < ${payloadCutoff} AND NOT (payload ? 'purgedAt')`);
  return { payloadsPurged, batchesDeleted };
}

/** Dipanggil setelah run collector selesai; paling banyak sekali per 12 jam per proses. */
export async function maybePruneIngestBatches(): Promise<PruneResult | null> {
  if (Date.now() - lastPruneAt < MIN_INTERVAL_MS) return null;
  lastPruneAt = Date.now();
  return pruneIngestBatches();
}
