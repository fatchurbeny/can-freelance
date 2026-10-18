import type { Client } from '@notionhq/client';

/**
 * Serialised, coalescing push of a task body to its Notion page.
 *
 * - One push per page at a time (no concurrent delete/append races → no duplicated body).
 * - Saves arriving while a push runs are coalesced: only the latest body is pushed next.
 * - A body identical to the last pushed one is skipped.
 * - Pull-sync can ask `isBodyPushBusy(pageId)` to avoid reading a half-written page.
 *
 * State lives on globalThis so server actions and the cron route share it within one Node process.
 */

type BuildBlocks = (bodyText: string) => any[];

interface PageState {
  running: boolean;
  pending: { body: string | null; client: Client; build: BuildBlocks } | null;
  lastPushed?: string | null;
  lastFinishedAt: number;
}

const RECENT_PUSH_WINDOW_MS = 2 * 60 * 1000;

const g = globalThis as unknown as { __notionBodyPush?: Map<string, PageState> };
const pages: Map<string, PageState> = g.__notionBodyPush ?? (g.__notionBodyPush = new Map());

function stateFor(pageId: string): PageState {
  let s = pages.get(pageId);
  if (!s) {
    s = { running: false, pending: null, lastFinishedAt: 0 };
    pages.set(pageId, s);
  }
  return s;
}

export function isBodyPushBusy(pageId: string): boolean {
  const s = pages.get(pageId);
  if (!s) return false;
  return s.running || !!s.pending || Date.now() - s.lastFinishedAt < RECENT_PUSH_WINDOW_MS;
}

async function listAllChildIds(client: Client, pageId: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await client.blocks.children.list({ block_id: pageId, page_size: 100, start_cursor: cursor });
    for (const b of res.results ?? []) ids.push(b.id);
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return ids;
}

async function pushOnce(client: Client, pageId: string, body: string | null, build: BuildBlocks) {
  for (const id of await listAllChildIds(client, pageId)) {
    try {
      await client.blocks.delete({ block_id: id });
    } catch (err: any) {
      // Already archived/deleted → fine
      if (err?.code !== 'object_not_found' && err?.status !== 404) console.warn(`Failed to delete block ${id}:`, err?.message ?? err);
    }
  }
  if (body && body.trim()) {
    const blocks = build(body);
    for (let i = 0; i < blocks.length; i += 100) {
      await client.blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 100) });
    }
  }
}

export async function pushBodyToNotion(client: Client, pageId: string, body: string | null, build: BuildBlocks): Promise<void> {
  const s = stateFor(pageId);
  s.pending = { body, client, build };
  if (s.running) return; // the running loop will pick up the latest pending body

  s.running = true;
  try {
    while (s.pending) {
      const job = s.pending;
      s.pending = null;
      const normalized = job.body?.trim() || null;
      if (s.lastPushed !== undefined && normalized === s.lastPushed) continue;
      try {
        await pushOnce(job.client, pageId, job.body, job.build);
        s.lastPushed = normalized;
      } catch (err) {
        console.error('Failed to sync body blocks to Notion:', err);
        s.lastPushed = undefined; // unknown state → never skip the next push
      }
    }
  } finally {
    s.running = false;
    s.lastFinishedAt = Date.now();
  }
}
