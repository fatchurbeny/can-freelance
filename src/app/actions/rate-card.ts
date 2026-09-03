'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { syncDoctypeOptionToNotion } from '@/app/actions/notion-config';

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
  try {
    const dataToUpdate: any = {};
    if (typeof values.poolRate === 'number') dataToUpdate.poolRate = values.poolRate;
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
      await syncDoctypeOptionToNotion(updated.notionKey);
    }

    revalidatePath('/rate-card');
    return { success: true, doctype: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update doctype rate card.' };
  }
}

export async function createDoctypeAction(values: {
  name: string;
  notionKey?: string;
  category?: string;
  dimensions?: string;
  aspectRatio?: string;
  poolRate: number;
  pages: number;
  notes?: string;
  isActive?: boolean;
}) {
  try {
    const baseName = normalizeName(values.name);
    if (!baseName) {
      return { success: false, error: 'Doctype name is required.' };
    }

    const uniqueName = values.notionKey && values.notionKey.trim()
      ? values.notionKey.trim()
      : await buildUniqueDoctypeName(baseName);

    const created = await prisma.doctype.create({
      data: {
        notionKey: uniqueName,
        displayName: baseName,
        category: values.category || 'Infografis',
        dimensions: values.dimensions || '1920x1080 px',
        aspectRatio: values.aspectRatio || '16:9',
        poolRate: values.poolRate,
        pages: values.pages,
        notes: values.notes || null,
        isActive: values.isActive ?? true,
      },
    });

    await syncDoctypeOptionToNotion(uniqueName);
    revalidatePath('/rate-card');

    return { success: true, doctype: created };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create doctype.' };
  }
}
