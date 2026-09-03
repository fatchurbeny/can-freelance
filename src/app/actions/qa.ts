'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Client } from '@notionhq/client';
import { decrypt } from '@/lib/encryption';
import { validateTemplateLink } from '@/lib/validate-template-link';
import { formatTaskMonthToDateString } from '@/lib/period-utils';

async function getNotionClientAndDatabase() {
  const activeConfig = await prisma.notionConfig.findFirst({
    include: { databases: true },
  });
  if (!activeConfig) return null;
  const activeApiKey = decrypt(activeConfig.encryptedApiKey, activeConfig.iv);
  if (!activeApiKey) return null;
  const dbId = activeConfig.databases[0]
    ? decrypt(activeConfig.databases[0].encryptedDatabaseId, activeConfig.databases[0].iv)
    : process.env.NOTION_DATABASE_ID || null;
  return {
    client: new Client({ auth: activeApiKey }),
    databaseId: dbId,
  };
}

async function getNotionClient() {
  const res = await getNotionClientAndDatabase();
  return res ? res.client : null;
}

function findNotionStatusOption(options: Array<{ id: string; name: string }>, targetKey: string) {
  if (!options || !targetKey) return null;
  const cleanTarget = targetKey.trim().toLowerCase();

  // 1. Direct exact or ID match (case-insensitive)
  const exact = options.find((opt) => opt.name.toLowerCase() === cleanTarget || opt.id === targetKey);
  if (exact) return exact;

  // 2. Normalized alphanumeric match (e.g. "in progress" vs "inprogress")
  const normTarget = cleanTarget.replace(/[^a-z0-9]/g, '');
  const normMatch = options.find((opt) => opt.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normTarget);
  if (normMatch) return normMatch;

  // 3. Known alias rules
  if (cleanTarget === 'qa' || cleanTarget.includes('q&a') || cleanTarget.includes('in qa') || cleanTarget.includes('quality assurance')) {
    const qaMatch = options.find((opt) => opt.name.toLowerCase().includes('qa'));
    if (qaMatch) return qaMatch;
  }

  if (cleanTarget.includes('aprov') || cleanTarget.includes('approv')) {
    if (cleanTarget.includes('profile')) {
      const profileMatch = options.find((opt) => opt.name.toLowerCase().includes('profile'));
      if (profileMatch) return profileMatch;
    } else {
      const approvedMatch = options.find(
        (opt) => (opt.name.toLowerCase().includes('aprov') || opt.name.toLowerCase().includes('approv')) && !opt.name.toLowerCase().includes('profile')
      );
      if (approvedMatch) return approvedMatch;
    }
  }

  if (cleanTarget.includes('not start') || cleanTarget === 'todo' || cleanTarget === 'to do') {
    const notStartedMatch = options.find((opt) => opt.name.toLowerCase().includes('not start'));
    if (notStartedMatch) return notStartedMatch;
  }

  if (cleanTarget.includes('progress') || cleanTarget.includes('doing') || cleanTarget.includes('working')) {
    const inProgMatch = options.find((opt) => opt.name.toLowerCase().includes('progress'));
    if (inProgMatch) return inProgMatch;
  }

  if (cleanTarget.includes('review')) {
    const reviewMatch = options.find((opt) => opt.name.toLowerCase().includes('review'));
    if (reviewMatch) return reviewMatch;
  }

  if (cleanTarget.includes('draft')) {
    const draftMatch = options.find((opt) => opt.name.toLowerCase().includes('draft'));
    if (draftMatch) return draftMatch;
  }

  if (cleanTarget.includes('reject')) {
    const rejectMatch = options.find((opt) => opt.name.toLowerCase().includes('reject'));
    if (rejectMatch) return rejectMatch;
  }

  return null;
}

async function getNotionDatabaseSchemaProperties(client: Client, databaseId: string): Promise<Record<string, any>> {
  try {
    const db: any = await client.databases.retrieve({ database_id: databaseId });
    if (db.properties && Object.keys(db.properties).length > 0) {
      return db.properties;
    }
    if (db.data_sources?.[0]?.id) {
      const ds: any = await (client as any).dataSources.retrieve({
        data_source_id: db.data_sources[0].id,
      });
      if (ds.properties) {
        return ds.properties;
      }
    }
    return db.properties || {};
  } catch (err) {
    console.warn('Failed to retrieve Notion database schema properties:', err);
    return {};
  }
}

async function getNotionPageStatusProperty(notionClient: Client, page: any) {
  try {
    if (page.parent?.type === 'data_source_id') {
      const dataSource: any = await notionClient.dataSources.retrieve({
        data_source_id: page.parent.data_source_id,
      });
      return dataSource.properties?.['Design Status'] || null;
    }
    if (page.parent?.type === 'database_id') {
      const db: any = await notionClient.databases.retrieve({
        database_id: page.parent.database_id,
      });
      if (db.properties?.['Design Status']) {
        return db.properties['Design Status'];
      }
      if (db.data_sources?.[0]?.id) {
        const ds: any = await notionClient.dataSources.retrieve({
          data_source_id: db.data_sources[0].id,
        });
        return ds.properties?.['Design Status'] || null;
      }
    }
  } catch (err) {
    console.warn('Failed to retrieve Notion status property from schema:', err);
  }
  return null;
}

function markdownToNotionBlocks(bodyText: string): any[] {
  if (!bodyText || !bodyText.trim()) return [];
  const lines = bodyText.split('\n');
  const blocks: any[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: line.replace(/^##\s+/, '') } }],
        },
      });
    } else if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: line.replace(/^###\s+/, '') } }],
        },
      });
    } else if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: line.replace(/^#\s+/, '') } }],
        },
      });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.replace(/^[-*]\s+/, '');
      const urlMatch = content.match(/^(https?:\/\/[^\s]+)$/i);
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content,
                link: urlMatch ? { url: urlMatch[1] } : undefined,
              },
            },
          ],
        },
      });
    } else {
      const urlMatch = line.match(/^(https?:\/\/[^\s]+)$/i);
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: rawLine,
                link: urlMatch ? { url: urlMatch[1] } : undefined,
              },
            },
          ],
        },
      });
    }
  }

  return blocks;
}

async function syncNotionPageBodyBlocks(client: Client, pageId: string, bodyText: string | null | undefined) {
  if (bodyText === undefined) return;
  try {
    const existing = await client.blocks.children.list({ block_id: pageId, page_size: 100 });
    if (existing.results && existing.results.length > 0) {
      for (const block of existing.results) {
        try {
          await client.blocks.delete({ block_id: block.id });
        } catch (delErr) {
          console.warn(`Failed to delete block ${block.id}:`, delErr);
        }
      }
    }

    if (bodyText && bodyText.trim()) {
      const newBlocks = markdownToNotionBlocks(bodyText);
      if (newBlocks.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < newBlocks.length; i += chunkSize) {
          const chunk = newBlocks.slice(i, i + chunkSize);
          await client.blocks.children.append({
            block_id: pageId,
            children: chunk,
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to sync body blocks to Notion:', err);
  }
}

async function findPrismaDesignStatus(statusKey: string) {
  // 1. Direct search (case-insensitive)
  let status = await prisma.designStatus.findFirst({
    where: {
      OR: [
        { notionKey: { equals: statusKey, mode: 'insensitive' } },
        { displayName: { equals: statusKey, mode: 'insensitive' } },
      ],
    },
  });
  if (status) return status;

  // 2. Alias mapping fallback
  const clean = statusKey.toLowerCase();
  if (clean.includes('qa') || clean.includes('q&a')) {
    status = await prisma.designStatus.findFirst({
      where: {
        OR: [
          { notionKey: { contains: 'QA', mode: 'insensitive' } },
          { displayName: { contains: 'QA', mode: 'insensitive' } },
        ],
      },
    });
  } else if (clean.includes('aprov') || clean.includes('approv')) {
    const isProfile = clean.includes('profile');
    status = await prisma.designStatus.findFirst({
      where: isProfile
        ? { notionKey: { contains: 'Profile', mode: 'insensitive' } }
        : {
            AND: [
              { notionKey: { contains: 'aprov', mode: 'insensitive' } },
              { NOT: { notionKey: { contains: 'Profile', mode: 'insensitive' } } },
            ],
          },
    });
  } else if (clean.includes('progress')) {
    status = await prisma.designStatus.findFirst({
      where: { notionKey: { contains: 'Progress', mode: 'insensitive' } },
    });
  } else if (clean.includes('start')) {
    status = await prisma.designStatus.findFirst({
      where: { notionKey: { contains: 'Start', mode: 'insensitive' } },
    });
  } else if (clean.includes('review')) {
    status = await prisma.designStatus.findFirst({
      where: { notionKey: { contains: 'Review', mode: 'insensitive' } },
    });
  } else if (clean.includes('draft')) {
    status = await prisma.designStatus.findFirst({
      where: { notionKey: { contains: 'Draft', mode: 'insensitive' } },
    });
  } else if (clean.includes('reject')) {
    status = await prisma.designStatus.findFirst({
      where: { notionKey: { contains: 'Reject', mode: 'insensitive' } },
    });
  }
  return status;
}

export async function updateTaskStatusAction(taskId: string, statusNotionKey: string) {
  try {
    const [status, task] = await Promise.all([
      findPrismaDesignStatus(statusNotionKey),
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
      if (!('properties' in page)) {
        return { success: false, error: 'Notion task page could not be resolved' };
      }

      const statusProperty = await getNotionPageStatusProperty(notionClient, page);
      const statusOption = statusProperty?.type === 'status' && statusProperty.status?.options
        ? findNotionStatusOption(statusProperty.status.options, status.notionKey || status.displayName || statusNotionKey)
        : null;

      const statusPayload = statusOption
        ? { id: statusOption.id }
        : { name: status.notionKey || status.displayName || statusNotionKey };

      const updatedPage = await notionClient.pages.update({
        page_id: task.notionPageId,
        properties: {
          'Design Status': {
            status: statusPayload,
          },
        },
      });

      const updatedStatus = 'properties' in updatedPage
        ? updatedPage.properties['Design Status']
        : null;

      if (
        statusOption &&
        updatedStatus?.type === 'status' &&
        updatedStatus.status?.id !== statusOption.id &&
        updatedStatus.status?.name.toLowerCase() !== statusOption.name.toLowerCase()
      ) {
        return { success: false, error: 'Notion did not confirm the status change' };
      }
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { designStatusId: status.id },
    });

    try {
      revalidatePath('/production');
    } catch {
      // Ignore if called outside request context
    }
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

export interface CreateTaskPayload {
  name: string;
  notionUrl?: string | null;
  designerId?: string | null;
  doctypeId?: string | null;
  designStatusId?: string | null;
  qtySubmit?: number | null;
  pages?: number | null;
  priority?: string | null;
  license?: string | null;
  taskMonth?: string | null;
  bodyText?: string | null;
  languages?: string[];
  accountIds?: string[];
  canvaLinks?: string[];
}

export async function createTaskAction(payload: CreateTaskPayload) {
  try {
    const name = payload.name.trim();
    if (!name) return { success: false, error: 'Task name is required' };

    const validatedCanvaLinks = payload.canvaLinks?.length
      ? payload.canvaLinks.map((url) => validateTemplateLink(url)).filter((l) => l.ok && l.normalizedUrl)
      : [];

    const effectiveQtySubmit = payload.qtySubmit != null && Number(payload.qtySubmit) > 0 ? Number(payload.qtySubmit) : 1;
    let effectivePages = payload.pages ?? null;
    let poolScore: number | null = null;

    if (payload.doctypeId) {
      const doc = await prisma.doctype.findUnique({ where: { id: payload.doctypeId } });
      if (doc) {
        if (effectivePages == null && doc.pages != null) {
          effectivePages = Number(doc.pages);
        }
        const poolRate = doc.poolRate != null ? Number(doc.poolRate) : 1.0;
        poolScore = poolRate * effectiveQtySubmit;
      }
    } else {
      poolScore = 1.0 * effectiveQtySubmit;
    }

    let designStatusIdToUse = payload.designStatusId || null;
    let selectedStatus: any = null;
    if (designStatusIdToUse) {
      selectedStatus = await prisma.designStatus.findUnique({ where: { id: designStatusIdToUse } });
    }
    if (!selectedStatus) {
      selectedStatus = await prisma.designStatus.findFirst({
        where: { notionKey: { in: ['Draft', 'draft', 'Not Started', 'Not started', 'QA', 'qa'] } },
      }) || await prisma.designStatus.findFirst();
      if (selectedStatus) {
        designStatusIdToUse = selectedStatus.id;
      }
    }

    let selectedDoctype: any = null;
    if (payload.doctypeId) {
      selectedDoctype = await prisma.doctype.findUnique({ where: { id: payload.doctypeId } });
    }

    let selectedDesigner: any = null;
    if (payload.designerId) {
      selectedDesigner = await prisma.designer.findUnique({ where: { id: payload.designerId } });
    }

    let selectedAccounts: any[] = [];
    if (payload.accountIds && payload.accountIds.length > 0) {
      selectedAccounts = await prisma.account.findMany({ where: { id: { in: payload.accountIds } } });
    }

    // Attempt to create page in Notion API
    let createdNotionPageId = `app_created_${Date.now()}`;
    let createdNotionUrl: string | null = payload.notionUrl?.trim() || null;

    const notionConfig = await getNotionClientAndDatabase();
    if (notionConfig && notionConfig.databaseId) {
      try {
        const schemaProps = await getNotionDatabaseSchemaProperties(notionConfig.client, notionConfig.databaseId);
        const notionProperties: any = {
          Name: { title: [{ text: { content: name } }] },
        };

        // QTY-Submit
        if (schemaProps['QTY-Submit']) {
          notionProperties['QTY-Submit'] = { number: effectiveQtySubmit };
        } else if (schemaProps['QTY Submit']) {
          notionProperties['QTY Submit'] = { number: effectiveQtySubmit };
        }

        // Pages
        if (effectivePages !== null && schemaProps['Pages']) {
          notionProperties['Pages'] = { number: Number(effectivePages) };
        }

        // Pool Score
        if (poolScore !== null && schemaProps['Pool Score']) {
          notionProperties['Pool Score'] = { number: Number(poolScore) };
        }

        // Task Month
        if (payload.taskMonth && schemaProps['Task Month']) {
          if (schemaProps['Task Month'].type === 'date') {
            const dateStr = formatTaskMonthToDateString(payload.taskMonth);
            if (dateStr) notionProperties['Task Month'] = { date: { start: dateStr } };
          } else {
            notionProperties['Task Month'] = { select: { name: payload.taskMonth } };
          }
        }

        // Priority
        if (payload.priority && schemaProps['Priority']) {
          notionProperties['Priority'] = { select: { name: payload.priority } };
        }

        // License
        if (payload.license && schemaProps['License']) {
          notionProperties['License'] = { select: { name: payload.license } };
        }

        // Doctype
        if (selectedDoctype?.displayName && schemaProps['Doctype']) {
          notionProperties['Doctype'] = { select: { name: selectedDoctype.displayName } };
        }

        // Design Status
        if (selectedStatus && schemaProps['Design Status']) {
          const statusOption = schemaProps['Design Status']?.status?.options
            ? findNotionStatusOption(schemaProps['Design Status'].status.options, selectedStatus.notionKey || selectedStatus.displayName)
            : null;
          notionProperties['Design Status'] = statusOption
            ? { status: { id: statusOption.id } }
            : { status: { name: selectedStatus.notionKey } };
        }

        // Designer
        if (selectedDesigner?.displayName && schemaProps['Designer']) {
          notionProperties['Designer'] = { select: { name: selectedDesigner.displayName } };
          if (selectedDesigner.status && schemaProps['Designer Status']) {
            notionProperties['Designer Status'] = { select: { name: selectedDesigner.status } };
          }
        }

        // IND/ENG
        if (payload.languages && payload.languages.length > 0) {
          if (schemaProps['IND/ENG']) {
            notionProperties['IND/ENG'] = { multi_select: payload.languages.map((l) => ({ name: l })) };
          } else if (schemaProps['IND\\ENG']) {
            notionProperties['IND\\ENG'] = { multi_select: payload.languages.map((l) => ({ name: l })) };
          }
        }

        // Brand / Account
        if (selectedAccounts && selectedAccounts.length > 0) {
          if (schemaProps['Brand']) {
            notionProperties['Brand'] = { multi_select: selectedAccounts.map((a) => ({ name: a.displayName })) };
          } else if (schemaProps['Account']) {
            notionProperties['Account'] = { multi_select: selectedAccounts.map((a) => ({ name: a.displayName })) };
          }
        }

        // Template Link
        const templateLinkUrl = validatedCanvaLinks[0]?.normalizedUrl || payload.notionUrl?.trim() || null;
        if (templateLinkUrl && schemaProps['Template Link']) {
          if (schemaProps['Template Link'].type === 'files') {
            notionProperties['Template Link'] = {
              files: [{ name: 'Template Link', external: { url: templateLinkUrl } }],
            };
          } else {
            notionProperties['Template Link'] = { url: templateLinkUrl };
          }
        }

        const newNotionPage: any = await notionConfig.client.pages.create({
          parent: { database_id: notionConfig.databaseId },
          properties: notionProperties,
        });

        if (newNotionPage && newNotionPage.id) {
          createdNotionPageId = newNotionPage.id;
          if (newNotionPage.url) {
            createdNotionUrl = newNotionPage.url;
          }

          if (payload.bodyText) {
            try {
              const blocks = markdownToNotionBlocks(payload.bodyText);
              if (blocks.length > 0) {
                const chunkSize = 100;
                for (let i = 0; i < blocks.length; i += chunkSize) {
                  const chunk = blocks.slice(i, i + chunkSize);
                  await notionConfig.client.blocks.children.append({
                    block_id: newNotionPage.id,
                    children: chunk,
                  });
                }
              }
            } catch (bErr) {
              console.error('Failed to append body blocks to Notion:', bErr);
            }
          }
        }
      } catch (notionErr) {
        console.error('Failed to create page in Notion API:', notionErr);
      }
    }

    const task = await prisma.task.create({
      data: {
        name,
        notionPageId: createdNotionPageId,
        notionUrl: createdNotionUrl,
        designer: payload.designerId ? { connect: { id: payload.designerId } } : undefined,
        doctype: payload.doctypeId ? { connect: { id: payload.doctypeId } } : undefined,
        designStatus: designStatusIdToUse ? { connect: { id: designStatusIdToUse } } : undefined,
        qtySubmit: effectiveQtySubmit,
        pages: effectivePages ?? 0,
        poolScore: poolScore ?? null,
        priority: payload.priority || 'Medium',
        license: payload.license || 'Free',
        taskMonth: payload.taskMonth?.trim() || null,
        bodyText: payload.bodyText || null,
        languages: payload.languages || [],
        taskAccounts: payload.accountIds?.length
          ? {
              create: payload.accountIds.map((accountId) => ({ accountId })),
            }
          : undefined,
        canvaLinks: validatedCanvaLinks.length
          ? {
              create: validatedCanvaLinks.map((l) => ({ url: l.normalizedUrl! })),
            }
          : undefined,
        createdTime: new Date(),
        lastEditedTime: new Date(),
      },
    });

    revalidatePath('/production');
    return { success: true, taskId: task.id };
  } catch (error: unknown) {
    console.error('Failed to create task:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create task' };
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

export interface TaskUpdatePayload {
  name?: string;
  designerId?: string | null;
  doctypeId?: string | null;
  designStatusId?: string | null;
  qtySubmit?: number | null;
  pages?: number | null;
  priority?: string | null;
  license?: string | null;
  taskMonth?: string | null;
  bodyText?: string | null;
  languages?: string[];
  accountIds?: string[];
  canvaLinks?: string[];
}

export async function updateTaskFieldsAction(taskId: string, payload: TaskUpdatePayload) {
  try {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        designer: true,
        doctype: true,
        designStatus: true,
      },
    });

    if (!existingTask) return { success: false, error: 'Task not found' };

    const updateData: any = {
      lastEditedTime: new Date(),
    };

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.designerId !== undefined) {
      updateData.designer = payload.designerId ? { connect: { id: payload.designerId } } : { disconnect: true };
    }
    if (payload.doctypeId !== undefined) {
      updateData.doctype = payload.doctypeId ? { connect: { id: payload.doctypeId } } : { disconnect: true };
    }
    if (payload.designStatusId !== undefined) {
      updateData.designStatus = payload.designStatusId ? { connect: { id: payload.designStatusId } } : { disconnect: true };
    }
    if (payload.qtySubmit !== undefined) updateData.qtySubmit = payload.qtySubmit;
    if (payload.pages !== undefined) updateData.pages = payload.pages;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.license !== undefined) updateData.license = payload.license;
    if (payload.taskMonth !== undefined) updateData.taskMonth = payload.taskMonth;
    if (payload.bodyText !== undefined) updateData.bodyText = payload.bodyText;
    if (payload.languages !== undefined) updateData.languages = payload.languages;

    // Recalculate poolScore if doctypeId or pages is updated
    const targetDoctypeId = payload.doctypeId !== undefined ? payload.doctypeId : existingTask.doctypeId;
    const targetPages = payload.pages !== undefined ? payload.pages : (existingTask.pages != null ? Number(existingTask.pages) : null);

    if (targetDoctypeId) {
      const doc = await prisma.doctype.findUnique({ where: { id: targetDoctypeId } });
      if (doc) {
        let effectivePages = targetPages;
        if (effectivePages == null && doc.pages != null) {
          effectivePages = Number(doc.pages);
          updateData.pages = effectivePages;
        }
        const poolRate = doc.poolRate != null ? Number(doc.poolRate) : 1.0;
        const effectiveQty = existingTask.qtySubmit != null ? Number(existingTask.qtySubmit) : 1;
        updateData.poolScore = poolRate * effectiveQty;
      }
    } else {
      const effectiveQty = existingTask.qtySubmit != null ? Number(existingTask.qtySubmit) : 1;
      updateData.poolScore = 1.0 * effectiveQty;
    }

    // Handle account relations if provided
    if (payload.accountIds !== undefined) {
      await prisma.taskAccount.deleteMany({ where: { taskId } });
      if (payload.accountIds.length > 0) {
        await prisma.taskAccount.createMany({
          data: payload.accountIds.map((accountId) => ({
            taskId,
            accountId,
          })),
        });
      }
    }

    // Handle Canva links if provided
    if (payload.canvaLinks !== undefined) {
      const validatedLinks = payload.canvaLinks.map((url) => validateTemplateLink(url));
      const invalidLink = validatedLinks.find((link) => !link.ok);
      if (invalidLink) {
        return { success: false, error: invalidLink.message || 'Invalid Canva link' };
      }

      await prisma.taskCanvaLink.deleteMany({ where: { taskId } });
      if (validatedLinks.length > 0) {
        await prisma.taskCanvaLink.createMany({
          data: validatedLinks.map((link) => ({
            taskId,
            url: link.normalizedUrl!,
          })),
        });
      }
    }

    await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    // Best-effort Notion sync if applicable
    const isMockTask = existingTask.notionPageId.startsWith('sync_mock_page_');
    if (!isMockTask) {
      try {
        const notionClient = await getNotionClient();
        if (notionClient) {
          const page: any = await notionClient.pages.retrieve({ page_id: existingTask.notionPageId });
          const schemaProps = page.properties || {};
          const notionProperties: any = {};

          if (payload.name !== undefined && schemaProps['Name']) {
            notionProperties['Name'] = {
              title: [{ text: { content: payload.name || '' } }],
            };
          }
          if (payload.qtySubmit !== undefined) {
            if (schemaProps['QTY-Submit']) {
              notionProperties['QTY-Submit'] = { number: payload.qtySubmit ?? null };
            } else if (schemaProps['QTY Submit']) {
              notionProperties['QTY Submit'] = { number: payload.qtySubmit ?? null };
            }
          }
          if ((payload.pages !== undefined || updateData.pages !== undefined) && schemaProps['Pages']) {
            notionProperties['Pages'] = { number: updateData.pages ?? payload.pages ?? null };
          }
          if (updateData.poolScore !== undefined && schemaProps['Pool Score']) {
            notionProperties['Pool Score'] = { number: Number(updateData.poolScore) };
          }
          if (payload.taskMonth !== undefined && schemaProps['Task Month']) {
            if (schemaProps['Task Month'].type === 'date') {
              const dateStr = formatTaskMonthToDateString(payload.taskMonth);
              notionProperties['Task Month'] = dateStr ? { date: { start: dateStr } } : { date: null };
            } else {
              notionProperties['Task Month'] = payload.taskMonth ? { select: { name: payload.taskMonth } } : { select: null };
            }
          }
          if (payload.priority !== undefined && schemaProps['Priority']) {
            notionProperties['Priority'] = payload.priority
              ? { select: { name: payload.priority } }
              : { select: null };
          }
          if (payload.license !== undefined && schemaProps['License']) {
            notionProperties['License'] = payload.license
              ? { select: { name: payload.license } }
              : { select: null };
          }

          // Sync Design Status
          if (payload.designStatusId !== undefined && schemaProps['Design Status']) {
            if (payload.designStatusId) {
              const statusRecord = await prisma.designStatus.findUnique({ where: { id: payload.designStatusId } });
              if (statusRecord) {
                const statusProperty = await getNotionPageStatusProperty(notionClient, page);
                const statusOption = statusProperty?.type === 'status' && statusProperty.status?.options
                  ? findNotionStatusOption(statusProperty.status.options, statusRecord.notionKey || statusRecord.displayName)
                  : null;
                notionProperties['Design Status'] = statusOption
                  ? { status: { id: statusOption.id } }
                  : { status: { name: statusRecord.displayName || statusRecord.notionKey } };
              }
            }
          }

          // Sync Designer
          if (payload.designerId !== undefined && schemaProps['Designer']) {
            if (payload.designerId) {
              const designerRecord = await prisma.designer.findUnique({ where: { id: payload.designerId } });
              if (designerRecord) {
                notionProperties['Designer'] = { select: { name: designerRecord.displayName } };
                if (designerRecord.status && schemaProps['Designer Status']) {
                  notionProperties['Designer Status'] = { select: { name: designerRecord.status } };
                }
              }
            } else {
              notionProperties['Designer'] = { select: null };
            }
          }

          // Sync Doctype
          if (payload.doctypeId !== undefined && schemaProps['Doctype']) {
            if (payload.doctypeId) {
              const doctypeRecord = await prisma.doctype.findUnique({ where: { id: payload.doctypeId } });
              if (doctypeRecord) {
                notionProperties['Doctype'] = { select: { name: doctypeRecord.displayName } };
              }
            } else {
              notionProperties['Doctype'] = { select: null };
            }
          }

          // Sync Brand / Account
          if (payload.accountIds !== undefined) {
            const targetProp = schemaProps['Brand'] ? 'Brand' : schemaProps['Account'] ? 'Account' : null;
            if (targetProp) {
              if (payload.accountIds.length > 0) {
                const accounts = await prisma.account.findMany({ where: { id: { in: payload.accountIds } } });
                const acctList = accounts.map((a) => ({ name: a.displayName }));
                notionProperties[targetProp] = { multi_select: acctList };
              } else {
                notionProperties[targetProp] = { multi_select: [] };
              }
            }
          }

          // Sync Languages
          if (payload.languages !== undefined) {
            const targetLangProp = schemaProps['IND/ENG'] ? 'IND/ENG' : schemaProps['IND\\ENG'] ? 'IND\\ENG' : null;
            if (targetLangProp) {
              const langList = (payload.languages || []).map((l) => ({ name: l }));
              notionProperties[targetLangProp] = { multi_select: langList };
            }
          }

          // Sync Template Link
          if (payload.canvaLinks !== undefined && schemaProps['Template Link']) {
            const linkUrl = payload.canvaLinks[0] || null;
            if (schemaProps['Template Link'].type === 'files') {
              notionProperties['Template Link'] = linkUrl
                ? { files: [{ name: 'Template Link', external: { url: linkUrl } }] }
                : { files: [] };
            } else {
              notionProperties['Template Link'] = { url: linkUrl };
            }
          }

          if (Object.keys(notionProperties).length > 0) {
            await notionClient.pages.update({
              page_id: existingTask.notionPageId,
              properties: notionProperties,
            });
          }

          if (payload.bodyText !== undefined) {
            await syncNotionPageBodyBlocks(notionClient, existingTask.notionPageId, payload.bodyText);
          }
        }
      } catch (notionErr) {
        console.error('Failed to sync updated fields to Notion:', notionErr);
      }
    }

    try {
      revalidatePath('/production');
    } catch {
      // Ignore if called outside request context
    }
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update task fields:', error);
    return { success: false, error: error.message || 'Failed to update task fields' };
  }
}

export async function fetchTaskMetadataOptionsAction() {
  try {
    const [designers, doctypes, designStatuses, accounts] = await Promise.all([
      prisma.designer.findMany({
        where: { status: 'Active' },
        select: { id: true, displayName: true, avatarColor: true },
        orderBy: { displayName: 'asc' },
      }),
      prisma.doctype.findMany({
        select: { id: true, displayName: true, pages: true, poolRate: true, _count: { select: { tasks: true } } },
        orderBy: [
          { tasks: { _count: 'desc' } },
          { displayName: 'asc' },
        ],
      }),
      prisma.designStatus.findMany({
        select: { id: true, displayName: true, notionKey: true },
        orderBy: { displayName: 'asc' },
      }),
      prisma.account.findMany({
        select: { id: true, displayName: true, color: true },
        orderBy: { displayName: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: JSON.parse(
        JSON.stringify({
          designers,
          doctypes,
          designStatuses,
          accounts,
        })
      ),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch task metadata options' };
  }
}

export async function duplicateTaskAction(taskId: string) {
  try {
    if (!taskId) return { success: false, error: 'Task ID is required' };

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        taskAccounts: true,
        canvaLinks: true,
      },
    });

    if (!existingTask) return { success: false, error: 'Task not found' };

    const originalName = existingTask.name || 'Untitled Task';
    const duplicatedName = `${originalName} (Copy)`;

    const accountIds = existingTask.taskAccounts.map((ta) => ta.accountId);
    const canvaLinkUrls = existingTask.canvaLinks.map((cl) => cl.url);

    const result = await createTaskAction({
      name: duplicatedName,
      designerId: existingTask.designerId || undefined,
      doctypeId: existingTask.doctypeId || undefined,
      designStatusId: existingTask.designStatusId || undefined,
      accountIds,
      canvaLinks: canvaLinkUrls,
      qtySubmit: existingTask.qtySubmit != null ? Number(existingTask.qtySubmit) : 1,
      pages: existingTask.pages != null ? Number(existingTask.pages) : undefined,
      priority: existingTask.priority || undefined,
      license: existingTask.license || undefined,
      languages: existingTask.languages || undefined,
      taskMonth: existingTask.taskMonth || undefined,
      bodyText: existingTask.bodyText || undefined,
    });

    if (result.success) {
      revalidatePath('/production');
      revalidatePath('/');
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to duplicate task' };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    if (!taskId) return { success: false, error: 'Task ID is required' };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) return { success: false, error: 'Task not found' };

    if (task.notionPageId && !task.notionPageId.startsWith('app_created_') && !task.notionPageId.startsWith('sync_mock_page_')) {
      const notionConfig = await getNotionClientAndDatabase();
      if (notionConfig) {
        try {
          await notionConfig.client.pages.update({
            page_id: task.notionPageId,
            archived: true,
          });
        } catch (notionErr) {
          console.warn(`Failed to archive Notion page ${task.notionPageId}:`, notionErr);
        }
      }
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    revalidatePath('/production');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete task' };
  }
}


