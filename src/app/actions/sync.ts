'use server';

import { syncNotionData } from '@/lib/sync-notion';
import { revalidatePath } from 'next/cache';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function triggerSyncAction() {
  try {
    const result = await syncNotionData();
    revalidatePath('/');
    return result;
  } catch (error: any) {
    return { status: 'failed', errorMessage: error.message || String(error) };
  }
}

export async function getLatestSyncStatus() {
  try {
    const latestLog = await prisma.syncLog.findFirst({
      orderBy: { startedAt: 'desc' },
    });
    return latestLog;
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return null;
  }
}
