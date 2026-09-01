import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { syncNotionData } from '@/lib/sync-notion';

// Maps syncInterval string values to milliseconds
const INTERVAL_MS: Record<string, number> = {
  '15_mins':  15 * 60 * 1000,
  '30_mins':  30 * 60 * 1000,
  '1_hour':   60 * 60 * 1000,
  '6_hours':  6  * 60 * 60 * 1000,
  '12_hours': 12 * 60 * 60 * 1000,
  '24_hours': 24 * 60 * 60 * 1000,
};

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function startOfJakartaDay(now = new Date()): Date {
  const jakartaTime = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  return new Date(Date.UTC(
    jakartaTime.getUTCFullYear(),
    jakartaTime.getUTCMonth(),
    jakartaTime.getUTCDate(),
  ) - JAKARTA_OFFSET_MS);
}

// Validates the optional CRON_SECRET bearer token / query param.
// Local development may omit it; deployed environments fail closed.
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === 'development';

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get('secret') === secret) return true;

  return false;
}

export async function GET(request: Request) {
  // Auth check
  if (!isAuthorized(request)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch scheduling config
    const config = await prisma.notionConfig.findFirst();
    if (!config) {
      return NextResponse.json({
        status: 'skipped',
        reason: 'No Notion configuration found.',
      });
    }

    if (!config.autoSync) {
      return NextResponse.json({
        status: 'skipped',
        reason: 'Auto sync is disabled. Enable it in Settings > Notion Config.',
      });
    }

    const intervalMs = INTERVAL_MS[config.syncInterval] ?? INTERVAL_MS['15_mins'];

    // 2. Auto-clean any stale 'running' sync logs older than 2 minutes (120,000 ms)
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

    // Prevent concurrent runs — check for any active 'running' log
    const runningLog = await prisma.syncLog.findFirst({
      where: { status: 'running' },
    });
    if (runningLog) {
      return NextResponse.json({
        status: 'skipped',
        reason: 'A sync is already in progress.',
        runningSince: runningLog.startedAt,
      });
    }

    // 3. Find last successful (or any finished) sync
    const lastLog = await prisma.syncLog.findFirst({
      where: { status: { in: ['success', 'failed'] } },
      orderBy: { finishedAt: 'desc' },
    });

    const now = Date.now();
    const lastFinished = lastLog?.finishedAt ? new Date(lastLog.finishedAt).getTime() : 0;
    const configUpdatedAt = config.updatedAt ? new Date(config.updatedAt).getTime() : 0;

    // If autoSync schedule was recently updated or enabled, ensure referenceStartTime triggers a full countdown
    const isConfigNewerThanLastSync = configUpdatedAt > lastFinished;
    const isConfigUpdatedWithinInterval = (now - configUpdatedAt) < intervalMs;
    
    // Choose reference start time: if config was just updated/enabled, count down from configUpdatedAt
    const referenceStartTime = (isConfigNewerThanLastSync || isConfigUpdatedWithinInterval)
      ? configUpdatedAt
      : Math.max(lastFinished, configUpdatedAt);

    const elapsed = now - referenceStartTime;

    if (elapsed < intervalMs) {
      const msRemaining = intervalMs - elapsed;
      const minutesRemaining = Math.ceil(msRemaining / 60000);
      return NextResponse.json({
        status: 'skipped',
        reason: `Next sync in ~${minutesRemaining} minute(s).`,
        nextSyncInMs: msRemaining,
        lastSyncedAt: lastLog?.finishedAt ?? null,
      });
    }

    // 4. Background auto-sync ALWAYS uses fast incremental mode to sync updated data only
    const result = await syncNotionData('incremental');

    return NextResponse.json({
      status: result.status,
      mode: 'incremental',
      recordsSynced: result.status === 'success' ? (result as any).recordsSynced : undefined,
      error: result.status === 'failed' ? (result as any).errorMessage : undefined,
      nextSyncInMs: intervalMs,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[cron] Sync error:', error);
    return NextResponse.json(
      { status: 'failed', error: error.message || String(error) },
      { status: 500 },
    );
  }
}
