/**
 * Official Backfill Script: Update Doctype Pages to Match Preset Standards
 * Run: npx tsx scripts/backfill-doctype-pages.ts
 */

import prisma from '../src/lib/prisma';
import { getPresetPagesByName } from '../src/lib/doctype-presets';

async function main() {
  console.log('--- Starting Doctype Pages Backfill ---');

  const doctypes = await prisma.doctype.findMany({
    orderBy: { displayName: 'asc' },
  });

  console.log(`Found ${doctypes.length} doctypes in database.\n`);

  let updatedCount = 0;

  for (const doc of doctypes) {
    const targetPages = getPresetPagesByName(doc.displayName || doc.notionKey);
    const currentPages = doc.pages != null ? Number(doc.pages) : null;

    if (currentPages !== targetPages) {
      console.log(`[UPDATE] ${doc.displayName.padEnd(26)} : ${currentPages} -> ${targetPages} pages`);
      await prisma.doctype.update({
        where: { id: doc.id },
        data: { pages: targetPages },
      });
      updatedCount++;
    } else {
      console.log(`[KEEP]   ${doc.displayName.padEnd(26)} : already ${currentPages} pages`);
    }
  }

  console.log(`\n--- Completed: ${updatedCount} doctypes updated out of ${doctypes.length} total ---`);
}

main()
  .catch((e) => {
    console.error('Error during backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
