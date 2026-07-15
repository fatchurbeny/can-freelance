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

// Validates the optional CRON_SECRET bearer token / query param
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // No secret configured — open (fine for local dev)

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

    // 2. Prevent concurrent runs — check for a 'running' log started within the last 15 min
    const STALE_THRESHOLD_MS = 15 * 60 * 1000;
    const runningLog = await prisma.syncLog.findFirst({
      where: {
        status: 'running',
        startedAt: { gte: new Date(Date.now() - STALE_THRESHOLD_MS) },
      },
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
    const elapsed = now - lastFinished;

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

    // 4. Trigger sync
    const result = await syncNotionData();

    return NextResponse.json({
      status: result.status,
      recordsSynced: result.status === 'success' ? (result as any).recordsSynced : undefined,
      error: result.status === 'failed' ? (result as any).errorMessage : undefined,
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
