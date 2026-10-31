/**
 * Isi Account.canvaBrandId untuk 5 brand Canva Creator (docs/knowledge/canva-insights-spec.md §2).
 * Run: npx tsx scripts/seed-canva-brands.ts            (cocokkan otomatis, hanya bila tepat satu akun)
 *      npx tsx scripts/seed-canva-brands.ts --map chital=<accountId> zahra=<accountId> ...
 * Tidak pernah menebak: brand tanpa kecocokan tunggal dilewati dan daftar akun dicetak.
 */

import prisma from '../src/lib/prisma';

const BRANDS = [
  { slug: 'chital', brandId: 'BADxbxKIT_Y', names: ['chital', 'chital graphic'] },
  { slug: 'zahra', brandId: 'BAEtJgfxnTk', names: ['zahra.art', 'zahra art', 'zahra'] },
  { slug: 'impro', brandId: 'BAEUTwNzf0Y', names: ['impro', 'improstd'] },
  { slug: 'uicreative', brandId: 'BAEWutmc71I', names: ['uicreative.net', 'uicreative', 'ui creative'] },
  { slug: 'antler', brandId: 'BAEZG0o0gf4', names: ['antler'] },
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function parseMapArgs(argv: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const idx = argv.indexOf('--map');
  if (idx === -1) return map;
  for (const pair of argv.slice(idx + 1)) {
    const [slug, accountId] = pair.split('=');
    if (slug && accountId) map.set(slug, accountId);
  }
  return map;
}

async function main() {
  const manual = parseMapArgs(process.argv.slice(2));
  const accounts = await prisma.account.findMany({
    where: { platform: { outputType: 'canva_link' } },
    select: { id: true, displayName: true, notionKey: true, canvaBrandId: true, platform: { select: { name: true } } },
    orderBy: { displayName: 'asc' },
  });

  let unresolved = 0;
  for (const brand of BRANDS) {
    let account = manual.has(brand.slug) ? accounts.find((a) => a.id === manual.get(brand.slug)) : undefined;
    if (manual.has(brand.slug) && !account) {
      console.log(`[SKIP] ${brand.slug}: accountId ${manual.get(brand.slug)} tidak ditemukan di akun platform Canva`);
      unresolved++;
      continue;
    }
    if (!account) {
      const candidates = accounts.filter((a) => brand.names.includes(norm(a.displayName)) || brand.names.includes(norm(a.notionKey)));
      if (candidates.length !== 1) {
        console.log(`[SKIP] ${brand.slug}: ${candidates.length} kandidat akun, petakan manual dengan --map ${brand.slug}=<accountId>`);
        unresolved++;
        continue;
      }
      account = candidates[0];
    }
    if (account.canvaBrandId === brand.brandId) {
      console.log(`[OK]   ${brand.slug.padEnd(10)} sudah terpasang di "${account.displayName}"`);
      continue;
    }
    await prisma.$transaction([
      // canvaBrandId unik: lepas dulu dari akun lain bila sebelumnya salah pasang.
      prisma.account.updateMany({ where: { canvaBrandId: brand.brandId }, data: { canvaBrandId: null } }),
      prisma.account.update({ where: { id: account.id }, data: { canvaBrandId: brand.brandId } }),
    ]);
    console.log(`[SET]  ${brand.slug.padEnd(10)} ${brand.brandId} → "${account.displayName}" (${account.platform.name})`);
  }

  if (unresolved > 0) {
    console.log('\nAkun platform Canva yang tersedia:');
    for (const a of accounts) {
      console.log(`  ${a.id}  ${a.displayName.padEnd(28)} notionKey=${a.notionKey.padEnd(20)} ${a.canvaBrandId ?? ''}`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
