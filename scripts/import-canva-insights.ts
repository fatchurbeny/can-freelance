/**
 * Impor fixture/respons Canva Insights lewat jalur manual (sama dengan server action unggah).
 * Run: npx tsx scripts/import-canva-insights.ts scratch/canva-insights-fixtures/*.json
 * Mencetak status tiap batch, total breakdowns 2026-09-28 … 2026-10-27, dan hasil tautan task.
 */

import { readFileSync } from 'fs';
import prisma from '../src/lib/prisma';
import { importInsightsJson } from '../src/lib/canva-insights/import';

const CHECK_FROM = new Date('2026-09-28T00:00:00Z');
const CHECK_TO = new Date('2026-10-27T00:00:00Z');

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) throw new Error('Sebutkan minimal satu file JSON.');

  for (const file of files) {
    const summary = await importInsightsJson(JSON.parse(readFileSync(file, 'utf8')));
    console.log(`\n== ${file} (${summary.brandId})`);
    for (const r of summary.results) {
      console.log(`  ${r.status.padEnd(8)} ${r.endpoint.padEnd(20)} rows=${r.rowCount}${r.error ? `  ${r.error}` : ''}`);
    }
    const sums = await prisma.canvaBrandDaily.aggregate({
      where: { canvaBrandId: summary.brandId, date: { gte: CHECK_FROM, lte: CHECK_TO } },
      _sum: { applies: true, usages: true },
    });
    console.log(`  breakdowns 28 Sep–27 Okt: applies ${sums._sum.applies ?? 0} · usages ${sums._sum.usages ?? 0}`);
    const t = summary.templates;
    console.log(`  template ${t.total}: design_id ${t.designId} · title ${t.title} · manual ${t.manual} · belum tertaut ${t.unmatched}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
