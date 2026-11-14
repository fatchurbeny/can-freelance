import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError, authorizeImproCall, isImproTarget } from '@/lib/impro-sso';

export const dynamic = 'force-dynamic';

/**
 * Write-back desain hasil Deck/Doc ke task (kontrak I-22) → tabel task_design_outputs.
 * Bukan task_canva_links: tabel itu ditimpa sync Notion.
 */
export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const auth = await authorizeImproCall(request, taskId);
  if ('response' in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(400, 'Body harus JSON.');
  }
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!/^https:\/\/\S+$/i.test(url) || url.length > 2000) return apiError(400, 'url harus tautan https.');
  if (!isImproTarget(body.source)) return apiError(400, 'source harus "deck" atau "doc".');
  const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

  await prisma.taskDesignOutput.upsert({
    where: { taskId_url: { taskId, url } },
    create: {
      taskId,
      url,
      source: body.source,
      improProjectId: str(body.improProjectId, 200),
      title: str(body.title, 300),
      createdByCode: auth.user.userCode,
    },
    update: { source: body.source, improProjectId: str(body.improProjectId, 200), title: str(body.title, 300) },
  });
  return NextResponse.json({ ok: true });
}
