'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Client } from '@notionhq/client';
import { decrypt } from '@/lib/encryption';

async function getNotionClient() {
  const activeConfig = await prisma.notionConfig.findFirst({
    where: { databases: { some: {} } },
  });
  if (!activeConfig) return null;
  const activeApiKey = decrypt(activeConfig.encryptedApiKey, activeConfig.iv);
  return new Client({ auth: activeApiKey });
}

export async function getTasksWithParameterIssuesAction() {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { taskMonth: null },
          { poolScore: null },
        ],
      },
      include: {
        designer: true,
        doctype: true,
        designStatus: true,
        taskAccounts: { include: { account: true } },
      },
      orderBy: { createdTime: 'desc' },
    });

    return { success: true, tasks: JSON.parse(JSON.stringify(tasks)) };
  } catch (error: any) {
    console.error('Failed to fetch parameter issue tasks:', error);
    return { success: false, error: error.message || 'Failed to fetch tasks with parameter issues' };
  }
}

export async function updateTaskParametersAction(
  taskIds: string[],
  data: { taskMonth?: string | null; poolScore?: number | null }
) {
  try {
    if (!taskIds || taskIds.length === 0) {
      return { success: false, error: 'No task IDs provided' };
    }

    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
    });

    if (tasks.length === 0) {
      return { success: false, error: 'No matching tasks found' };
    }

    const updateData: { taskMonth?: string | null; poolScore?: number | null } = {};
    if (data.taskMonth !== undefined) updateData.taskMonth = data.taskMonth;
    if (data.poolScore !== undefined) updateData.poolScore = data.poolScore;

    // 1. Update PostgreSQL
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: updateData,
    });

    // 2. Sync to Notion API for each task
    const notionClient = await getNotionClient();
    const notionSyncResults: Record<string, { success: boolean; error?: string }> = {};

    if (notionClient) {
      for (const task of tasks) {
        if (task.notionPageId.startsWith('sync_mock_page_')) {
          notionSyncResults[task.id] = { success: true };
          continue;
        }

        try {
          const propertiesToUpdate: any = {};
          if (data.taskMonth !== undefined) {
            propertiesToUpdate['Task Month'] = data.taskMonth
              ? { select: { name: data.taskMonth } }
              : { select: null };
          }
          if (data.poolScore !== undefined) {
            propertiesToUpdate['Pool Score'] = data.poolScore !== null
              ? { number: Number(data.poolScore) }
              : { number: null };
          }

          await notionClient.pages.update({
            page_id: task.notionPageId,
            properties: propertiesToUpdate,
          });

          notionSyncResults[task.id] = { success: true };
        } catch (notionErr: any) {
          console.error(`Notion sync failed for task ${task.id}:`, notionErr);
          notionSyncResults[task.id] = {
            success: false,
            error: notionErr.message || 'Failed to update Notion page',
          };
        }
      }
    } else {
      for (const id of taskIds) {
        notionSyncResults[id] = { success: false, error: 'Notion integration not configured' };
      }
    }

    revalidatePath('/production');
    return { success: true, notionSyncResults };
  } catch (error: any) {
    console.error('Failed to update task parameters:', error);
    return { success: false, error: error.message || 'Failed to update task parameters' };
  }
}

export async function retryNotionSyncAction(taskId: string) {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: 'Task not found' };

    if (task.notionPageId.startsWith('sync_mock_page_')) {
      return { success: true };
    }

    const notionClient = await getNotionClient();
    if (!notionClient) {
      return { success: false, error: 'Notion integration not configured' };
    }

    const propertiesToUpdate: any = {};
    if (task.taskMonth) {
      propertiesToUpdate['Task Month'] = { select: { name: task.taskMonth } };
    }
    if (task.poolScore !== null && task.poolScore !== undefined) {
      propertiesToUpdate['Pool Score'] = { number: Number(task.poolScore) };
    }

    await notionClient.pages.update({
      page_id: task.notionPageId,
      properties: propertiesToUpdate,
    });

    return { success: true };
  } catch (error: any) {
    console.error(`Retry Notion sync failed for task ${taskId}:`, error);
    return { success: false, error: error.message || 'Failed to sync to Notion' };
  }
}
