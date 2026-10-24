import prisma from '@/lib/prisma';
import { getAssetDatabase } from '@/lib/notion-assets';
import { canvaProductionUnits } from '@/lib/asset-productions';

export { canvaProductionUnits } from '@/lib/asset-productions';

/** Baris aset untuk client (aman diserialisasi). */
export interface AssetRow {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  tags: string[];
  /** Kosong = semua production Canva. */
  productionUnitIds: string[];
  productionNames: string[];
  editUrl: string | null;
  previewUrl: string;
  coverUrl: string | null;
  pages: number | null;
  notes: string | null;
  status: 'active' | 'archived';
  notionUrl: string | null;
  syncStatus: string;
  usedCount: number;
  updatedAt: number;
}

export interface AssetCategoryRow {
  id: string;
  name: string;
  sortOrder: number;
}

export interface AssetSyncSummary {
  connected: boolean;
  databaseName: string | null;
  lastSyncedAt: number | null;
  pending: number;
  failed: number;
}

export const notionPageUrl = (pageId: string | null) => (pageId ? `https://www.notion.so/${pageId.replace(/-/g, '')}` : null);

/**
 * Kategori + aset yang boleh dilihat. Aset tanpa production = semua production Canva.
 * `unitIds` null = semua production (admin); selain itu hanya aset untuk production Canva yang bisa diakses.
 * `forUnitId` (picker brief) = aset yang boleh dipakai task di production itu; production non-Canva → kosong.
 */
export async function loadAssetLibrary(
  unitIds: string[] | null,
  opts: { includeArchived?: boolean; forUnitId?: string | null } = {},
): Promise<{ categories: AssetCategoryRow[]; assets: AssetRow[] }> {
  let scopeIds: string[] | null = null;
  if (opts.forUnitId) scopeIds = (await canvaProductionUnits([opts.forUnitId])).map((u) => u.id);
  else if (unitIds) scopeIds = (await canvaProductionUnits(unitIds)).map((u) => u.id);
  const visible = scopeIds === null
    ? {}
    : { OR: [{ productions: { none: {} } }, { productions: { some: { productionUnitId: { in: scopeIds } } } }] };
  const [categories, assets] = await Promise.all([
    prisma.assetCategory.findMany({ where: { archived: false }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    scopeIds !== null && scopeIds.length === 0
      ? Promise.resolve([])
      : prisma.asset.findMany({
          where: { ...(opts.includeArchived ? {} : { status: 'active' }), ...visible },
          include: {
            category: true,
            productions: { include: { productionUnit: { select: { name: true } } } },
            _count: { select: { taskLinks: true } },
          },
          orderBy: { updatedAt: 'desc' },
        }),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder })),
    assets: assets.map((a) => ({
      id: a.id,
      title: a.title,
      categoryId: a.categoryId,
      categoryName: a.category.name,
      tags: a.tags,
      productionUnitIds: a.productions.map((p) => p.productionUnitId),
      productionNames: a.productions.map((p) => p.productionUnit.name),
      editUrl: a.editUrl,
      previewUrl: a.previewUrl,
      coverUrl: a.coverUrl,
      pages: a.pages,
      notes: a.notes,
      status: a.status === 'archived' ? 'archived' : 'active',
      notionUrl: notionPageUrl(a.notionPageId),
      syncStatus: a.syncStatus,
      usedCount: a._count.taskLinks,
      updatedAt: a.updatedAt.getTime(),
    })),
  };
}

/** Status sinkron Notion untuk header /assets. */
export async function loadAssetSyncSummary(): Promise<AssetSyncSummary> {
  const [db, last, pending, failed] = await Promise.all([
    getAssetDatabase(),
    prisma.asset.aggregate({ _max: { lastSyncedAt: true } }),
    prisma.asset.count({ where: { syncStatus: 'PENDING_PUSH' } }),
    prisma.asset.count({ where: { syncStatus: 'ERROR' } }),
  ]);
  return {
    connected: !!db,
    databaseName: db?.name ?? null,
    lastSyncedAt: last._max.lastSyncedAt ? last._max.lastSyncedAt.getTime() : null,
    pending,
    failed,
  };
}
