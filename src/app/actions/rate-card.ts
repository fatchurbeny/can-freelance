'use server';

import { denyUnless, denyWrite } from '@/lib/access';
import prisma from '@/lib/prisma';
import { syncPlatformOptionsToNotion } from '@/app/actions/production-unit';
import { revalidatePath } from 'next/cache';
import { syncDoctypeOptionToNotion } from '@/app/actions/notion-config';
import { runInBackground } from '@/lib/background-sync';

function normalizeName(name: string) {
  return name.trim();
}

async function buildUniqueDoctypeName(baseName: string) {
  const existing = await prisma.doctype.findMany({
    where: {
      OR: [
        { notionKey: baseName },
        { displayName: baseName },
        { notionKey: { startsWith: `${baseName}(` } },
        { displayName: { startsWith: `${baseName}(` } },
      ],
    },
    select: { notionKey: true, displayName: true },
  });

  const taken = new Set([
    ...existing.map((item) => item.notionKey.toLowerCase()),
    ...existing.map((item) => item.displayName.toLowerCase()),
  ]);

  if (!taken.has(baseName.toLowerCase())) return baseName;

  let suffix = 1;
  while (taken.has(`${baseName}(${suffix})`.toLowerCase())) suffix += 1;
  return `${baseName}(${suffix})`;
}

export async function updateDoctypeRateCardAction(
  doctypeId: string,
  values: {
    poolRate?: number;
    usage?: 'Kontrak' | 'Bundle' | 'Keduanya';
    pages?: number;
    name?: string;
    notionKey?: string;
    category?: string;
    dimensions?: string;
    aspectRatio?: string;
    notes?: string;
    isActive?: boolean;
  }
) {
  const denied = await denyWrite('rateCard.edit');
  if (denied) return denied as never;
  try {
    const dataToUpdate: any = {};
    if (typeof values.poolRate === 'number') dataToUpdate.poolRate = values.poolRate;
    if (values.usage) {
      dataToUpdate.usage = values.usage;
      if (values.usage === 'Bundle') dataToUpdate.poolRate = 0;
    }
    if (typeof values.pages === 'number') dataToUpdate.pages = values.pages;
    if (values.name) dataToUpdate.displayName = values.name.trim();
    if (values.notionKey) dataToUpdate.notionKey = values.notionKey.trim();
    if (values.category !== undefined) dataToUpdate.category = values.category;
    if (values.dimensions !== undefined) dataToUpdate.dimensions = values.dimensions;
    if (values.aspectRatio !== undefined) dataToUpdate.aspectRatio = values.aspectRatio;
    if (values.notes !== undefined) dataToUpdate.notes = values.notes;
    if (typeof values.isActive === 'boolean') dataToUpdate.isActive = values.isActive;

    const updated = await prisma.doctype.update({
      where: { id: doctypeId },
      data: dataToUpdate,
    });

    if (values.notionKey || values.name) {
      runInBackground(`Sync Doctype ${updated.displayName} to Notion`, async () => {
        await syncDoctypeOptionToNotion(updated.notionKey);
      });
    }

    revalidatePath('/rate-card');
    return { success: true, doctype: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update doctype rate card.' };
  }
}

export async function createDoctypeAction(values: {
  platformSlug?: string;
  name: string;
  notionKey?: string;
  category?: string;
  dimensions?: string;
  aspectRatio?: string;
  poolRate: number;
  usage?: 'Kontrak' | 'Bundle' | 'Keduanya';
  pages: number;
  notes?: string;
  isActive?: boolean;
}) {
  const denied = await denyWrite('rateCard.edit');
  if (denied) return denied as never;
  try {
    const baseName = normalizeName(values.name);
    if (!baseName) {
      return { success: false, error: 'Doctype name is required.' };
    }

    const uniqueName = values.notionKey && values.notionKey.trim()
      ? values.notionKey.trim()
      : await buildUniqueDoctypeName(baseName);

    // Doctype milik satu platform (default Canva)
    const platformSlug = values.platformSlug || 'canva';
    const platform = await prisma.platform.findUnique({ where: { slug: platformSlug } });
    if (!platform) return { success: false, error: `Platform "${platformSlug}" belum ada.` };

    const created = await prisma.doctype.create({
      data: {
        platformId: platform.id,
        notionKey: uniqueName,
        displayName: baseName,
        category: values.category || 'Infografis',
        dimensions: values.dimensions || '1920x1080 px',
        aspectRatio: values.aspectRatio || '16:9',
        poolRate: values.usage === 'Bundle' ? 0 : values.poolRate,
        usage: values.usage ?? 'Kontrak',
        pages: values.pages,
        notes: values.notes || null,
        isActive: values.isActive ?? true,
      },
    });

    await syncDoctypeOptionToNotion(uniqueName);
    // Multi-production hook: opsi Doctype ke database Task semua unit di platform ini
    await syncPlatformOptionsToNotion({ platformId: created.platformId, kind: 'doctype', names: [created.displayName] }).catch(() => {});
    revalidatePath('/rate-card');

    return { success: true, doctype: created };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create doctype.' };
  }
}

/** Tarif dasar per halaman untuk satu platform (kontrak platform). */
export async function updatePlatformBaseRateAction(platformSlug: string, baseRate: number) {
  const denied = await denyWrite('rateCard.edit');
  if (denied) return denied as never;
  try {
    if (!Number.isFinite(baseRate) || baseRate < 0) return { success: false, error: 'Tarif harus angka valid.' };
    await prisma.platform.update({ where: { slug: platformSlug }, data: { baseRate: Math.round(baseRate) } });
    revalidatePath('/rate-card');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan tarif dasar.' };
  }
}
