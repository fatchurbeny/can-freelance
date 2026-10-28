import { NextResponse } from 'next/server';
import { authorizeCollector, readJsonBody } from '@/lib/canva-insights/api-auth';
import { ingestBatch, UnknownBrandError } from '@/lib/canva-insights/ingest';
import { isCanvaEndpoint } from '@/lib/canva-insights/parse';
import type { Prisma } from '../../../../../generated/prisma';

/**
 * Collector Canva Insights mengirim satu respons endpoint per request (spek §5.1).
 * Body: { brandId, endpoint, query, payload, collectorVersion?, runId? }.
 */
export async function POST(request: Request) {
  const denied = authorizeCollector(request);
  if (denied) return denied;

  const read = await readJsonBody(request);
  if ('error' in read) return read.error;
  const { brandId, endpoint, query, payload, runId } = read.body;

  if (typeof brandId !== 'string' || !brandId) {
    return NextResponse.json({ error: 'brandId wajib diisi' }, { status: 400 });
  }
  if (!isCanvaEndpoint(endpoint)) {
    return NextResponse.json({ error: `endpoint tidak dikenal: ${String(endpoint)}` }, { status: 400 });
  }
  if (payload == null || typeof payload !== 'object') {
    return NextResponse.json({ error: 'payload wajib berupa objek' }, { status: 400 });
  }

  try {
    const result = await ingestBatch({
      brandId,
      endpoint,
      query: (query ?? {}) as Prisma.InputJsonValue,
      payload: payload as Prisma.InputJsonValue,
      runId: typeof runId === 'string' ? runId : null,
      source: 'collector',
    });
    return NextResponse.json(result, { status: result.status === 'REJECTED' ? 422 : 200 });
  } catch (e) {
    if (e instanceof UnknownBrandError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error('[insights/ingest]', e);
    return NextResponse.json({ error: 'Gagal menyimpan batch' }, { status: 500 });
  }
}
