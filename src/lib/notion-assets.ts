/**
 * Asset Library ⇄ Notion (opsi B: app = sumber input utama, database Notion "Asset Library" = mirror dua arah).
 * - App → Notion: pushAssetToNotion (per aset, diserialkan) + blok embed Canva di body page.
 * - Notion → App: syncAssetsFromNotion (ikut syncNotionData, filter last_edited_time).
 * - Task ↔ aset: syncTaskAssetLinks dari section "📦 Assets" brief + relation "Assets" di database task.
 */

import type { Client } from '@notionhq/client';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import {
  createDatabaseWithProperties,
  ensureProperties,
  ensureRelationProperty,
  getNotionClient,
  resolveDataSourceId,
  retrieveSchema,
  type RelationState,
} from '@/lib/notion-provision';
import { registerNotionDatabase } from '@/lib/notion-registry';
import { ASSETS_RELATION_PROPERTY } from '@/lib/notion-field-types';
import { parseCanvaUrl, isPublicViewUrl } from '@/lib/canva-url';
import { parseAssetSection } from '@/lib/asset-brief';
import { canvaProductionUnits } from '@/lib/asset-productions';

export const ASSET_DB_PURPOSE = 'asset_library';
export const ASSET_DB_TITLE = 'Asset Library';
/** Nilai lama properti Production (select) untuk "semua production"; kini = multi-select kosong. */
export const ALL_PRODUCTIONS_LABEL = 'Semua';

/** Nama properti database Notion Asset Library. */
export const ASSET_PROPS = {
  title: 'Name',
  category: 'Kategori',
  tags: 'Tag',
  production: 'Production',
  editUrl: 'Edit URL',
  previewUrl: 'Public View URL',
  pages: 'Halaman',
  notes: 'Catatan',
  status: 'Status',
} as const;

const STATUS_ACTIVE = 'Aktif';
const STATUS_ARCHIVED = 'Arsip';

/** Pemetaan field app → properti Notion (untuk tabel read-only di Notion Config). */
export const ASSET_PROPERTY_MAP: { field: string; property: string; type: string }[] = [
  { field: 'Judul', property: ASSET_PROPS.title, type: 'title' },
  { field: 'Kategori', property: ASSET_PROPS.category, type: 'select' },
  { field: 'Tag', property: ASSET_PROPS.tags, type: 'multi-select' },
  { field: 'Production', property: ASSET_PROPS.production, type: 'multi-select (kosong = semua Canva)' },
  { field: 'Link Edit', property: ASSET_PROPS.editUrl, type: 'url' },
  { field: 'Public View', property: ASSET_PROPS.previewUrl, type: 'url' },
  { field: 'Jumlah Halaman', property: ASSET_PROPS.pages, type: 'number' },
  { field: 'Catatan', property: ASSET_PROPS.notes, type: 'rich text' },
  { field: 'Status', property: ASSET_PROPS.status, type: 'select (Aktif / Arsip)' },
];

/** Nama opsi select Notion tidak boleh berisi koma. */
const optionName = (name: string) => name.replace(/,/g, ' ').trim().slice(0, 100);

async function assetPropertySchema(): Promise<Record<string, any>> {
  const [categories, units] = await Promise.all([
    prisma.assetCategory.findMany({ where: { archived: false }, orderBy: { sortOrder: 'asc' } }),
    canvaProductionUnits(),
  ]);
  return {
    [ASSET_PROPS.title]: { title: {} },
    [ASSET_PROPS.category]: { select: { options: categories.map((c) => ({ name: optionName(c.name) })) } },
    [ASSET_PROPS.tags]: { multi_select: { options: [] } },
    [ASSET_PROPS.production]: {
      multi_select: { options: units.map((u) => ({ name: optionName(u.name) })) },
    },
    [ASSET_PROPS.editUrl]: { url: {} },
    [ASSET_PROPS.previewUrl]: { url: {} },
    [ASSET_PROPS.pages]: { number: { format: 'number' } },
    [ASSET_PROPS.notes]: { rich_text: {} },
    [ASSET_PROPS.status]: { select: { options: [{ name: STATUS_ACTIVE, color: 'green' }, { name: STATUS_ARCHIVED, color: 'gray' }] } },
  };
}

export interface AssetDatabaseInfo {
  rowId: string;
  name: string;
  databaseId: string;
  parentPageId: string | null;
}

/** Database Notion yang ditandai sebagai Asset Library; null bila belum dihubungkan. */
export async function getAssetDatabase(): Promise<AssetDatabaseInfo | null> {
  const row = await prisma.notionDatabase.findFirst({ where: { purpose: ASSET_DB_PURPOSE, archived: false } });
  if (!row) return null;
  try {
    const databaseId = decrypt(row.encryptedDatabaseId, row.iv);
    if (!databaseId) return null;
    return { rowId: row.id, name: row.name, databaseId, parentPageId: row.parentPageId };
  } catch {
    return null;
  }
}

/** Tandai satu database sebagai Asset Library (yang lain dilepas dari kegunaan itu). */
async function markAsAssetDatabase(name: string, databaseId: string, parentPageId?: string | null) {
  await prisma.notionDatabase.updateMany({ where: { purpose: ASSET_DB_PURPOSE }, data: { purpose: null } });
  await registerNotionDatabase(name, databaseId, parentPageId ?? null, ASSET_DB_PURPOSE);
}

/** Buat database Asset Library baru di page induk, lalu tandai & kirim semua aset. */
export async function createAssetDatabase(parentPageId: string): Promise<string> {
  const databaseId = await createDatabaseWithProperties(parentPageId, ASSET_DB_TITLE, await assetPropertySchema());
  await markAsAssetDatabase(ASSET_DB_TITLE, databaseId, parentPageId);
  await prisma.asset.updateMany({ data: { notionPageId: null, syncStatus: 'PENDING_PUSH' } });
  return databaseId;
}

/** Pakai database yang sudah ada: tambah properti yang kurang, lalu tandai. Aset yang sudah ada di sana ikut ditarik saat sync. */
export async function linkExistingAssetDatabase(databaseId: string, name: string, parentPageId?: string | null): Promise<string[]> {
  const added = await ensureProperties(databaseId, await assetPropertySchema());
  await markAsAssetDatabase(name, databaseId, parentPageId);
  return added;
}

/** Tambah opsi select baru (kategori/production) ke database aset. Best-effort. */
export async function refreshAssetDatabaseOptions(): Promise<void> {
  const db = await getAssetDatabase();
  if (!db) return;
  try {
    await ensureProperties(db.databaseId, await assetPropertySchema());
  } catch (err: any) {
    console.warn('Gagal memperbarui opsi database Asset Library:', err?.message || err);
  }
}

/**
 * Production dibuat / diganti nama / dipulihkan: tambahkan namanya ke opsi Production di Notion, dan
 * (rename) kirim ulang aset production itu agar nama di Notion ikut berubah. Pull mencocokkan production
 * lewat nama, jadi nama lama yang tertinggal di Notion membuat aset kehilangan production-nya.
 * Best-effort, jalankan di background.
 */
export async function syncAssetProductionsAfterUnitChange(opts: { renamedUnitId?: string } = {}): Promise<void> {
  if (!(await getAssetDatabase())) return;
  await refreshAssetDatabaseOptions();
  if (!opts.renamedUnitId) return;
  const affected = await prisma.asset.findMany({
    where: { productions: { some: { productionUnitId: opts.renamedUnitId } } },
    select: { id: true },
  });
  if (affected.length === 0) return;
  await prisma.asset.updateMany({ where: { id: { in: affected.map((a) => a.id) } }, data: { syncStatus: 'PENDING_PUSH' } });
  for (const { id } of affected) await pushAssetToNotion(id);
}

/**
 * Pastikan database task punya relation "Assets" ke database aset. Best-effort (dipanggil saat
 * database task production dibuat/diganti). Tanpa database aset → 'no_asset_db'.
 */
export async function ensureAssetsRelationForTaskDb(taskDbId: string, opts: { create?: boolean } = {}): Promise<RelationState | 'missing' | 'no_asset_db' | 'error'> {
  try {
    const db = await getAssetDatabase();
    if (!db || !taskDbId) return 'no_asset_db';
    return await ensureRelationProperty(taskDbId, ASSETS_RELATION_PROPERTY, db.databaseId, opts);
  } catch (err: any) {
    console.warn(`Gagal memastikan relation "${ASSETS_RELATION_PROPERTY}" di database ${taskDbId}:`, err?.message || err);
    return 'error';
  }
}

type AssetWithRefs = NonNullable<Awaited<ReturnType<typeof loadAsset>>>;

function loadAsset(assetId: string) {
  return prisma.asset.findUnique({
    where: { id: assetId },
    include: { category: true, productions: { include: { productionUnit: { select: { name: true } } } } },
  });
}

function assetToNotionProperties(asset: AssetWithRefs): Record<string, any> {
  return {
    [ASSET_PROPS.title]: { title: [{ type: 'text', text: { content: asset.title.slice(0, 2000) } }] },
    [ASSET_PROPS.category]: { select: { name: optionName(asset.category.name) } },
    [ASSET_PROPS.tags]: { multi_select: asset.tags.map(optionName).filter(Boolean).map((name) => ({ name })) },
    [ASSET_PROPS.production]: { multi_select: asset.productions.map((p) => ({ name: optionName(p.productionUnit.name) })) },
    [ASSET_PROPS.editUrl]: { url: asset.editUrl || null },
    [ASSET_PROPS.previewUrl]: { url: asset.previewUrl || null },
    [ASSET_PROPS.pages]: { number: asset.pages ?? null },
    [ASSET_PROPS.notes]: { rich_text: asset.notes ? [{ type: 'text', text: { content: asset.notes.slice(0, 2000) } }] : [] },
    [ASSET_PROPS.status]: { select: { name: asset.status === 'archived' ? STATUS_ARCHIVED : STATUS_ACTIVE } },
  };
}

/** Body page aset: satu blok embed public view link. Embed Canva lain diganti bila link berubah. */
async function ensureEmbedBlock(client: Client, pageId: string, previewUrl: string) {
  if (!isPublicViewUrl(previewUrl)) return;
  const res: any = await client.blocks.children.list({ block_id: pageId, page_size: 100 });
  const canvaEmbeds = (res.results as any[]).filter((b) => b.type === 'embed' && /canva\.com\/design\//i.test(b.embed?.url || ''));
  if (canvaEmbeds.some((b) => b.embed.url === previewUrl)) return;
  for (const block of canvaEmbeds) await client.blocks.delete({ block_id: block.id });
  await client.blocks.children.append({
    block_id: pageId,
    children: [{ object: 'block', type: 'embed', embed: { url: previewUrl } }] as any,
  });
}

const pushChains = new Map<string, Promise<unknown>>();

/**
 * Kirim satu aset ke Notion (buat atau perbarui page). Diserialkan per aset agar dua simpan beruntun
 * tidak membuat dua page. Tanpa database aset: aset tetap PENDING_PUSH sampai database dihubungkan.
 */
export function pushAssetToNotion(assetId: string): Promise<{ pushed: boolean; reason?: string }> {
  const prev = pushChains.get(assetId) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => pushAssetOnce(assetId));
  pushChains.set(assetId, next);
  next.finally(() => { if (pushChains.get(assetId) === next) pushChains.delete(assetId); }).catch(() => {});
  return next;
}

async function pushAssetOnce(assetId: string): Promise<{ pushed: boolean; reason?: string }> {
  const db = await getAssetDatabase();
  if (!db) return { pushed: false, reason: 'no_database' };
  const asset = await loadAsset(assetId);
  if (!asset) return { pushed: false, reason: 'not_found' };

  try {
    const client = await getNotionClient();
    let schema = await retrieveSchema(client, db.databaseId);
    // Database lama: Production masih select (satu production) → ubah ke multi-select
    if (schema[ASSET_PROPS.production] && schema[ASSET_PROPS.production].type !== 'multi_select') {
      await (client as any).dataSources.update({
        data_source_id: await resolveDataSourceId(client, db.databaseId),
        properties: { [ASSET_PROPS.production]: (await assetPropertySchema())[ASSET_PROPS.production] },
      });
      schema = await retrieveSchema(client, db.databaseId);
    }
    const all = assetToNotionProperties(asset);
    const properties = Object.fromEntries(Object.entries(all).filter(([name]) => schema[name]));

    let page: any = null;
    if (asset.notionPageId) {
      try {
        page = await client.pages.update({ page_id: asset.notionPageId, properties, in_trash: false } as any);
      } catch (err: any) {
        // Page dihapus permanen di Notion: buat ulang
        if (err?.code !== 'object_not_found') throw err;
      }
    }
    if (!page) {
      page = await client.pages.create({
        parent: { database_id: db.databaseId },
        properties,
        children: isPublicViewUrl(asset.previewUrl)
          ? [{ object: 'block', type: 'embed', embed: { url: asset.previewUrl } }]
          : [],
      } as any);
    } else {
      await ensureEmbedBlock(client, page.id, asset.previewUrl);
    }

    // Jangan tandai SYNCED bila aset diubah lagi selama push (push berikutnya sudah antre)
    const done = await prisma.asset.updateMany({
      where: { id: asset.id, updatedAt: asset.updatedAt },
      data: { notionPageId: page.id, syncStatus: 'SYNCED', lastSyncedAt: new Date(), lastEditedTime: new Date(page.last_edited_time) },
    });
    if (done.count === 0 && !asset.notionPageId) {
      await prisma.asset.update({ where: { id: asset.id }, data: { notionPageId: page.id } });
    }
    return { pushed: true };
  } catch (err: any) {
    console.warn(`Gagal push aset "${asset.title}" ke Notion:`, err?.message || err);
    await prisma.asset.updateMany({ where: { id: asset.id }, data: { syncStatus: 'ERROR' } });
    return { pushed: false, reason: err?.message || 'error' };
  }
}

/** Kirim ulang aset yang belum/gagal terkirim (dipanggil di awal sync). */
export async function pushPendingAssets(limit = 50): Promise<number> {
  if (!(await getAssetDatabase())) return 0;
  const pending = await prisma.asset.findMany({
    where: { syncStatus: { in: ['PENDING_PUSH', 'ERROR'] } },
    select: { id: true },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });
  let pushed = 0;
  for (const { id } of pending) {
    if ((await pushAssetToNotion(id)).pushed) pushed++;
  }
  return pushed;
}

const plain = (rich: any[] | undefined) => (rich ?? []).map((t: any) => t.plain_text).join('');

/**
 * Tarik perubahan dari database Notion Asset Library. Aset yang masih menunggu push (perubahan lokal)
 * tidak ditimpa. Mode full: aset yang page-nya hilang dari Notion diarsipkan.
 */
export async function syncAssetsFromNotion(client: Client, mode: 'incremental' | 'full', since?: string): Promise<number> {
  const db = await getAssetDatabase();
  if (!db) return 0;
  const dataSourceId = await resolveDataSourceId(client, db.databaseId);

  const categories = await prisma.assetCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const units = await canvaProductionUnits();
  const unitByName = new Map(units.map((u) => [u.name.toLowerCase(), u.id]));

  const categoryIdFor = async (name: string | undefined, fallback?: string) => {
    const key = name?.trim().toLowerCase();
    if (key && categoryByName.has(key)) return categoryByName.get(key)!;
    if (key) {
      const created = await prisma.assetCategory.create({ data: { name: name!.trim(), sortOrder: categories.length + categoryByName.size } });
      categoryByName.set(key, created.id);
      return created.id;
    }
    if (fallback) return fallback;
    const first = categoryByName.values().next().value as string | undefined;
    if (first) return first;
    const created = await prisma.assetCategory.create({ data: { name: 'Lainnya' } });
    categoryByName.set('lainnya', created.id);
    return created.id;
  };

  const seen: string[] = [];
  let synced = 0;
  let cursor: string | undefined;
  do {
    const query: any = { data_source_id: dataSourceId, start_cursor: cursor, page_size: 100 };
    if (mode === 'incremental' && since) {
      query.filter = { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } };
    }
    const res: any = await (client as any).dataSources.query(query);
    for (const page of res.results as any[]) {
      seen.push(page.id);
      const props = page.properties ?? {};
      const existing = await prisma.asset.findUnique({ where: { notionPageId: page.id } });
      if (existing && existing.syncStatus !== 'SYNCED') continue; // perubahan lokal menang sampai terkirim
      const editedAt = new Date(page.last_edited_time);
      if (existing && editedAt.getTime() <= existing.lastEditedTime.getTime()) continue;

      const previewUrl: string = props[ASSET_PROPS.previewUrl]?.url || '';
      const editUrl: string | null = props[ASSET_PROPS.editUrl]?.url || null;
      const productionProp = props[ASSET_PROPS.production];
      const productionNames: string[] = productionProp?.multi_select
        ? productionProp.multi_select.map((o: any) => o.name)
        : productionProp?.select?.name ? [productionProp.select.name] : [];
      const productionUnitIds = Array.from(new Set(
        productionNames.filter((n) => n !== ALL_PRODUCTIONS_LABEL).map((n) => unitByName.get(n.toLowerCase())).filter((id): id is string => !!id),
      ));
      const pages = props[ASSET_PROPS.pages]?.number;
      const data = {
        title: plain(props[ASSET_PROPS.title]?.title) || 'Tanpa judul',
        categoryId: await categoryIdFor(props[ASSET_PROPS.category]?.select?.name, existing?.categoryId),
        tags: (props[ASSET_PROPS.tags]?.multi_select ?? []).map((o: any) => o.name),
        editUrl,
        previewUrl,
        pages: typeof pages === 'number' ? Math.round(pages) : null,
        notes: plain(props[ASSET_PROPS.notes]?.rich_text) || null,
        status: props[ASSET_PROPS.status]?.select?.name === STATUS_ARCHIVED ? 'archived' : 'active',
        canvaDesignId: parseCanvaUrl(previewUrl)?.designId ?? parseCanvaUrl(editUrl)?.designId ?? null,
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(),
        lastEditedTime: editedAt,
      };
      const productions = productionUnitIds.map((productionUnitId) => ({ productionUnitId }));
      try {
        if (existing) await prisma.asset.update({ where: { id: existing.id }, data: { ...data, productions: { deleteMany: {}, create: productions } } });
        else await prisma.asset.create({ data: { ...data, notionPageId: page.id, productions: { create: productions } } });
      } catch (err: any) {
        // Desain yang sama sudah dipakai aset lain (mis. page Notion diduplikasi): lewati, jangan gagalkan seluruh sync
        if (err?.code === 'P2002') { console.warn(`Asset Library: page ${page.id} dilewati, desain Canva sudah dipakai aset lain.`); continue; }
        throw err;
      }
      synced++;
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  if (mode === 'full') {
    await prisma.asset.updateMany({
      where: { notionPageId: { not: null, notIn: seen }, status: 'active', syncStatus: 'SYNCED' },
      data: { status: 'archived' },
    });
  }
  return synced;
}

export interface ResolvedBriefAsset {
  assetId: string;
  notionPageId: string | null;
  pages: string | null;
}

/** Cocokkan baris section Assets di brief dengan aset library (berdasarkan ID desain Canva / URL). */
export async function resolveBriefAssets(bodyText: string | null | undefined): Promise<ResolvedBriefAsset[]> {
  const refs = parseAssetSection(bodyText);
  if (refs.length === 0) return [];
  const designIds = refs.map((r) => parseCanvaUrl(r.url)?.designId).filter((id): id is string => !!id);
  const assets = await prisma.asset.findMany({
    where: { OR: [{ canvaDesignId: { in: designIds } }, { previewUrl: { in: refs.map((r) => r.url) } }] },
    select: { id: true, notionPageId: true, canvaDesignId: true, previewUrl: true },
  });
  const out = new Map<string, ResolvedBriefAsset>();
  for (const ref of refs) {
    const designId = parseCanvaUrl(ref.url)?.designId;
    const asset = assets.find((a) => a.previewUrl === ref.url) ?? assets.find((a) => designId && a.canvaDesignId === designId);
    if (asset && !out.has(asset.id)) out.set(asset.id, { assetId: asset.id, notionPageId: asset.notionPageId, pages: ref.pages });
  }
  return [...out.values()];
}

/**
 * Ganti daftar aset task: dari section Assets brief (dengan halaman), ditambah aset dari relation Notion
 * yang tidak ada di brief. Mengembalikan ID page Notion aset dari brief (untuk ditulis ke relation).
 */
export async function syncTaskAssetLinks(
  taskId: string,
  bodyText: string | null | undefined,
  relationPageIds: string[] = [],
): Promise<string[]> {
  const fromBody = await resolveBriefAssets(bodyText);
  const known = new Set(fromBody.map((a) => a.assetId));
  const compact = (id: string) => id.replace(/-/g, '').toLowerCase();
  const relationIds = relationPageIds.map(compact);
  const fromRelation = relationIds.length
    ? (await prisma.asset.findMany({ where: { notionPageId: { not: null } }, select: { id: true, notionPageId: true } }))
        .filter((a) => !known.has(a.id) && relationIds.includes(compact(a.notionPageId!)))
    : [];

  // Diff, bukan hapus-semua: `createdAt` = tanggal aset pertama dipakai di brief (dipakai Asset Report)
  const wanted = new Map<string, string | null>();
  fromBody.forEach((a) => wanted.set(a.assetId, a.pages));
  fromRelation.forEach((a) => { if (!wanted.has(a.id)) wanted.set(a.id, null); });
  const existing = await prisma.taskAsset.findMany({ where: { taskId }, select: { assetId: true, pages: true } });
  const existingPages = new Map(existing.map((row) => [row.assetId, row.pages]));
  const pageUpdates = [...wanted].filter(([assetId, pages]) => existingPages.has(assetId) && existingPages.get(assetId) !== pages);

  await prisma.$transaction([
    prisma.taskAsset.deleteMany({ where: { taskId, assetId: { notIn: [...wanted.keys()] } } }),
    prisma.taskAsset.createMany({
      data: [...wanted].filter(([assetId]) => !existingPages.has(assetId)).map(([assetId, pages]) => ({ taskId, assetId, pages })),
      skipDuplicates: true,
    }),
    ...pageUpdates.map(([assetId, pages]) => prisma.taskAsset.update({ where: { taskId_assetId: { taskId, assetId } }, data: { pages } })),
  ]);
  return fromBody.map((a) => a.notionPageId).filter((id): id is string => !!id);
}

/** Properti relation "Assets" untuk ditulis ke page task; null bila skema task tidak punya relation itu. */
export function assetsRelationProperty(schemaProps: Record<string, any>, notionPageIds: string[]): Record<string, any> | null {
  if (schemaProps?.[ASSETS_RELATION_PROPERTY]?.type !== 'relation') return null;
  return { [ASSETS_RELATION_PROPERTY]: { relation: notionPageIds.map((id) => ({ id })) } };
}
