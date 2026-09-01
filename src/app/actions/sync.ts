'use server';

import { syncNotionData, getSyncProgress } from '@/lib/sync-notion';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function triggerSyncAction(mode: import('@/lib/sync-notion').NotionSyncMode = 'full') {
  try {
    const result = await syncNotionData(mode);
    revalidatePath('/');
    revalidatePath('/production');
    return result;
  } catch (error: any) {
    return { status: 'failed', errorMessage: error.message || String(error) };
  }
}

export async function getSyncProgressAction() {
  return getSyncProgress();
}

export async function getLatestSyncStatus() {
  try {
    // Auto-clean any stale 'running' sync logs older than 2 minutes
    const TWO_MINUTES_AGO = new Date(Date.now() - 2 * 60 * 1000);
    await prisma.syncLog.updateMany({
      where: {
        status: 'running',
        startedAt: { lt: TWO_MINUTES_AGO },
      },
      data: {
        status: 'failed',
        errorMessage: 'Serverless Function Execution Timeout (Auto-cleaned)',
        finishedAt: new Date(),
      },
    });

    const latestLog = await prisma.syncLog.findFirst({
      orderBy: { startedAt: 'desc' },
    });
    return latestLog;
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return null;
  }
}
