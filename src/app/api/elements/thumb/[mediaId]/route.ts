import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { fetchElementThumb, MEDIA_ID_RE } from '@/lib/impro-elements';

export const dynamic = 'force-dynamic';

/** Proksi thumbnail elemen improstd untuk picker 🧩 Elemen; kunci ELEMENTS_API_KEY tetap di server. */
export async function GET(request: Request, context: { params: Promise<{ mediaId: string }> }) {
  const denied = await authorizeApi(['task.edit', 'task.edit.own'], { request });
  if (denied) return denied;
  const { mediaId } = await context.params;
  if (!MEDIA_ID_RE.test(mediaId)) return new NextResponse('Not found', { status: 404 });
  const thumb = await fetchElementThumb(mediaId);
  if (!thumb) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(thumb.body, {
    headers: {
      'content-type': thumb.type,
      'cache-control': 'private, max-age=86400',
      'x-content-type-options': 'nosniff',
    },
  });
}
