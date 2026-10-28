import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeCollector, readJsonBody } from '@/lib/canva-insights/api-auth';

const FINAL_STATUSES = ['OK', 'NEEDS_LOGIN', 'ERROR'] as const;

/**
 * Laporan run collector per brand (spek §5.2).
 * Mulai:   { action: "start", brandId, host? }            → { runId }
 * Selesai: { action: "finish", runId, status, message? }  → { ok: true }
 */
export async function POST(request: Request) {
  const denied = authorizeCollector(request);
  if (denied) return denied;

  const read = await readJsonBody(request);
  if ('error' in read) return read.error;
  const { action, brandId, host, runId, status, message } = read.body;

  if (action === 'start') {
    if (typeof brandId !== 'string' || !brandId) {
      return NextResponse.json({ error: 'brandId wajib diisi' }, { status: 400 });
    }
    const account = await prisma.account.findUnique({ where: { canvaBrandId: brandId }, select: { id: true } });
    if (!account) return NextResponse.json({ error: `Brand ${brandId} belum terdaftar` }, { status: 403 });
    const run = await prisma.canvaCollectorRun.create({
      data: {
        canvaBrandId: brandId,
        startedAt: new Date(),
        status: 'RUNNING',
        host: typeof host === 'string' ? host.slice(0, 100) : null,
      },
      select: { id: true },
    });
    return NextResponse.json({ runId: run.id });
  }

  if (action === 'finish') {
    if (typeof runId !== 'string' || !(FINAL_STATUSES as readonly unknown[]).includes(status)) {
      return NextResponse.json({ error: `runId dan status (${FINAL_STATUSES.join('/')}) wajib diisi` }, { status: 400 });
    }
    const updated = await prisma.canvaCollectorRun.updateMany({
      where: { id: runId },
      data: {
        status: status as string,
        finishedAt: new Date(),
        message: typeof message === 'string' ? message.slice(0, 2000) : null,
      },
    });
    if (updated.count === 0) return NextResponse.json({ error: 'Run tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'action harus "start" atau "finish"' }, { status: 400 });
}
