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
  values: { poolRate: number; pages: number }
) {
  try {
    const updated = await prisma.doctype.update({
      where: { id: doctypeId },
      data: { poolRate: values.poolRate, pages: values.pages },
    });

    revalidatePath('/rate-card');
    return { success: true, doctype: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update doctype rate card.' };
  }
}

export async function createDoctypeAction(values: { name: string; poolRate: number; pages: number }) {
  try {
    const baseName = normalizeName(values.name);
    if (!baseName) {
      return { success: false, error: 'Doctype name is required.' };
    }

    const uniqueName = await buildUniqueDoctypeName(baseName);
    const created = await prisma.doctype.create({
      data: {
        notionKey: uniqueName,
        displayName: uniqueName,
        poolRate: values.poolRate,
        pages: values.pages,
      },
    });

    await syncDoctypeOptionToNotion(uniqueName);
    revalidatePath('/rate-card');

    return { success: true, doctype: created };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create doctype.' };
  }
}
