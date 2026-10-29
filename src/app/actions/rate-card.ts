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
    qaChecklist?: string[];
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
    if (values.qaChecklist !== undefined) dataToUpdate.qaChecklist = values.qaChecklist;
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
  qaChecklist?: string[];
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
        qaChecklist: values.qaChecklist ?? [],
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


const PLATFORM_OUTPUT_TYPES = ['canva_link', 'dropbox_link'] as const;

/**
 * Kontrak baru = platform baru beserta tarif dasar per halaman dan tanggal berlaku.
 * Kontrak dibuat dulu di Rate Card, baru production dibuat di wizard (hanya platform berkontrak).
 * Jenis output hanya yang dikenal app (Canva Link / Dropbox Link); jenis lain butuh pekerjaan kode.
 */
export async function createContractAction(input: {
  name: string;
  outputType: string;
  baseRate: number;
  contractStartDate: string;
  contractEndDate: string;
}) {
  const denied = await denyWrite('rateCard.edit');
  if (denied) return denied as never;
  try {
    const name = input.name?.trim();
    if (!name) throw new Error('Nama platform wajib diisi.');
    if (name.length > 60) throw new Error('Nama platform maksimal 60 karakter.');
    if (!(PLATFORM_OUTPUT_TYPES as readonly string[]).includes(input.outputType)) throw new Error('Jenis output tidak dikenal.');
    if (!Number.isFinite(input.baseRate) || input.baseRate <= 0) throw new Error('Tarif dasar wajib diisi (lebih dari 0).');
    const start = new Date(`${input.contractStartDate}T00:00:00Z`);
    const end = new Date(`${input.contractEndDate}T00:00:00Z`);
    if (!input.contractStartDate || Number.isNaN(start.getTime())) throw new Error('Tanggal mulai kontrak wajib diisi.');
    if (!input.contractEndDate || Number.isNaN(end.getTime())) throw new Error('Tanggal akhir kontrak wajib diisi.');
    if (end < start) throw new Error('Tanggal akhir harus setelah tanggal mulai.');

    const duplicate = await prisma.platform.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: { id: true } });
    if (duplicate) throw new Error('Platform dengan nama ini sudah punya kontrak.');
    const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'platform';
    let slug = base;
    for (let i = 2; await prisma.platform.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;

    const platform = await prisma.platform.create({
      data: {
        name,
        slug,
        outputType: input.outputType,
        baseRate: Math.round(input.baseRate),
        contractStartDate: start,
        contractEndDate: end,
      },
    });
    revalidatePath('/rate-card');
    revalidatePath('/production', 'layout');
    return { success: true as const, platform: { id: platform.id, name: platform.name, slug: platform.slug } };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal membuat kontrak.' };
  }
}

/** Edit kontrak (Rate Card → klik baris): nama, tarif dasar, periode. Jenis output tidak diubah. */
export async function updateContractAction(input: { id: string; name: string; baseRate: number; contractStartDate: string; contractEndDate: string }) {
  const denied = await denyWrite('rateCard.edit');
  if (denied) return denied as never;
  try {
    const name = input.name?.trim();
    if (!name) throw new Error('Nama platform wajib diisi.');
    if (name.length > 60) throw new Error('Nama platform maksimal 60 karakter.');
    if (!Number.isFinite(input.baseRate) || input.baseRate <= 0) throw new Error('Tarif dasar wajib diisi (lebih dari 0).');
    const start = new Date(`${input.contractStartDate}T00:00:00Z`);
    const end = new Date(`${input.contractEndDate}T00:00:00Z`);
    if (!input.contractStartDate || Number.isNaN(start.getTime())) throw new Error('Tanggal mulai kontrak wajib diisi.');
    if (!input.contractEndDate || Number.isNaN(end.getTime())) throw new Error('Tanggal akhir kontrak wajib diisi.');
    if (end < start) throw new Error('Tanggal akhir harus setelah tanggal mulai.');
    const duplicate = await prisma.platform.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, id: { not: input.id } },
      select: { id: true },
    });
    if (duplicate) throw new Error('Platform dengan nama ini sudah punya kontrak.');

    const platform = await prisma.platform.update({
      where: { id: input.id },
      data: { name, baseRate: Math.round(input.baseRate), contractStartDate: start, contractEndDate: end },
    });
    revalidatePath('/rate-card');
    revalidatePath('/production', 'layout');
    return { success: true as const, platform: { id: platform.id, name: platform.name, slug: platform.slug } };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal menyimpan kontrak.' };
  }
}
