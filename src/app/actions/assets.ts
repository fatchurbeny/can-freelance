'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import type { Prisma } from '../../../generated/prisma';
import { getAccess, denyUnless, denyWrite } from '@/lib/access';
import { runInBackground } from '@/lib/background-sync';
import { normalizeCanvaViewUrl, parseCanvaUrl, publicViewUrlError } from '@/lib/canva-url';
import { resolveCanvaShortLink } from '@/lib/canva-link-resolve';
import { canvaProductionUnits, loadAssetLibrary, type AssetCategoryRow, type AssetRow } from '@/lib/asset-library';
import { getNotionClient } from '@/lib/notion-provision';
import { decrypt } from '@/lib/encryption';
import { normalizeNotionId } from '@/lib/notion-provision';
import { normalizeTags, previewNotionAssetImport, type ImportPreview } from '@/lib/notion-asset-import';
import {
  getAssetDatabase,
  pushAssetToNotion,
  pushPendingAssets,
  refreshAssetDatabaseOptions,
  syncAssetsFromNotion,
} from '@/lib/notion-assets';

export interface AssetInput {
  title: string;
  categoryId: string;
  tags: string[];
  /** Kosong = semua production Canva. */
  productionUnitIds: string[];
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
  // canva.link (tombol Copy di Canva) → link desain lengkap
  const previewUrl = normalizeCanvaViewUrl(await resolveCanvaShortLink(input.previewUrl?.trim() ?? '').catch(() => input.previewUrl?.trim() ?? ''));
  const previewError = publicViewUrlError(previewUrl);
  if (previewError) throw new Error(previewError);
  const editUrl = input.editUrl?.trim() ? await resolveCanvaShortLink(input.editUrl.trim()).catch(() => input.editUrl!.trim()) : null;
  if (editUrl && !parseCanvaUrl(editUrl)) throw new Error('Link Edit harus link desain Canva.');
  const category = await prisma.assetCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new Error('Kategori tidak ditemukan.');
  const productionUnitIds = Array.from(new Set(input.productionUnitIds ?? []));
  if (productionUnitIds.length) {
    const canva = await canvaProductionUnits(productionUnitIds);
    if (canva.length !== productionUnitIds.length) throw new Error('Aset Canva hanya bisa dipakai production berplatform Canva.');
  }
  const pages = input.pages == null || Number.isNaN(input.pages) ? null : Math.max(0, Math.round(input.pages));
  const tags = Array.from(new Set((input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 20);
  return {
    title,
    categoryId: category.id,
    tags,
    editUrl,
    previewUrl,
    coverUrl: input.coverUrl?.trim() || null,
    pages,
    notes: input.notes?.trim() || null,
    canvaDesignId: parseCanvaUrl(previewUrl)?.designId ?? null,
    productionUnitIds,
  };
}

/** Pesan ramah untuk desain Canva yang sudah dipakai aset lain (unik `canvaDesignId`). */
function saveError(error: any, fallback: string): string {
  if (error?.code === 'P2002') return 'Desain Canva ini sudah ada di Asset Library. Cari aset tersebut lalu edit, jangan ditambah ulang.';
  return error?.message || fallback;
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
    const { productionUnitIds, ...data } = await cleanInput(input);
    const asset = await prisma.asset.create({
      data: { ...data, syncStatus: 'PENDING_PUSH', productions: { create: productionUnitIds.map((productionUnitId) => ({ productionUnitId })) } },
    });
    queuePush(asset.id, asset.title);
    revalidate();
    return { success: true as const, id: asset.id };
  } catch (error: any) {
    return { success: false as const, error: saveError(error, 'Gagal menyimpan aset.') };
  }
}

export async function updateAssetAction(assetId: string, input: AssetInput) {
  const denied = await denyWrite('asset.manage');
  if (denied) return denied as never;
  try {
    const { productionUnitIds, ...data } = await cleanInput(input);
    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        ...data,
        syncStatus: 'PENDING_PUSH',
        productions: { deleteMany: {}, create: productionUnitIds.map((productionUnitId) => ({ productionUnitId })) },
      },
    });
    queuePush(asset.id, asset.title);
    revalidate();
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: saveError(error, 'Gagal menyimpan aset.') };
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

/**
 * Data library untuk picker Design Brief: aset aktif yang boleh dipakai task di `productionUnitId`
 * (production non-Canva → kosong, `canvaOnly` = false).
 */
export async function getAssetLibraryAction(productionUnitId?: string | null): Promise<
  { success: true; categories: AssetCategoryRow[]; assets: AssetRow[]; canvaOnly: boolean } | { success: false; error: string }
> {
  const denied = await denyUnless('asset.view');
  if (denied) return denied;
  const access = await getAccess();
  if (productionUnitId && access.unitIds && !access.unitIds.includes(productionUnitId)) {
    return { success: false, error: 'Anda tidak punya akses ke production ini.' };
  }
  const isCanva = productionUnitId ? (await canvaProductionUnits([productionUnitId])).length > 0 : true;
  const data = await loadAssetLibrary(access.unitIds, { forUnitId: productionUnitId ?? null });
  return { success: true, ...data, canvaOnly: isCanva };
}

/** Ubah link pendek canva.link menjadi link desain lengkap (untuk form Tambah/Edit Aset). */
export async function resolveCanvaLinkAction(url: string) {
  const denied = await denyWrite('asset.manage');
  if (denied) return denied as never;
  try {
    const resolved = await resolveCanvaShortLink(url);
    const parsed = parseCanvaUrl(resolved);
    return { success: true as const, url: parsed?.mode === 'view' ? normalizeCanvaViewUrl(resolved) : resolved };
  } catch (error: any) {
    const message = error?.name === 'TimeoutError' ? 'canva.link tidak merespons.' : error.message;
    return { success: false as const, error: message || 'Gagal membuka link canva.link.' };
  }
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

/**
 * Notion Config → Asset Library → Impor: baca database Notion lain (database terdaftar atau link)
 * dan kembalikan pratinjau baris; tidak ada yang disimpan.
 */
export async function previewNotionAssetImportAction(input: { registeredId?: string | null; link?: string | null }) {
  const denied = await denyWrite('asset.manage');
  if (denied) return denied as never;
  try {
    let id: string | null = null;
    if (input.registeredId) {
      const row = await prisma.notionDatabase.findUnique({ where: { id: input.registeredId } });
      if (!row) throw new Error('Database terdaftar tidak ditemukan.');
      id = normalizeNotionId(decrypt(row.encryptedDatabaseId, row.iv));
    } else if (input.link) {
      id = normalizeNotionId(input.link);
    }
    if (!id) throw new Error('Pilih database terdaftar atau tempel link database Notion.');
    const assetDb = await getAssetDatabase();
    const preview: ImportPreview = await previewNotionAssetImport(id, assetDb?.databaseId ?? null);
    const categories = await prisma.assetCategory.findMany({ where: { archived: false }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } });
    return { success: true as const, preview, categories };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal membaca database Notion.' };
  }
}

/**
 * Simpan baris impor: `create` = aset baru (tanpa production = semua production Canva);
 * `update` = perbarui judul & tag aset yang desainnya sudah ada, dari database sumber.
 */
export async function importNotionAssetsAction(input: {
  create: { title: string; tags: string[]; previewUrl: string; categoryId: string }[];
  update?: { assetId: string; title: string; tags: string[] }[];
}) {
  const denied = await denyWrite('asset.manage');
  if (denied) return denied as never;
  try {
    const categoryIds = new Set((await prisma.assetCategory.findMany({ select: { id: true } })).map((c) => c.id));
    const existing = new Set(
      (await prisma.asset.findMany({ where: { canvaDesignId: { not: null } }, select: { canvaDesignId: true } })).map((a) => a.canvaDesignId),
    );
    const data: Prisma.AssetCreateManyInput[] = [];
    let skipped = 0;
    for (const row of input.create ?? []) {
      const previewUrl = normalizeCanvaViewUrl(row.previewUrl?.trim() ?? '');
      const designId = parseCanvaUrl(previewUrl)?.designId ?? null;
      if (!row.title?.trim() || publicViewUrlError(previewUrl) || !categoryIds.has(row.categoryId) || !designId || existing.has(designId)) {
        skipped++;
        continue;
      }
      existing.add(designId);
      data.push({
        title: row.title.trim(),
        categoryId: row.categoryId,
        tags: normalizeTags(row.tags ?? []),
        previewUrl,
        canvaDesignId: designId,
        source: 'notion_import',
      });
    }
    // skipDuplicates + unik canvaDesignId: aman bila dua impor berjalan bersamaan
    const created = data.length ? (await prisma.asset.createMany({ data, skipDuplicates: true })).count : 0;
    skipped += data.length - created;

    let updated = 0;
    for (const row of input.update ?? []) {
      const title = row.title?.trim();
      if (!title) { skipped++; continue; }
      const res = await prisma.asset.updateMany({
        where: { id: row.assetId },
        data: { title, tags: normalizeTags(row.tags ?? []), syncStatus: 'PENDING_PUSH', lastEditedTime: new Date() },
      });
      if (res.count) updated++; else skipped++;
    }

    // Kirim ke database mirror Asset Library bertahap (50 per putaran) di background
    if (created + updated > 0) {
      runInBackground(`Push ${created + updated} aset impor ke Notion`, async () => {
        for (let round = 0; round < 40; round++) {
          if ((await pushPendingAssets(50)) === 0) break;
        }
      });
    }
    revalidate();
    return { success: true as const, created, updated, skipped };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Impor aset gagal.' };
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
