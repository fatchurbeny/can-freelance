import prisma from '@/lib/prisma';

/** Platform yang boleh memakai Asset Library (aset Canva hanya untuk production Canva). */
export const ASSET_PLATFORM_OUTPUT = 'canva_link';

/** Production aktif berplatform Canva; `unitIds` null = semua production. */
export async function canvaProductionUnits(unitIds: string[] | null = null): Promise<{ id: string; name: string }[]> {
  return prisma.productionUnit.findMany({
    where: { isActive: true, platform: { outputType: ASSET_PLATFORM_OUTPUT }, ...(unitIds ? { id: { in: unitIds } } : {}) },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
}
