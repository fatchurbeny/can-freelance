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

export async function updateTaskStatusAction(taskId: string, statusNotionKey: string) {
  try {
    const [status, task] = await Promise.all([
      prisma.designStatus.findUnique({ where: { notionKey: statusNotionKey } }),
      prisma.task.findUnique({ where: { id: taskId } }),
    ]);

    if (!status) return { success: false, error: `Status "${statusNotionKey}" not found` };
    if (!task) return { success: false, error: 'Task not found' };

    const isMockTask = task.notionPageId.startsWith('sync_mock_page_');
    if (!isMockTask) {
      const notionClient = await getNotionClient();
      if (!notionClient) {
        return { success: false, error: 'Notion integration is not configured' };
      }

      const page = await notionClient.pages.retrieve({ page_id: task.notionPageId });
      if (!('properties' in page) || page.parent.type !== 'data_source_id') {
        return { success: false, error: 'Notion task data source could not be resolved' };
      }

      const dataSource = await notionClient.dataSources.retrieve({
        data_source_id: page.parent.data_source_id,
      });
      const statusProperty = dataSource.properties['Design Status'];
      const statusOption = statusProperty?.type === 'status'
        ? statusProperty.status.options.find((option) => option.name === statusNotionKey)
        : null;

      if (!statusOption) {
        return { success: false, error: `Notion status "${statusNotionKey}" not found` };
      }

      const updatedPage = await notionClient.pages.update({
        page_id: task.notionPageId,
        properties: {
          'Design Status': {
            status: { id: statusOption.id },
          },
        },
      });
      const updatedStatus = 'properties' in updatedPage
        ? updatedPage.properties['Design Status']
        : null;

      if (updatedStatus?.type !== 'status' || updatedStatus.status?.name !== statusNotionKey) {
        return { success: false, error: 'Notion did not confirm the status change' };
      }
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { designStatusId: status.id },
    });

    revalidatePath('/production');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to update task status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task status',
    };
  }
}

export async function addCommentAction(taskId: string, content: string) {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: 'Task not found' };

    await prisma.taskComment.create({
      data: {
        taskId,
        content,
      },
    });

    // Sync to Notion
    try {
      const notionClient = await getNotionClient();
      if (notionClient && task.notionPageId && !task.notionPageId.startsWith('sync_mock_page_')) {
        await notionClient.comments.create({
          parent: { page_id: task.notionPageId },
          rich_text: [
            {
              text: { content }
            }
          ]
        });
      }
    } catch (notionErr) {
      console.error('Failed to sync comment to Notion:', notionErr);
    }

    revalidatePath('/production');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add comment' };
  }
}

export async function getTaskCommentsAction(taskId: string) {
  try {
    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
    return JSON.parse(JSON.stringify(comments));
  } catch (error: any) {
    return [];
  }
}

export async function deleteCommentAction(commentId: string) {
  try {
    await prisma.taskComment.delete({
      where: { id: commentId },
    });
    revalidatePath('/production');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete comment' };
  }
}
