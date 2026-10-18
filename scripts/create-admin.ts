/**
 * Buat akun Admin pertama (login ID + PIN). PIN awal dicetak SEKALI ke terminal.
 * Run: npx tsx scripts/create-admin.ts "Nama Admin"
 * Idempoten: bila FT-001 sudah ada, skrip berhenti tanpa mengubah apa pun.
 */

import prisma from '../src/lib/prisma';
import { generatePin, hashPin } from '../src/lib/pin';

async function main() {
  const name = process.argv[2] || 'Admin';
  const existing = await prisma.user.findUnique({ where: { userCode: 'FT-001' } });
  if (existing) {
    console.log('FT-001 sudah ada; tidak ada perubahan. Reset PIN lewat Admin atau hapus baris itu secara manual.');
    return;
  }
  const pin = generatePin();
  await prisma.user.create({
    data: {
      name,
      userCode: 'FT-001',
      employmentType: 'FULL_TIME',
      pinHash: hashPin(pin),
      pinMustChange: true,
      role: 'admin',
      memberships: { create: [{ roleKey: 'admin', productionUnitId: null }] },
    },
  });
  console.log(`Admin dibuat. ID: FT-001  PIN awal: ${pin}  (wajib diganti saat login pertama; tidak ditampilkan lagi)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
