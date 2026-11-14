/**
 * Migrasi ID login karyawan tetap: FT-xxx → ID PRO (roster Portal Impro, sama dengan login improstd).
 * Hanya `users.user_code` yang berubah; PIN, sesi, role, dan relasi lain tetap (semuanya memakai users.id).
 *
 * Run (uji kering, default — tidak menulis apa pun):
 *   npx tsx scripts/migrate-ft-to-pro.ts --roster ../../Claude-Code/improstd/data/users.json
 * Terapkan pasangan yang cocok tunggal + pasangan manual:
 *   npx tsx scripts/migrate-ft-to-pro.ts --roster <users.json> --map FT-001=PRO20 FT-003=PRO33 --apply
 *
 * Roster: JSON [{ id: "PRO20", nama, status }] (data/users.json improstd; hanya id/nama/status yang dibaca).
 * Tanpa --roster, hanya pasangan --map yang dipakai. Tidak pernah menebak: nama tanpa kecocokan tunggal dilewati.
 *
 * VPS: buka tunnel `ssh -p 2222 -L 15432:127.0.0.1:5432 fatchurbeny@103.89.5.148`, lalu jalankan dengan
 * DATABASE_URL yang menunjuk ke 127.0.0.1:15432 (nilai DB dari .next/standalone/.env di VPS).
 */

import fs from 'node:fs';
import prisma from '../src/lib/prisma';
import { PRO_CODE_RE } from '../src/lib/user-admin';

interface RosterRow { id: string; nama: string; status?: string }

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const rosterPath = (() => { const i = args.indexOf('--roster'); return i >= 0 ? args[i + 1] : null; })();
const manual = new Map<string, string>();
{
  const i = args.indexOf('--map');
  if (i >= 0) {
    for (const pair of args.slice(i + 1)) {
      if (pair.startsWith('--')) break;
      const [ft, pro] = pair.split('=').map((s) => s.trim().toUpperCase());
      if (!ft || !pro || !PRO_CODE_RE.test(pro)) throw new Error(`Pasangan --map tidak valid: ${pair} (format FT-001=PRO20)`);
      manual.set(ft, pro);
    }
  }
}

const words = (s: string | null | undefined) =>
  String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);

/** Cocok bila semua kata nama yang lebih pendek ada di nama yang lebih panjang (mis. "Diva" ↔ "Diva Nursyandita"). */
function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const wa = words(a), wb = words(b);
  if (!wa.length || !wb.length) return false;
  const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  return short.every((w) => long.includes(w));
}

async function main() {
  const roster: RosterRow[] = rosterPath
    ? (JSON.parse(fs.readFileSync(rosterPath, 'utf8')) as RosterRow[])
        .filter((r) => PRO_CODE_RE.test(String(r.id)) && !/uji/i.test(r.nama || ''))
        .map((r) => ({ id: String(r.id).toUpperCase(), nama: r.nama, status: r.status }))
    : [];

  const ftUsers = await prisma.user.findMany({
    where: { userCode: { startsWith: 'FT-' } },
    select: { id: true, userCode: true, name: true, isActive: true, designer: { select: { displayName: true } } },
    orderBy: { userCode: 'asc' },
  });
  const taken = new Set(
    (await prisma.user.findMany({ where: { userCode: { startsWith: 'PRO' } }, select: { userCode: true } })).map((u) => u.userCode!),
  );

  const plan: { id: string; from: string; to: string; how: string }[] = [];
  const skipped: string[] = [];
  for (const u of ftUsers) {
    const from = u.userCode!;
    const label = `${from} · ${u.name ?? '—'}${u.designer ? ` (designer ${u.designer.displayName})` : ''}${u.isActive ? '' : ' [nonaktif]'}`;
    let to = manual.get(from) ?? null;
    let how = 'manual';
    if (!to) {
      const hits = roster.filter((r) => sameName(r.nama, u.name) || sameName(r.nama, u.designer?.displayName));
      if (hits.length === 1) { to = hits[0].id; how = `nama "${hits[0].nama}"${hits[0].status && hits[0].status !== 'aktif' ? ` [${hits[0].status}]` : ''}`; }
      else { skipped.push(`${label} → ${hits.length ? `ambigu: ${hits.map((h) => `${h.id} ${h.nama}`).join(', ')}` : 'tidak ada di roster'}`); continue; }
    }
    if (taken.has(to) || plan.some((p) => p.to === to)) { skipped.push(`${label} → ${to} sudah dipakai`); continue; }
    plan.push({ id: u.id, from, to, how });
  }

  console.log(`Akun FT: ${ftUsers.length}. Akan diganti: ${plan.length}. Dilewati: ${skipped.length}.\n`);
  for (const p of plan) console.log(`  ${p.from} → ${p.to}   (${p.how})`);
  if (skipped.length) { console.log('\nDilewati (pakai --map FT-xxx=PROyy atau ubah di drawer User & Role):'); skipped.forEach((s) => console.log(`  ${s}`)); }

  if (!apply) { console.log('\nUji kering. Tambahkan --apply untuk menerapkan.'); return; }
  await prisma.$transaction(plan.map((p) => prisma.user.update({ where: { id: p.id }, data: { userCode: p.to } })));
  console.log(`\nDiterapkan: ${plan.length} akun.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
