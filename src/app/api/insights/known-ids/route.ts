import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeCollector } from '@/lib/canva-insights/api-auth';

/** Template ID yang sudah dikenal untuk satu brand, agar template sepi tetap diambil hariannya (spek §5.2). */
export async function GET(request: Request) {
  const denied = authorizeCollector(request);
  if (denied) return denied;

  const brandId = new URL(request.url).searchParams.get('brandId');
  if (!brandId) return NextResponse.json({ error: 'brandId wajib diisi' }, { status: 400 });

  const templates = await prisma.canvaTemplate.findMany({
    where: { canvaBrandId: brandId },
    select: { id: true, title: true },
    orderBy: { id: 'asc' },
  });
  return NextResponse.json({
    ids: templates.map((t) => t.id),
    // Collector cukup meminta metadata untuk ID yang judulnya belum ada.
    missingMetadata: templates.filter((t) => !t.title).map((t) => t.id),
  });
}
