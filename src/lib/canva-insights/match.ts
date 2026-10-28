import prisma from '@/lib/prisma';
import { extractDesignId } from './parse';

/**
 * Tautkan template Canva ke Task (docs/knowledge/canva-insights-spec.md §6):
 * 1. ID desain sumber (`I`) = ID desain di TaskCanvaLink.url / Task.outputUrl → "design_id".
 * 2. Judul ternormalisasi = Task.name, tepat satu kandidat di akun brand yang sama → "title".
 * Hanya template yang belum tertaut; tautan "manual" tidak pernah disentuh.
 */

export interface MatchSummary {
  designId: number;
  title: number;
  unmatched: number;
}

function normalizeTitle(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** designId → taskId; ID yang menunjuk ke lebih dari satu task dianggap ambigu (null). */
async function tasksByDesignId(designIds: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  if (designIds.length === 0) return result;
  const contains = designIds.map((id) => `/design/${id}`);
  const [links, outputs] = await Promise.all([
    prisma.taskCanvaLink.findMany({
      where: { OR: contains.map((c) => ({ url: { contains: c } })) },
      select: { taskId: true, url: true },
    }),
    prisma.task.findMany({
      where: { OR: contains.map((c) => ({ outputUrl: { contains: c } })) },
      select: { id: true, outputUrl: true },
    }),
  ]);
  const pairs = [
    ...links.map((l) => [extractDesignId(l.url), l.taskId] as const),
    ...outputs.map((t) => [extractDesignId(t.outputUrl), t.id] as const),
  ];
  for (const [designId, taskId] of pairs) {
    if (!designId) continue;
    const prev = result.get(designId);
    result.set(designId, prev === undefined || prev === taskId ? taskId : null);
  }
  return result;
}

/** Cocokkan template tertentu (atau semua yang belum tertaut bila `templateIds` kosong). */
export async function matchTemplates(templateIds?: string[]): Promise<MatchSummary> {
  const templates = await prisma.canvaTemplate.findMany({
    where: {
      taskId: null,
      OR: [{ matchMethod: null }, { matchMethod: { not: 'manual' } }],
      ...(templateIds ? { id: { in: templateIds } } : {}),
    },
    select: { id: true, sourceDesignId: true, title: true, accountId: true },
  });
  const summary: MatchSummary = { designId: 0, title: 0, unmatched: 0 };
  if (templates.length === 0) return summary;

  const byDesign = await tasksByDesignId(
    Array.from(new Set(templates.map((t) => t.sourceDesignId).filter((d): d is string => !!d))),
  );

  const accountIds = Array.from(new Set(templates.map((t) => t.accountId).filter((a): a is string => !!a)));
  const accountTasks = accountIds.length
    ? await prisma.task.findMany({
        where: { taskAccounts: { some: { accountId: { in: accountIds } } } },
        select: { id: true, name: true, taskAccounts: { select: { accountId: true } } },
      })
    : [];

  for (const t of templates) {
    let taskId = t.sourceDesignId ? byDesign.get(t.sourceDesignId) ?? null : null;
    let method: 'design_id' | 'title' | null = taskId ? 'design_id' : null;

    if (!taskId && t.accountId && t.title) {
      const title = normalizeTitle(t.title);
      const candidates = accountTasks.filter(
        (task) => normalizeTitle(task.name) === title && task.taskAccounts.some((a) => a.accountId === t.accountId),
      );
      if (candidates.length === 1) {
        taskId = candidates[0].id;
        method = 'title';
      }
    }

    if (!taskId || !method) {
      summary.unmatched++;
      continue;
    }
    await prisma.canvaTemplate.update({ where: { id: t.id }, data: { taskId, matchMethod: method } });
    summary[method === 'design_id' ? 'designId' : 'title']++;
  }
  return summary;
}
