'use server';

import prisma from '@/lib/prisma';
import { denyUnless, getAccess } from '@/lib/access';
import { loadAssetUsage } from '@/lib/asset-report';

/** Drawer Asset Report: task (template) yang memakai satu aset beserta statusnya. */
export async function getAssetUsageAction(assetId: string, filters: { productionUnitId: string | null; days: number | null }) {
  const denied = await denyUnless('asset.manage');
  if (denied) return denied;
  try {
    const access = await getAccess();
    const usage = await loadAssetUsage(assetId, { ...filters, unitIds: access.unitIds });
    if (!usage) return { success: false as const, error: 'Aset tidak ditemukan.' };
    return { success: true as const, usage };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal memuat pemakaian aset.' };
  }
}

/** Sub-menu sidebar Asset Report: kategori aktif + jumlah aset aktif. */
export async function listAssetCategoriesNavAction() {
  const denied = await denyUnless('asset.manage');
  if (denied) return [];
  const categories = await prisma.assetCategory.findMany({
    where: { archived: false },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, _count: { select: { assets: { where: { status: 'active' } } } } },
  });
  return categories.map((c) => ({ id: c.id, name: c.name, count: c._count.assets }));
}
