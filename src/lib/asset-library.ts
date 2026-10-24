import prisma from '@/lib/prisma';
import { getAssetDatabase } from '@/lib/notion-assets';

/** Baris aset untuk client (aman diserialisasi). */
export interface AssetRow {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  tags: string[];
  productionUnitId: string | null;
  productionName: string | null;
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
 * Kategori + aset yang boleh dilihat (aset "semua production" atau production yang bisa diakses).
 * `unitIds` null = semua production.
 */
export async function loadAssetLibrary(
  unitIds: string[] | null,
  opts: { includeArchived?: boolean } = {},
): Promise<{ categories: AssetCategoryRow[]; assets: AssetRow[] }> {
  const [categories, assets] = await Promise.all([
    prisma.assetCategory.findMany({ where: { archived: false }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.asset.findMany({
      where: {
        ...(opts.includeArchived ? {} : { status: 'active' }),
        ...(unitIds ? { OR: [{ productionUnitId: null }, { productionUnitId: { in: unitIds } }] } : {}),
      },
      include: { category: true, productionUnit: { select: { name: true } }, _count: { select: { taskLinks: true } } },
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
      productionUnitId: a.productionUnitId,
      productionName: a.productionUnit?.name ?? null,
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
