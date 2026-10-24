'use server';

import { denyUnless, denyWrite } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Client } from '@notionhq/client';
import { encrypt, decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';
import { checkParentPage, listChildDatabases, normalizeNotionId } from '@/lib/notion-provision';
import { runInBackground } from '@/lib/background-sync';
import {
  ASSET_PROPERTY_MAP,
  createAssetDatabase,
  ensureAssetsRelationForTaskDb,
  getAssetDatabase,
  linkExistingAssetDatabase,
  pushPendingAssets,
} from '@/lib/notion-assets';

const API_KEY_MASK = '••••••••••••••••';
const DOCTYPE_PROPERTY_NAME = 'Doctype';

function maskText(text: string, visibleStart = 4, visibleEnd = 4): string {
  if (!text) return '';
  if (text.length <= visibleStart + visibleEnd) return '•'.repeat(text.length);
  return text.substring(0, visibleStart) + '•'.repeat(text.length - (visibleStart + visibleEnd)) + text.substring(text.length - visibleEnd);
}

async function getConfig() {
  return prisma.notionConfig.findFirst({ include: { databases: true, pages: { orderBy: { createdAt: 'asc' } } } });
}

const compactId = (id: string) => id.replace(/-/g, '').toLowerCase();

export async function getContractRateAction() {
  try {
    const config = await getConfig();
    return { success: true, contractRate: config?.contractRate ?? 15000 };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load contract rate.' };
  }
}

export async function updateContractRateAction(contractRate: number) {
  const denied = await denyWrite('rateCard.edit');
  if (denied) return denied as never;
  try {
    const existingConfig = await prisma.notionConfig.findFirst();
    if (!existingConfig) {
      await prisma.notionConfig.create({
        data: {
          workspaceName: 'Notion Workspace',
          encryptedApiKey: encrypt('').encryptedData,
          iv: encrypt('').iv,
          contractRate,
        },
      });
    } else {
      await prisma.notionConfig.update({ where: { id: existingConfig.id }, data: { contractRate } });
    }
    revalidatePath('/rate-card');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save contract rate.' };
  }
}

export async function getNotionConfigAction() {
  const denied = await denyUnless('integration.manage');
  if (denied) return denied as never;
  try {
    const config = await getConfig();
    if (!config) {
      return { exists: false, workspaceName: '', apiKey: '', autoSync: false, syncInterval: '15_mins', databases: [], contractRate: 15000 };
    }
    const apiKey = decrypt(config.encryptedApiKey, config.iv);
    return {
      exists: true,
      workspaceName: config.workspaceName,
      apiKey: API_KEY_MASK,
      maskedApiKey: maskText(apiKey, 6, 4),
      autoSync: config.autoSync,
      syncInterval: config.syncInterval,
      databases: config.databases.filter((db) => !db.archived).map((db) => ({ id: db.id, name: db.name, maskedDatabaseId: maskText(decrypt(db.encryptedDatabaseId, db.iv), 4, 4) })),
      pageCount: config.pages.length,
      defaultPageName: config.pages.find((p) => p.isDefault)?.name ?? null,
      contractRate: config.contractRate,
    };
  } catch (error) {
    console.error('Error fetching Notion config:', error);
    return { exists: false, workspaceName: '', apiKey: '', autoSync: false, syncInterval: '15_mins', databases: [], contractRate: 15000, error: 'Failed to retrieve configuration' };
  }
}

export async function saveNotionWorkspaceAction(workspaceName: string, apiKey: string) {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied as never;
  try {
    if (!workspaceName || !apiKey) throw new Error('Workspace Name and API Key are required');
    const existingConfig = await prisma.notionConfig.findFirst();
    let finalApiKey = apiKey;
    if (existingConfig) {
      const decryptedApiKey = decrypt(existingConfig.encryptedApiKey, existingConfig.iv);
      if (apiKey === API_KEY_MASK || apiKey === maskText(decryptedApiKey, 6, 4)) finalApiKey = decryptedApiKey;
    }
    const { iv, encryptedData: encApiKey } = encrypt(finalApiKey);
    if (existingConfig) {
      await prisma.notionConfig.update({ where: { id: existingConfig.id }, data: { workspaceName, encryptedApiKey: encApiKey, iv } });
    } else {
      await prisma.notionConfig.create({ data: { workspaceName, encryptedApiKey: encApiKey, iv, contractRate: 15000 } });
    }
    revalidatePath('/');
    revalidatePath('/notion-config');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving Notion workspace config:', error);
    return { success: false, error: error.message || 'Failed to save workspace configuration' };
  }
}

export async function saveSchedulingConfigAction(autoSync: boolean, syncInterval: string) {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied as never;
  try {
    const existingConfig = await prisma.notionConfig.findFirst();
    if (!existingConfig) return { success: false, error: 'Notion configuration not found. Please save API credentials first.' };
    await prisma.notionConfig.update({
      where: { id: existingConfig.id },
      data: { autoSync, syncInterval, updatedAt: new Date() }
    });
    try {
      revalidatePath('/');
      revalidatePath('/notion-config');
    } catch (revErr) {
      console.warn('Revalidation warning:', revErr);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error saving scheduling config:', error);
    return { success: false, error: error.message || 'Failed to save scheduling configuration' };
  }
}

export async function deleteNotionConfigAction() {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied as never;
  try {
    const existingConfig = await prisma.notionConfig.findFirst();
    if (!existingConfig) return { success: true };
    await prisma.notionConfig.delete({ where: { id: existingConfig.id } });
    revalidatePath('/notion-config');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting Notion config:', error);
    return { success: false, error: error.message || 'Failed to delete configuration' };
  }
}

export async function syncDoctypeOptionToNotion(doctypeName: string) {
  const config = await prisma.notionConfig.findFirst({ include: { databases: { where: { archived: false } } } });
  if (!config || config.databases.length === 0) return { success: false, error: 'Notion configuration missing.' };
  const apiKey = decrypt(config.encryptedApiKey, config.iv);
  const notion = new Client({ auth: apiKey });
  const databaseId = decrypt(config.databases[0].encryptedDatabaseId, config.databases[0].iv);

  try {
    const database = (await notion.databases.retrieve({ database_id: databaseId })) as any;
    const dataSourceId = database.data_sources?.[0]?.id || database.id;
    const dataSource: any = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
    const doctypeProp = dataSource.properties?.[DOCTYPE_PROPERTY_NAME];
    if (!doctypeProp || doctypeProp.type !== 'select') throw new Error(`Doctype property not found or not select on ${databaseId}.`);
    const currentOptions = doctypeProp.select?.options || [];
    if (currentOptions.some((option: any) => option.name?.toLowerCase() === doctypeName.toLowerCase())) return { success: true, skipped: true };

    await notion.dataSources.update({
      data_source_id: dataSourceId,
      properties: {
        [DOCTYPE_PROPERTY_NAME]: { select: { options: [...currentOptions, { name: doctypeName }] } },
      },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to sync Doctype option to Notion.' };
  }
}

function revalidateNotionConfig() {
  try {
    revalidatePath('/notion-config', 'layout');
  } catch {}
}

/**
 * Isi halaman Notion Config → Pages & Databases: page induk (satu default) dan database terdaftar,
 * lengkap dengan production yang memakainya.
 */
export async function getNotionPagesAndDatabasesAction() {
  const denied = await denyUnless('integration.manage');
  if (denied) return denied as never;
  try {
    const config = await getConfig();
    if (!config) return { success: true, exists: false, pages: [], databases: [] };
    const units = await prisma.productionUnit.findMany({ select: { name: true, isActive: true, notionTaskDbId: true } });
    const pageNames = new Map(config.pages.map((p) => [p.pageId, p.name]));
    const databases = config.databases.map((db) => {
      const databaseId = decrypt(db.encryptedDatabaseId, db.iv);
      const used = units.filter((u) => compactId(u.notionTaskDbId) === compactId(databaseId));
      return {
        id: db.id,
        name: db.name,
        maskedDatabaseId: maskText(compactId(databaseId), 4, 4),
        // Database milik production mengikuti status production-nya (diatur di Production Hub)
        archived: used.length > 0 ? used.every((u) => !u.isActive) : db.archived,
        managedByProduction: used.length > 0,
        parentPageId: db.parentPageId,
        parentPageName: db.parentPageId ? pageNames.get(db.parentPageId) ?? null : null,
        productions: used.map((u) => ({ name: u.name, isActive: u.isActive })),
        /** Kegunaan khusus (mis. "asset_library"); dikelola di tab-nya sendiri, bukan diarsipkan di sini. */
        purpose: db.purpose,
      };
    });
    const pages = config.pages.map((p) => ({
      id: p.id,
      name: p.name,
      pageId: p.pageId,
      isDefault: p.isDefault,
      databaseCount: databases.filter((db) => db.parentPageId === p.pageId && !db.archived).length,
    }));
    return { success: true, exists: true, workspaceName: config.workspaceName, maskedApiKey: maskText(decrypt(config.encryptedApiKey, config.iv), 6, 4), pages, databases };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat page dan database.' };
  }
}

/** Tambah page induk (ID atau link). Akses integrasi dicek dulu; page pertama otomatis jadi default. */
export async function addNotionPageAction(input: { page: string; makeDefault?: boolean }) {
  const denied = await denyWrite('integration.manage', 'production.create');
  if (denied) return denied as never;
  try {
    const config = await prisma.notionConfig.findFirst({ include: { pages: true } });
    if (!config) throw new Error('Isi API key Notion dulu.');
    const pageId = normalizeNotionId(input.page);
    if (!pageId) throw new Error('Page tidak valid. Tempel link page Notion atau ID 32 karakter.');
    const name = await checkParentPage(pageId);
    const makeDefault = input.makeDefault || config.pages.length === 0;
    const page = await prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.notionPage.updateMany({ where: { configId: config.id }, data: { isDefault: false } });
      return tx.notionPage.upsert({
        where: { pageId },
        create: { configId: config.id, name, pageId, isDefault: makeDefault },
        update: { name, ...(makeDefault ? { isDefault: true } : {}) },
      });
    });
    revalidateNotionConfig();
    return { success: true, page: { id: page.id, name: page.name, pageId: page.pageId, isDefault: page.isDefault } };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambah page.' };
  }
}

/** Jadikan page default untuk database baru di wizard production. */
export async function setDefaultNotionPageAction(id: string) {
  const denied = await denyWrite('integration.manage', 'production.create');
  if (denied) return denied as never;
  try {
    const page = await prisma.notionPage.findUnique({ where: { id } });
    if (!page) throw new Error('Page tidak ditemukan.');
    await prisma.$transaction([
      prisma.notionPage.updateMany({ where: { configId: page.configId }, data: { isDefault: false } }),
      prisma.notionPage.update({ where: { id }, data: { isDefault: true } }),
    ]);
    revalidateNotionConfig();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menjadikan page default.' };
  }
}

/** Lepas page dari daftar (page & database di Notion tidak disentuh). Default pindah ke page tertua yang tersisa. */
export async function removeNotionPageAction(id: string) {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied as never;
  try {
    const page = await prisma.notionPage.delete({ where: { id } });
    if (page.isDefault) {
      const next = await prisma.notionPage.findFirst({ where: { configId: page.configId }, orderBy: { createdAt: 'asc' } });
      if (next) await prisma.notionPage.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    revalidateNotionConfig();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal melepas page.' };
  }
}

/** Daftarkan database yang sudah ada di dalam page (mis. database lama) agar tercatat di platform. */
export async function scanNotionPageDatabasesAction(id: string) {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied as never;
  try {
    const page = await prisma.notionPage.findUnique({ where: { id }, include: { config: { include: { databases: true } } } });
    if (!page) throw new Error('Page tidak ditemukan.');
    const children = await listChildDatabases(page.pageId);
    const registered = new Map(page.config.databases.map((db) => [compactId(decrypt(db.encryptedDatabaseId, db.iv)), db]));
    let added = 0;
    for (const child of children) {
      const existing = registered.get(compactId(child.id));
      if (existing) {
        if (!existing.parentPageId) await prisma.notionDatabase.update({ where: { id: existing.id }, data: { parentPageId: page.pageId } });
        continue;
      }
      const { iv, encryptedData } = encrypt(compactId(child.id));
      await prisma.notionDatabase.create({ data: { name: child.title, encryptedDatabaseId: encryptedData, iv, configId: page.configId, parentPageId: page.pageId } });
      added++;
    }
    revalidateNotionConfig();
    return { success: true, found: children.length, added };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memindai page.' };
  }
}

/** Arsipkan / pulihkan database terdaftar yang tidak dipakai production. Database milik production mengikuti status production-nya. */
export async function setNotionDatabaseArchivedAction(input: { id: string; archived: boolean }) {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied as never;
  try {
    const db = await prisma.notionDatabase.findUnique({ where: { id: input.id } });
    if (!db) throw new Error('Database tidak ditemukan.');
    const databaseId = compactId(decrypt(db.encryptedDatabaseId, db.iv));
    const units = await prisma.productionUnit.findMany({ select: { name: true, notionTaskDbId: true } });
    const owner = units.find((u) => compactId(u.notionTaskDbId) === databaseId);
    if (owner) throw new Error(`Database ini dipakai production "${owner.name}". Arsipkan atau pulihkan lewat Production Hub.`);
    await prisma.notionDatabase.update({ where: { id: db.id }, data: { archived: input.archived } });
    revalidateNotionConfig();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah database.' };
  }
}

// ── Asset Library (database mirror aset + relation "Assets" di database task) ──

/** Status database Asset Library, kandidat database, dan relation per production. Membaca Notion. */
export async function getAssetNotionStatusAction() {
  const denied = await denyUnless('integration.manage');
  if (denied) return denied as never;
  try {
    const config = await getConfig();
    if (!config) return { success: true as const, exists: false as const };
    const db = await getAssetDatabase();
    const units = await prisma.productionUnit.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    const taskDbIds = new Set(units.map((u) => compactId(u.notionTaskDbId)));
    const pageNames = new Map(config.pages.map((p) => [p.pageId, p.name]));
    const candidates = config.databases
      .filter((row) => !row.archived && row.id !== db?.rowId)
      .filter((row) => { try { return !taskDbIds.has(compactId(decrypt(row.encryptedDatabaseId, row.iv))); } catch { return false; } })
      .map((row) => ({ id: row.id, name: row.name }));
    const [total, pending, failed, last] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { syncStatus: 'PENDING_PUSH' } }),
      prisma.asset.count({ where: { syncStatus: 'ERROR' } }),
      prisma.asset.aggregate({ _max: { lastSyncedAt: true } }),
    ]);
    const relations = db
      ? await Promise.all(units.map(async (u) => ({
          unitId: u.id,
          unitName: u.name,
          state: u.notionTaskDbId ? await ensureAssetsRelationForTaskDb(u.notionTaskDbId, { create: false }) : 'missing',
        })))
      : [];
    return {
      success: true as const,
      exists: true as const,
      database: db ? { name: db.name, parentPageName: db.parentPageId ? pageNames.get(db.parentPageId) ?? null : null } : null,
      pages: config.pages.map((p) => ({ id: p.id, name: p.name, isDefault: p.isDefault })),
      candidates,
      counts: { total, pending, failed, lastSyncedAt: last._max.lastSyncedAt ? last._max.lastSyncedAt.getTime() : null },
      relations,
      propertyMap: ASSET_PROPERTY_MAP,
    };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal memuat status Asset Library.' };
  }
}

/** Buat database "Asset Library" di page induk terdaftar, lalu kirim semua aset. */
export async function createAssetDatabaseAction(pageRowId: string) {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied as never;
  try {
    const page = await prisma.notionPage.findUnique({ where: { id: pageRowId } });
    if (!page) throw new Error('Page induk tidak ditemukan.');
    await createAssetDatabase(page.pageId);
    await afterAssetDatabaseLinked();
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal membuat database Asset Library.' };
  }
}

/** Pakai database terdaftar (bukan database task) sebagai Asset Library; properti yang kurang ditambahkan. */
export async function linkAssetDatabaseAction(databaseRowId: string) {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied as never;
  try {
    const row = await prisma.notionDatabase.findUnique({ where: { id: databaseRowId } });
    if (!row) throw new Error('Database tidak ditemukan.');
    const added = await linkExistingAssetDatabase(decrypt(row.encryptedDatabaseId, row.iv), row.name, row.parentPageId);
    await afterAssetDatabaseLinked();
    return { success: true as const, added };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal menghubungkan database Asset Library.' };
  }
}

/** Buat relation "Assets" di database task satu production. */
export async function createAssetsRelationAction(unitId: string) {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied as never;
  try {
    const unit = await prisma.productionUnit.findUnique({ where: { id: unitId } });
    if (!unit?.notionTaskDbId) throw new Error('Production ini belum punya database Notion.');
    const state = await ensureAssetsRelationForTaskDb(unit.notionTaskDbId);
    if (state === 'conflict') throw new Error('Database task sudah punya properti "Assets" dengan tipe/target lain. Ganti namanya di Notion dulu.');
    if (state === 'no_asset_db') throw new Error('Database Asset Library belum terhubung.');
    if (state === 'error') throw new Error('Gagal membuat relation di Notion. Cek akses integrasi ke database task.');
    return { success: true as const, state };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal membuat relation.' };
  }
}

// Relation "Assets" di database task production yang sudah ada dibuat per production lewat tombol
// "Buat relation" (mengubah skema database live tim); production baru otomatis dibuatkan.
async function afterAssetDatabaseLinked() {
  runInBackground('Kirim Asset Library ke Notion', async () => {
    await pushPendingAssets(500);
  });
  revalidatePath('/notion-config', 'layout');
  revalidatePath('/assets');
}

/** Riwayat sync terbaru untuk tab Sinkronisasi. */
export async function getRecentSyncLogsAction(limit = 10) {
  const denied = await denyUnless('integration.manage');
  if (denied) return denied as never;
  try {
    const logs = await prisma.syncLog.findMany({ orderBy: { startedAt: 'desc' }, take: Math.min(Math.max(limit, 1), 50) });
    return {
      success: true as const,
      logs: logs.map((l) => ({
        id: l.id,
        startedAt: l.startedAt.getTime(),
        finishedAt: l.finishedAt ? l.finishedAt.getTime() : null,
        status: l.status,
        mode: l.mode,
        recordsSynced: l.recordsSynced,
        errorMessage: l.errorMessage,
      })),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal memuat riwayat sync.' };
  }
}
