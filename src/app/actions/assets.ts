'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getAccess, denyUnless, denyWrite } from '@/lib/access';
import { runInBackground } from '@/lib/background-sync';
import { parseCanvaUrl, publicViewUrlError } from '@/lib/canva-url';
import { loadAssetLibrary, type AssetCategoryRow, type AssetRow } from '@/lib/asset-library';
import { getNotionClient } from '@/lib/notion-provision';
import {
  pushAssetToNotion,
  pushPendingAssets,
  refreshAssetDatabaseOptions,
  syncAssetsFromNotion,
} from '@/lib/notion-assets';

export interface AssetInput {
  title: string;
  categoryId: string;
  tags: string[];
  productionUnitId: string | null;
  editUrl: string | null;
  previewUrl: string;
  coverUrl: string | null;
  pages: number | null;
  notes: string | null;
}

function revalidate() {
  try {
    revalidatePath('/assets');
  } catch {}
}

/** Validasi + normalisasi input form aset. */
async function cleanInput(input: AssetInput) {
  const title = input.title?.trim();
  if (!title) throw new Error('Judul wajib diisi.');
  const previewUrl = input.previewUrl?.trim() ?? '';
  const previewError = publicViewUrlError(previewUrl);
  if (previewError) throw new Error(previewError);
  const editUrl = input.editUrl?.trim() || null;
  if (editUrl && !parseCanvaUrl(editUrl)) throw new Error('Link Edit harus link desain Canva.');
  const category = await prisma.assetCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new Error('Kategori tidak ditemukan.');
  if (input.productionUnitId) {
    const unit = await prisma.productionUnit.findUnique({ where: { id: input.productionUnitId } });
    if (!unit) throw new Error('Production tidak ditemukan.');
  }
  const pages = input.pages == null || Number.isNaN(input.pages) ? null : Math.max(0, Math.round(input.pages));
  const tags = Array.from(new Set((input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 20);
  return {
    title,
    categoryId: category.id,
    tags,
    productionUnitId: input.productionUnitId || null,
    editUrl,
    previewUrl,
    coverUrl: input.coverUrl?.trim() || null,
    pages,
    notes: input.notes?.trim() || null,
    canvaDesignId: parseCanvaUrl(previewUrl)?.designId ?? null,
  };
}

function queuePush(assetId: string, label: string) {
  runInBackground(`Push aset ${label} ke Notion`, async () => {
    await pushAssetToNotion(assetId);
  });
}

export async function createAssetAction(input: AssetInput) {
  const denied = await denyWrite('asset.manage');
  if (denied) return denied as never;
  try {
    const data = await cleanInput(input);
    const asset = await prisma.asset.create({ data: { ...data, syncStatus: 'PENDING_PUSH' } });
    queuePush(asset.id, asset.title);
    revalidate();
    return { success: true as const, id: asset.id };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal menyimpan aset.' };
  }
}

export async function updateAssetAction(assetId: string, input: AssetInput) {
  const denied = await denyWrite('asset.manage');
  if (denied) return denied as never;
  try {
    const data = await cleanInput(input);
    const asset = await prisma.asset.update({ where: { id: assetId }, data: { ...data, syncStatus: 'PENDING_PUSH' } });
    queuePush(asset.id, asset.title);
    revalidate();
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal menyimpan aset.' };
  }
}

/** Arsipkan / pulihkan aset (status ikut ke Notion). */
export async function setAssetStatusAction(assetId: string, status: 'active' | 'archived') {
  const denied = await denyWrite('asset.manage');
  if (denied) return denied as never;
  try {
    const asset = await prisma.asset.update({ where: { id: assetId }, data: { status, syncStatus: 'PENDING_PUSH' } });
    queuePush(asset.id, asset.title);
    revalidate();
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal mengubah status aset.' };
  }
}

export async function createAssetCategoryAction(name: string) {
  const denied = await denyWrite('asset.manage');
  if (denied) return denied as never;
  try {
    const clean = name?.trim();
    if (!clean) throw new Error('Nama kategori wajib diisi.');
    const existing = await prisma.assetCategory.findFirst({ where: { name: { equals: clean, mode: 'insensitive' } } });
    if (existing) {
      if (existing.archived) await prisma.assetCategory.update({ where: { id: existing.id }, data: { archived: false } });
      revalidate();
      return { success: true as const, id: existing.id };
    }
    const last = await prisma.assetCategory.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.assetCategory.create({ data: { name: clean, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    runInBackground('Opsi kategori Asset Library', refreshAssetDatabaseOptions);
    revalidate();
    return { success: true as const, id: category.id };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal menambah kategori.' };
  }
}

/** Data library untuk picker Design Brief (aset aktif yang boleh dilihat). */
export async function getAssetLibraryAction(): Promise<
  { success: true; categories: AssetCategoryRow[]; assets: AssetRow[] } | { success: false; error: string }
> {
  const denied = await denyUnless('asset.view');
  if (denied) return denied;
  const access = await getAccess();
  const data = await loadAssetLibrary(access.unitIds);
  return { success: true, ...data };
}

/**
 * Info desain dari oEmbed Canva (judul) untuk mengisi form. Hanya butuh public view link, tanpa login.
 * Thumbnail tidak diunduh di sini: server ditolak proteksi bot Canva, jadi cover default dimuat browser.
 */
export async function fetchCanvaInfoAction(previewUrl: string) {
  const denied = await denyWrite('asset.manage');
  if (denied) return denied as never;
  try {
    const previewError = publicViewUrlError(previewUrl);
    if (previewError) throw new Error(previewError);
    const endpoint = `https://www.canva.com/_oembed?format=json&url=${encodeURIComponent(previewUrl.trim())}`;
    const res = await fetch(endpoint, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CAN-Freelance/1.0)', Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`Canva menolak permintaan (HTTP ${res.status}).`);
    const data = await res.json();
    return { success: true as const, title: typeof data.title === 'string' ? data.title.trim() : null };
  } catch (error: any) {
    const message = error?.name === 'TimeoutError' ? 'Canva tidak merespons.' : error.message;
    return { success: false as const, error: message || 'Gagal membaca info desain Canva.' };
  }
}

/** Tombol Sync di /assets: kirim aset yang tertunda lalu tarik ulang seluruh database aset dari Notion. */
export async function syncAssetsNowAction() {
  const denied = await denyWrite('asset.manage');
  if (denied) return denied as never;
  try {
    const pushed = await pushPendingAssets();
    const client = await getNotionClient();
    const pulled = await syncAssetsFromNotion(client, 'full');
    revalidate();
    return { success: true as const, pushed, pulled };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Sync Asset Library gagal.' };
  }
}

/** Info aset untuk kartu "Assets" di preview brief (cover, kategori) berdasarkan link di brief. */
export async function getAssetsByUrlsAction(urls: string[]) {
  const denied = await denyUnless('asset.view', 'kanban.view');
  if (denied) return denied;
  const designIds = urls.map((u) => parseCanvaUrl(u)?.designId).filter((id): id is string => !!id);
  if (designIds.length === 0) return { success: true as const, assets: [] };
  const rows = await prisma.asset.findMany({
    where: { OR: [{ canvaDesignId: { in: designIds } }, { previewUrl: { in: urls } }] },
    include: { category: { select: { name: true } } },
  });
  return {
    success: true as const,
    assets: rows.map((a) => ({
      designId: a.canvaDesignId ?? parseCanvaUrl(a.previewUrl)?.designId ?? null,
      title: a.title,
      categoryName: a.category.name,
      coverUrl: a.coverUrl,
      previewUrl: a.previewUrl,
      editUrl: a.editUrl,
      status: a.status,
    })),
  };
}
