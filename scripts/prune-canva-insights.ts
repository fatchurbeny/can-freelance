/**
 * Retensi respons mentah Canva Insights (payload > 60 hari, batch > 365 hari).
 * Run: npx tsx scripts/prune-canva-insights.ts [--dry-run]
 * Biasanya tidak perlu: berjalan otomatis setelah run collector selesai (POST /api/insights/runs).
 */

import prisma from '../src/lib/prisma';
import { BATCH_RETENTION_DAYS, PAYLOAD_RETENTION_DAYS, pruneIngestBatches } from '../src/lib/canva-insights/retention';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const result = await pruneIngestBatches({ dryRun });
  const verb = dryRun ? 'akan' : 'sudah';
  console.log(`Payload > ${PAYLOAD_RETENTION_DAYS} hari ${verb} dikosongkan: ${result.payloadsPurged}`);
  console.log(`Batch > ${BATCH_RETENTION_DAYS} hari ${verb} dihapus: ${result.batchesDeleted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
