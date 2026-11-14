import { authorizeImproCall, publicBase } from '@/lib/impro-sso';
import { buildBriefPayload } from '@/lib/brief-extract';
import { can } from '@/lib/permissions';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Brief task untuk improstd (kontrak I-22). Server-ke-server: Bearer BRIEF_API_KEY + X-Acting-User.
 * Brand diisi hanya bila user pemanggil boleh melihat brand (`account.view`).
 */
export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const auth = await authorizeImproCall(request, taskId);
  if ('response' in auth) return auth.response;

  const payload = await buildBriefPayload(taskId, {
    canViewAccount: can(auth.user, 'account.view', auth.task.productionUnitId),
    appOrigin: new URL(request.url).origin,
    publicBase: publicBase(),
  });
  if (!payload) return NextResponse.json({ error: { message: 'Task tidak ditemukan.' } }, { status: 404 });
  return NextResponse.json(payload, { headers: { 'cache-control': 'no-store' } });
}
