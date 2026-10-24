'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getAccess, denyUnless, denyWrite } from '@/lib/access';
import { registerNotionDatabase } from '@/lib/notion-registry';
import { ensureAssetsRelationForTaskDb } from '@/lib/notion-assets';
import { syncNotionData } from '@/lib/sync-notion';
import {
  createTaskDatabase,
  validateExistingDatabase,
  addMissingProperties,
  ensureSelectOptions,
  normalizeNotionId,
} from '@/lib/notion-provision';
import { DEFAULT_FIELD_ALIASES, isFieldEnabled, type FieldKey, type FieldMapping } from '@/lib/production-field-mapping';

/** Daftar production aktif untuk Sidebar & Production Hub (read-only, Fase 2). */
export async function getProductionUnitsAction() {
  const access = await getAccess();
  if (access.enabled && !access.user) return [];
  const units = await prisma.productionUnit.findMany({
    where: { isActive: true, ...(access.unitIds ? { id: { in: access.unitIds } } : {}) },
    include: { platform: true, _count: { select: { tasks: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return JSON.parse(JSON.stringify(units));
}

async function findUnit(unitId: string) {
  const unit = await prisma.productionUnit.findUnique({ where: { id: unitId } });
  if (!unit) throw new Error('Production tidak ditemukan.');
  return unit;
}

/**
 * Buat database Task Notion untuk unit di parent page. Idempotent: bila unit sudah
 * punya database, tidak membuat yang baru.
 */
export async function createProductionTaskDatabaseAction(input: { unitId: string; parentPageId: string }) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const unit = await findUnit(input.unitId);
    if (unit.notionTaskDbId) {
      return { success: true, created: false, databaseId: unit.notionTaskDbId };
    }
    const parentPageId = input.parentPageId.trim();
    if (!parentPageId) throw new Error('Parent page ID wajib diisi.');

    const databaseId = await createTaskDatabase(parentPageId, unit);
    await prisma.productionUnit.update({
      where: { id: unit.id },
      data: { notionTaskDbId: databaseId, notionParentPageId: parentPageId },
    });
    await registerNotionDatabase(unit.name, databaseId, parentPageId);
    await ensureAssetsRelationForTaskDb(databaseId);

    revalidatePath('/production', 'layout');
    return { success: true, created: true, databaseId };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat database Notion.' };
  }
}

/** Laporan cocok / alias / hilang / tipe beda untuk database unit. Hanya membaca. */
export async function validateProductionDatabaseAction(unitId: string) {
  const denied = await denyUnless('production.create');
  if (denied) return denied as never;
  try {
    const unit = await findUnit(unitId);
    if (!unit.notionTaskDbId) throw new Error('Production ini belum punya database Notion.');
    const report = await validateExistingDatabase(unit.notionTaskDbId);
    return { success: true, report };
  } catch (error: any) {
    return { success: false, error: error.message || 'Validasi gagal.' };
  }
}

/** Tombol "Tambahkan": buat properti inti yang hilang saja. */
export async function addMissingPropertiesAction(unitId: string) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const unit = await findUnit(unitId);
    if (!unit.notionTaskDbId) throw new Error('Production ini belum punya database Notion.');
    const report = await validateExistingDatabase(unit.notionTaskDbId);
    const added = await addMissingProperties(unit.notionTaskDbId, unit.platformId, report.missing);
    return { success: true, added };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambahkan properti.' };
  }
}

/**
 * Hook: setelah Designer/Doctype/Account ditambah di sebuah platform, sinkronkan opsi
 * Select ke database Task semua unit aktif pada platform itu (idempotent, merge).
 * Designer bersifat master → dikirim ke semua unit (platformId opsional).
 */
export async function syncPlatformOptionsToNotion(input: {
  platformId?: string;
  kind: 'designer' | 'doctype' | 'account';
  names: string[];
}) {
  const fieldKey: FieldKey = input.kind === 'designer' ? 'designer' : input.kind === 'doctype' ? 'doctype' : 'brand';
  const units = await prisma.productionUnit.findMany({
    where: {
      isActive: true,
      notionTaskDbId: { not: '' },
      ...(input.kind !== 'designer' && input.platformId ? { platformId: input.platformId } : {}),
    },
  });

  const results: { unitId: string; added: string[]; error?: string }[] = [];
  for (const unit of units) {
    if (!isFieldEnabled(fieldKey, unit.disabledFields)) continue;
    // Nama properti mengikuti mapping production (default: nama lama sync)
    const configured = (unit.fieldMapping as FieldMapping | null)?.[fieldKey];
    const propertyName = (Array.isArray(configured) ? configured[0] : configured) || DEFAULT_FIELD_ALIASES[fieldKey][0];
    try {
      const { added } = await ensureSelectOptions(unit.notionTaskDbId, propertyName, input.names);
      results.push({ unitId: unit.id, added });
    } catch (error: any) {
      results.push({ unitId: unit.id, added: [], error: error.message || 'Gagal sinkron opsi.' });
    }
  }
  return { success: results.every((r) => !r.error), results };
}

/** Daftar platform untuk wizard Production (Fase 5). */
export async function listPlatformsAction() {
  const denied = await denyUnless('rateCard.view', 'production.create');
  if (denied) return denied as never;
  const platforms = await prisma.platform.findMany({ orderBy: { createdAt: 'asc' } });
  return JSON.parse(JSON.stringify(platforms));
}

/** Daftar page induk untuk database Task baru (Notion Config → Pages), default lebih dulu. */
export async function listParentPagesAction() {
  const denied = await denyUnless('production.create');
  if (denied) return denied as never;
  const pages = await prisma.notionPage.findMany({
    select: { id: true, name: true, pageId: true, isDefault: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return { success: true, pages };
}

/** Periksa database Notion yang akan dihubungkan (wizard langkah 2). Hanya membaca. */
export async function checkNotionDatabaseAction(input: { databaseId: string }) {
  const denied = await denyUnless('production.create');
  if (denied) return denied as never;
  try {
    const databaseId = input.databaseId.trim();
    if (!databaseId) throw new Error('Database ID wajib diisi.');
    const report = await validateExistingDatabase(databaseId);
    return { success: true, report };
  } catch (error: any) {
    return { success: false, error: error.message || 'Database tidak bisa dibaca.' };
  }
}

/** Tombol "Tambahkan" di wizard: lengkapi properti inti database yang dihubungkan. */
export async function addMissingDatabasePropertiesAction(input: { databaseId: string; platformId: string }) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const report = await validateExistingDatabase(input.databaseId.trim());
    const added = await addMissingProperties(input.databaseId.trim(), input.platformId, report.missing);
    const after = await validateExistingDatabase(input.databaseId.trim());
    return { success: true, added, report: after };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambahkan properti.' };
  }
}

export interface CreateProductionUnitInput {
  name: string;
  slug?: string;
  platformId: string;
  notionMode: 'create' | 'connect';
  parentPageId?: string;
  databaseId?: string;
  dropboxRoot?: string;
}

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Wizard langkah 6: buat database (mode create) atau pakai database yang dihubungkan (mode connect),
 * lalu simpan ProductionUnit. Database dibuat dulu; bila gagal, tidak ada baris unit yang tersisa.
 */
export async function createProductionUnitAction(input: CreateProductionUnitInput) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const name = input.name.trim();
    if (!name) throw new Error('Nama production wajib diisi.');
    const slug = slugify(input.slug?.trim() || name);
    if (!slug) throw new Error('Slug tidak valid.');

    const platform = await prisma.platform.findUnique({ where: { id: input.platformId } });
    if (!platform) throw new Error('Platform tidak ditemukan.');

    const existing = await prisma.productionUnit.findUnique({ where: { slug } });
    if (existing) throw new Error(`Slug "${slug}" sudah dipakai production lain.`);

    let databaseId: string;
    let parentPageId: string | null = null;

    if (input.notionMode === 'create') {
      parentPageId = input.parentPageId ? normalizeNotionId(input.parentPageId) : null;
      if (!parentPageId) throw new Error('Parent page Notion wajib diisi (ID 32 karakter atau link page).');
      databaseId = await createTaskDatabase(parentPageId, { id: '', name, platformId: platform.id });
    } else {
      databaseId = input.databaseId?.trim() || '';
      if (!databaseId) throw new Error('Database ID Notion wajib diisi.');
      const report = await validateExistingDatabase(databaseId);
      if (report.typeMismatch.length > 0) {
        throw new Error(`Tipe properti tidak cocok: ${report.typeMismatch.map((m) => m.name).join(', ')}.`);
      }
      if (report.missing.length > 0) {
        throw new Error(`Properti inti belum lengkap: ${report.missing.join(', ')}. Jalankan "Tambahkan" dulu.`);
      }
    }

    const unit = await prisma.productionUnit.create({
      data: {
        name,
        slug,
        platformId: platform.id,
        notionTaskDbId: databaseId,
        notionParentPageId: parentPageId,
        dropboxRoot: platform.outputType === 'dropbox_link' ? input.dropboxRoot?.trim() || null : null,
      },
    });
    await registerNotionDatabase(name, databaseId, parentPageId);
    await ensureAssetsRelationForTaskDb(databaseId);

    try { revalidatePath('/production', 'layout'); } catch (_) {}
    return { success: true, unit: JSON.parse(JSON.stringify(unit)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat production.' };
  }
}

/** Status koneksi Dropbox untuk langkah Output wizard (Fase 6). */
export async function getDropboxStatusAction() {
  const denied = await denyUnless('integration.manage');
  if (denied) return denied as never;
  const { getDropboxStatus } = await import('@/lib/dropbox');
  return getDropboxStatus();
}

export async function disconnectDropboxAction() {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied as never;
  try {
    const { disconnectDropbox } = await import('@/lib/dropbox');
    await disconnectDropbox();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memutus Dropbox.' };
  }
}

/** Sync incremental setelah perubahan production. Tidak pernah full: full sync menghapus task yang tidak ditemukan. */
async function syncAfterProductionChange() {
  try {
    const result: any = await syncNotionData('incremental');
    return { status: result?.status ?? 'unknown', skippedUnits: (result?.skippedUnits as string[] | undefined) ?? [], errorMessage: result?.errorMessage as string | undefined };
  } catch (error: any) {
    return { status: 'failed', skippedUnits: [] as string[], errorMessage: error?.message || String(error) };
  }
}

function revalidateProduction() {
  revalidatePath('/');
  revalidatePath('/production', 'layout');
  revalidatePath('/billing-statement');
}

/** Arsipkan (isActive=false) atau pulihkan production, lalu jalankan sync Notion. Task tetap tersimpan. */
export async function setProductionUnitArchivedAction(input: { unitId: string; archived: boolean }) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    await findUnit(input.unitId);
    await prisma.productionUnit.update({ where: { id: input.unitId }, data: { isActive: !input.archived } });
    const sync = await syncAfterProductionChange();
    revalidateProduction();
    return { success: true, sync };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah status production.' };
  }
}

/** Hapus permanen production dari aplikasi (database Notion tidak disentuh). Hanya bila tidak punya task / komponen bundle. */
export async function deleteProductionUnitAction(input: { unitId: string }) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const unit = await findUnit(input.unitId);
    const [tasks, bundleItems] = await Promise.all([
      prisma.task.count({ where: { productionUnitId: unit.id } }),
      prisma.bundleItem.count({ where: { productionUnitId: unit.id } }),
    ]);
    if (tasks > 0) return { success: false, error: `Production masih punya ${tasks} task. Arsipkan saja.` };
    if (bundleItems > 0) return { success: false, error: 'Production dipakai sebagai komponen bundle. Hapus komponennya dulu atau arsipkan.' };
    await prisma.productionUnit.delete({ where: { id: unit.id } });
    const sync = await syncAfterProductionChange();
    revalidateProduction();
    return { success: true, sync };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus production.' };
  }
}

export interface UpdateProductionUnitInput {
  unitId: string;
  name: string;
  /** Database Notion Task. Bila berubah, skema divalidasi seperti saat setup. */
  databaseId: string;
  dropboxRoot?: string;
}

/**
 * Edit production. Slug (URL) dan platform sengaja terkunci: slug menjaga link/bookmark, platform menentukan
 * doctype, akun, dan tarif. Mengganti database Notion memicu sync incremental.
 */
export async function updateProductionUnitAction(input: UpdateProductionUnitInput) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const unit = await prisma.productionUnit.findUnique({ where: { id: input.unitId }, include: { platform: true } });
    if (!unit) throw new Error('Production tidak ditemukan.');

    const name = input.name.trim();
    if (!name) throw new Error('Nama production wajib diisi.');
    if (name.length > 80) throw new Error('Nama maksimal 80 karakter.');
    const duplicate = await prisma.productionUnit.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, id: { not: unit.id } },
      select: { id: true },
    });
    if (duplicate) throw new Error('Nama production sudah dipakai.');

    const databaseId = input.databaseId.trim();
    if (!databaseId) throw new Error('Database ID Notion wajib diisi.');
    const databaseChanged = databaseId !== unit.notionTaskDbId;
    if (databaseChanged) {
      const report = await validateExistingDatabase(databaseId, { mapping: unit.fieldMapping as FieldMapping, disabled: unit.disabledFields });
      if (report.typeMismatch.length > 0) {
        throw new Error(`Tipe properti tidak cocok: ${report.typeMismatch.map((m) => m.name).join(', ')}.`);
      }
      if (report.missing.length > 0) {
        throw new Error(`Properti inti belum lengkap: ${report.missing.join(', ')}. Jalankan "Tambahkan" dulu.`);
      }
    }

    const updated = await prisma.productionUnit.update({
      where: { id: unit.id },
      data: {
        name,
        notionTaskDbId: databaseId,
        dropboxRoot: unit.platform.outputType === 'dropbox_link' ? input.dropboxRoot?.trim() || null : unit.dropboxRoot,
      },
    });

    if (databaseChanged) {
      await registerNotionDatabase(name, databaseId);
      await ensureAssetsRelationForTaskDb(databaseId);
    }
    const sync = databaseChanged ? await syncAfterProductionChange() : undefined;
    revalidateProduction();
    return { success: true, unit: JSON.parse(JSON.stringify(updated)), sync, databaseChanged };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan production.' };
  }
}
