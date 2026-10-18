/**
 * Multi-Production Fase 1 — seed & backfill (idempotent).
 * Creates Platform "Canva" and ProductionUnit "Freelance Lamongan" using the fixed IDs
 * that the schema defaults point to, then reports row counts per production.
 * Run: npx tsx scripts/backfill-multi-production.ts
 */

import prisma from '../src/lib/prisma';
import { decrypt } from '../src/lib/encryption';

const CANVA_PLATFORM_ID = '00000000-0000-4000-8000-000000000001';
const LAMONGAN_UNIT_ID = '00000000-0000-4000-8000-000000000101';

async function main() {
  console.log('--- Multi-Production Fase 1 Backfill ---');

  const platform = await prisma.platform.upsert({
    where: { id: CANVA_PLATFORM_ID },
    update: {},
    create: { id: CANVA_PLATFORM_ID, name: 'Canva', slug: 'canva', outputType: 'canva_link' },
  });
  console.log(`[OK] Platform: ${platform.name} (${platform.slug})`);

  const notionDb = await prisma.notionDatabase.findFirst({ orderBy: { name: 'asc' } });
  if (!notionDb) {
    throw new Error('NotionDatabase belum ada — hubungkan database Notion dulu, lalu jalankan ulang.');
  }
  const taskDbId = decrypt(notionDb.encryptedDatabaseId, notionDb.iv);

  const unit = await prisma.productionUnit.upsert({
    where: { id: LAMONGAN_UNIT_ID },
    update: { notionTaskDbId: taskDbId },
    create: {
      id: LAMONGAN_UNIT_ID,
      name: 'Freelance Lamongan',
      slug: 'freelance-lamongan',
      platformId: platform.id,
      notionTaskDbId: taskDbId,
    },
  });
  console.log(`[OK] ProductionUnit: ${unit.name} (${unit.slug})`);

  const [tasks, doctypes, accounts] = await Promise.all([
    prisma.task.count({ where: { productionUnitId: unit.id } }),
    prisma.doctype.count({ where: { platformId: platform.id } }),
    prisma.account.count({ where: { platformId: platform.id } }),
  ]);
  console.log(`Tasks → ${unit.name}: ${tasks}`);
  console.log(`Doctypes → Canva: ${doctypes}`);
  console.log(`Accounts → Canva: ${accounts}`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
