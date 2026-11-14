'use server';

import prisma from '@/lib/prisma';
import { getAccess } from '@/lib/access';

export interface DesignOutputItem {
  id: string;
  url: string;
  source: string;
  title: string | null;
  createdByCode: string | null;
  createdAt: number;
}

/** Desain hasil Deck/Doc improstd untuk satu task (tabel task_design_outputs), terbaru dulu. */
export async function getTaskDesignOutputsAction(taskId: string): Promise<DesignOutputItem[]> {
  const access = await getAccess();
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { productionUnitId: true } });
  if (!task) return [];
  if (access.enabled && (!access.user || !access.allows('kanban.view', task.productionUnitId))) return [];
  const rows = await prisma.taskDesignOutput.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' }, take: 20 });
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    source: r.source,
    title: r.title,
    createdByCode: r.createdByCode,
    createdAt: r.createdAt.getTime(),
  }));
}
