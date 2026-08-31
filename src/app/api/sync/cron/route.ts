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
    const configUpdatedAt = config.updatedAt ? new Date(config.updatedAt).getTime() : 0;
    
    // The reference start time for countdown calculation is the LATEST of the last finished sync OR when auto sync schedule was configured.
    // This ensures enabling or reconfiguring auto sync sets a countdown timer for the full interval rather than executing an instant sync.
    const referenceStartTime = Math.max(lastFinished, configUpdatedAt);
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

    // 4. First eligible automatic run each Jakarta day performs full reconciliation.
    const fullSyncToday = await prisma.syncLog.findFirst({
      where: {
        status: 'success',
        mode: 'full',
        startedAt: { gte: startOfJakartaDay() },
      },
      select: { id: true },
    });
    const mode = fullSyncToday ? 'incremental' : 'full';
    const result = await syncNotionData(mode);

    return NextResponse.json({
      status: result.status,
      mode,
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
