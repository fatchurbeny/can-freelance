'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Client } from '@notionhq/client';
import { decrypt } from '@/lib/encryption';

async function getNotionClient() {
  let activeApiKey = process.env.NOTION_API_KEY || null;
  const dbConfig = await prisma.notionConfig.findFirst({
    where: { databases: { some: {} } },
  });
  if (dbConfig?.encryptedApiKey && dbConfig.iv) {
    try {
      const decrypted = decrypt(dbConfig.encryptedApiKey, dbConfig.iv);
      if (decrypted) activeApiKey = decrypted;
    } catch (err) {
      console.error('Failed to decrypt database-stored Notion API key:', err);
    }
  }
  if (!activeApiKey) return null;
  return new Client({ auth: activeApiKey });
}

async function updateNotionPayrollMonth(notionPageId: string, payrollMonth: string) {
  if (!notionPageId || notionPageId.startsWith('sync_mock_page_') || notionPageId.startsWith('notion_page_')) {
    return;
  }
  try {
    const notion = await getNotionClient();
    if (!notion) {
      console.warn(`Notion integration not configured. Skipped write-back for page ${notionPageId}`);
      return;
    }
    await notion.pages.update({
      page_id: notionPageId,
      properties: {
        'Payroll Month': {
          select: {
            name: payrollMonth,
          },
        },
      },
    });
  } catch (error: any) {
    console.error(`Failed to update Notion Payroll Month for page ${notionPageId}:`, error);
  }
}

export async function assignPayrollMonthAction(
  taskId: string,
  payrollMonth: string
) {
  try {
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { payrollMonth },
    });

    if (updatedTask?.notionPageId) {
      await updateNotionPayrollMonth(updatedTask.notionPageId, payrollMonth);
    }

    revalidatePath('/billing-statement');
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to assign payroll month.',
    };
  }
}

export async function batchAssignPayrollMonthAction(
  taskIds: string[],
  payrollMonth: string
) {
  try {
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, notionPageId: true },
    });

    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { payrollMonth },
    });

    // Update Notion pages in parallel
    await Promise.allSettled(
      tasks.map((task) =>
        task.notionPageId
          ? updateNotionPayrollMonth(task.notionPageId, payrollMonth)
          : Promise.resolve()
      )
    );

    revalidatePath('/billing-statement');
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to batch assign payroll months.',
    };
  }
}

