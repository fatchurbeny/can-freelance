import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAccess } from '@/lib/access';
import { can } from '@/lib/permissions';
import { canUseTaskBrief, IMPRO_URL, isImproTarget, signTicket } from '@/lib/impro-sso';

export const dynamic = 'force-dynamic';

/** Halaman error sederhana (tombol dibuka di tab baru, jadi tidak ada halaman asal untuk toast). */
function fail(status: number, message: string) {
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kirim brief</title>
<style>body{font-family:Inter,system-ui,sans-serif;background:#f7f7f8;color:#111;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px}
div{background:#fff;border:1px solid #e5e5e5;padding:24px;max-width:420px}h1{font-size:15px;margin:0 0 8px}p{font-size:13px;color:#555;margin:0}
@media (prefers-color-scheme:dark){body{background:#0d0e12;color:#eee}div{background:#16181d;border-color:#272a34}p{color:#aaa}}</style></head>
<body><div><h1>Brief tidak bisa dikirim</h1><p>${message.replace(/[<>&]/g, '')}</p></div></body></html>`;
  return new NextResponse(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

/**
 * Tombol "Kirim ke Deck/Doc" di task: sesi can-freelance → tiket HS256 sekali pakai → redirect ke
 * improstd /sso/can-freelance?t=… (kontrak I-22). ?target= opsional; bawaan = doctype.studio.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const taskId = url.searchParams.get('task') || '';

  const access = await getAccess();
  if (!access.enabled) return fail(400, 'Login ID + PIN belum aktif di server ini (AUTH_MODE).');
  if (access.readOnly) return fail(403, 'Tidak tersedia saat mode "Lihat sebagai". Keluar dari pratinjau dulu.');
  const user = access.user;
  if (!user || user.pinMustChange) return fail(401, 'Sesi berakhir. Masuk lagi ke CAN Freelance.');
  if (user.employmentType === 'FULL_TIME' && /^FT-/i.test(user.userCode || '')) {
    return fail(403, `ID ${user.userCode} belum diganti ke ID PRO. Minta Admin mengisi ID PRO di User & Role.`);
  }

  if (!/^[0-9a-f-]{36}$/i.test(taskId)) return fail(404, 'Task tidak ditemukan.');
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, productionUnitId: true, designerId: true, doctype: { select: { studio: true } } },
  });
  if (!task) return fail(404, 'Task tidak ditemukan.');
  if (!canUseTaskBrief(user, task)) return fail(403, 'Anda hanya bisa mengirim brief dari task milik Anda.');

  const requested = url.searchParams.get('target');
  const target = isImproTarget(requested) ? requested : task.doctype?.studio;
  if (!isImproTarget(target)) return fail(400, 'Doctype task ini belum diatur ke Deck atau Doc (Rate Card › Doctype › Studio).');

  const ticket = signTicket({
    sub: user.userCode || '',
    name: user.name || user.userCode || '',
    emp: user.employmentType === 'FULL_TIME' ? 'FULL_TIME' : 'FREELANCE',
    brand: can(user, 'account.view', task.productionUnitId),
    task: task.id,
    target,
  });
  if (!ticket) return fail(500, 'SSO_SECRET belum diisi di server.');

  return NextResponse.redirect(`${IMPRO_URL()}/sso/can-freelance?t=${encodeURIComponent(ticket)}`, { status: 303, headers: { 'cache-control': 'no-store' } });
}
