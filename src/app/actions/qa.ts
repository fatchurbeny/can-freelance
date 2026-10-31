'use server';

import { assertCanEditTask, assertPermission, getAccess, denyUnless, denyWrite } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Prisma } from '../../../generated/prisma';
import { revalidatePath } from 'next/cache';
import { Client } from '@notionhq/client';
import { decrypt } from '@/lib/encryption';
import { validateTemplateLink } from '@/lib/validate-template-link';
import { formatTaskMonthToDateString } from '@/lib/period-utils';
import { orderBriefMarkdown } from '@/components/task-detail/brief-parser';
import { markdownToNotionBlocks } from '@/lib/notion-body-blocks';
import { isBodyPushBusy, pushBodyToNotion } from '@/lib/notion-body-push';
import { runInBackground } from '@/lib/background-sync';
import { attachUploadRequest } from '@/lib/dropbox-output';
import { scanDropboxChecklists } from '@/lib/dropbox-checklist';
import { readSnapshot } from '@/lib/dropbox-files';
import { resolveWriteName, type FieldKey, type FieldMapping } from '@/lib/production-field-mapping';
import { customFieldProperties, titlePropertyName } from '@/lib/notion-task-properties';
import { assetsRelationProperty, resolveBriefAssets, syncTaskAssetLinks } from '@/lib/notion-assets';
import {
  buildChecklistSection, checklistGateError, ensureChecklistSection, extractChecklistSection,
  isPreWorkStatus, isQaStatus, mergeChecklistSection, setChecklistItem,
} from '@/lib/checklist-qa';
import { parseNotionBlocksToMarkdown } from '@/lib/sync-notion';
import { DROPBOX_LINK_PROPERTY, UPLOAD_LINK_PROPERTY } from '@/lib/notion-field-types';
import { APP_CREATED_PREFIX, isMissingNotionPage, isNotionLinked } from '@/lib/notion-link';

async function getNotionClientAndDatabase(databaseIdOverride?: string | null) {
  const activeConfig = await prisma.notionConfig.findFirst({
    include: { databases: { where: { archived: false } } },
  });
  if (!activeConfig) return null;
  const activeApiKey = decrypt(activeConfig.encryptedApiKey, activeConfig.iv);
  if (!activeApiKey) return null;
  const dbId = databaseIdOverride
    || (activeConfig.databases[0]
      ? decrypt(activeConfig.databases[0].encryptedDatabaseId, activeConfig.databases[0].iv)
      : process.env.NOTION_DATABASE_ID || null);
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

async function getNotionPageStatusProperty(notionClient: Client, page: any, propertyName = 'Design Status') {
  try {
    if (page.parent?.type === 'data_source_id') {
      const dataSource: any = await notionClient.dataSources.retrieve({
        data_source_id: page.parent.data_source_id,
      });
      return dataSource.properties?.[propertyName] || null;
    }
    if (page.parent?.type === 'database_id') {
      const db: any = await notionClient.databases.retrieve({
        database_id: page.parent.database_id,
      });
      if (db.properties?.[propertyName]) {
        return db.properties[propertyName];
      }
      if (db.data_sources?.[0]?.id) {
        const ds: any = await notionClient.dataSources.retrieve({
          data_source_id: db.data_sources[0].id,
        });
        return ds.properties?.[propertyName] || null;
      }
    }
  } catch (err) {
    console.warn('Failed to retrieve Notion status property from schema:', err);
  }
  return null;
}

async function syncNotionPageBodyBlocks(client: Client, pageId: string, bodyText: string | null | undefined) {
  if (bodyText === undefined) return;
  // Serialised + coalesced per page (see notion-body-push.ts) — prevents duplicated bodies
  await pushBodyToNotion(client, pageId, bodyText, markdownToNotionBlocks);
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
    await assertCanEditTask(taskId);
    const [status, task] = await Promise.all([
      findPrismaDesignStatus(statusNotionKey),
      prisma.task.findUnique({
        where: { id: taskId },
        include: {
          designStatus: true,
          doctype: { select: { qaChecklist: true } },
          productionUnit: { select: { fieldMapping: true, platform: { select: { outputType: true } } } },
        },
      }),
    ]);

    if (!status) return { success: false, error: `Status "${statusNotionKey}" not found` };
    if (!task) return { success: false, error: 'Task not found' };

    // Checklist QA (production Dropbox): QA → In Review hanya bila semua item tercentang
    const isDropbox = task.productionUnit.platform.outputType === 'dropbox_link';
    const required = task.doctype?.qaChecklist ?? [];
    const gateError = checklistGateError({ isDropbox, current: task.designStatus, target: status, bodyText: task.bodyText, required });
    if (gateError) return { success: false, error: gateError };

    // Task lama tanpa section: buat saat masuk QA
    const checklistBody = isDropbox && isQaStatus(status) ? ensureChecklistSection(task.bodyText, required) : task.bodyText;
    const bodyChanged = (checklistBody ?? null) !== (task.bodyText ?? null);

    // 1. Immediately update local database for instant response
    await prisma.task.update({
      where: { id: taskId },
      data: {
        designStatusId: status.id,
        lastEditedTime: new Date(),
        ...(bodyChanged ? { bodyText: checklistBody } : {}),
      },
    });

    // Masuk QA: periksa folder Dropbox sekarang (centang format yang sudah diunggah)
    if (isDropbox && isQaStatus(status)) runInBackground('dropbox-checklist-scan', async () => { await scanDropboxChecklists([taskId]); });

    // 2. Offload international Notion API network call to background
    if (isNotionLinked(task.notionPageId)) {
      runInBackground(`Update Notion Status for Task ${task.name || taskId}`, async () => {
        const notionClient = await getNotionClient();
        if (!notionClient) return;

        const page = await notionClient.pages.retrieve({ page_id: task.notionPageId });
        if (!('properties' in page)) return;

        const statusKey = resolveWriteName(page.properties, 'designStatus', task.productionUnit.fieldMapping as FieldMapping);
        if (!statusKey) return;
        const statusProperty = await getNotionPageStatusProperty(notionClient, page, statusKey);
        const statusOption = statusProperty?.type === 'status' && statusProperty.status?.options
          ? findNotionStatusOption(statusProperty.status.options, status.notionKey || status.displayName || statusNotionKey)
          : null;

        const statusPayload = statusOption
          ? { id: statusOption.id }
          : { name: status.notionKey || status.displayName || statusNotionKey };

        await notionClient.pages.update({
          page_id: task.notionPageId,
          properties: {
            [statusKey]: {
              status: statusPayload,
            },
          },
        });

        if (bodyChanged) await syncNotionPageBodyBlocks(notionClient, task.notionPageId, checklistBody);
      });
    }

    try {
      revalidatePath('/production', 'layout');
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
  const denied = await denyWrite('kanban.view');
  if (denied) return denied as never;
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
      if (notionClient && isNotionLinked(task.notionPageId)) {
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

    revalidatePath('/production', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add comment' };
  }
}

export async function getTaskCommentsAction(taskId: string) {
  const denied = await denyUnless('kanban.view');
  if (denied) return denied as never;
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
  /** Production unit tujuan task (multi-production). Wajib. */
  productionUnitId: string;
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
  /** Nilai field tambahan production (key = nama properti Notion). */
  customFields?: Record<string, unknown> | null;
}

/** Data task untuk membuat halamannya di database Notion production. */
interface NotionPageInput {
  name: string;
  qtySubmit: number;
  pages: number | null;
  poolScore: number | null;
  taskMonth?: string | null;
  priority?: string | null;
  license?: string | null;
  doctypeNotionKey?: string | null;
  status?: { notionKey: string; displayName: string } | null;
  designer?: { displayName: string; status: string | null } | null;
  languages?: string[];
  accountNames: string[];
  templateLinkUrl?: string | null;
  customFields?: Record<string, unknown> | null;
  bodyText?: string | null;
  uploadRequestUrl?: string | null;
  outputUrl?: string | null;
}

/** Buat halaman task di Notion (properti + body). Melempar error bila Notion tidak siap atau API menolak. */
async function createNotionTaskPage(
  unit: { id: string; notionTaskDbId: string | null; fieldMapping: unknown },
  input: NotionPageInput,
): Promise<{ id: string; url: string | null }> {
  const notionConfig = await getNotionClientAndDatabase(unit.notionTaskDbId);
  if (!notionConfig?.databaseId) throw new Error('Notion belum dikonfigurasi untuk production ini.');

  const schemaProps = await getNotionDatabaseSchemaProperties(notionConfig.client, notionConfig.databaseId);
  const mapping = unit.fieldMapping as FieldMapping;
  const w = (key: FieldKey) => resolveWriteName(schemaProps, key, mapping);
  const notionProperties: any = {
    [titlePropertyName(schemaProps, mapping)]: { title: [{ text: { content: input.name } }] },
  };

  const qtyKey = w('qtySubmit');
  if (qtyKey) notionProperties[qtyKey] = { number: input.qtySubmit };

  const pagesKey = w('pages');
  if (input.pages !== null && pagesKey) notionProperties[pagesKey] = { number: Number(input.pages) };

  const poolKey = w('poolScore');
  if (input.poolScore !== null && poolKey) notionProperties[poolKey] = { number: Number(input.poolScore) };

  const taskMonthKey = w('taskMonth');
  if (input.taskMonth && taskMonthKey) {
    if (schemaProps[taskMonthKey].type === 'date') {
      const dateStr = formatTaskMonthToDateString(input.taskMonth);
      if (dateStr) notionProperties[taskMonthKey] = { date: { start: dateStr } };
    } else {
      notionProperties[taskMonthKey] = { select: { name: input.taskMonth } };
    }
  }

  const priorityKey = w('priority');
  if (input.priority && priorityKey) notionProperties[priorityKey] = { select: { name: input.priority } };

  const licenseKey = w('license');
  if (input.license && licenseKey) notionProperties[licenseKey] = { select: { name: input.license } };

  const doctypeKey = w('doctype');
  // Opsi select Notion = notionKey (lihat syncDoctypeOptionToNotion); displayName boleh berisi koma yang ditolak Notion.
  if (input.doctypeNotionKey && doctypeKey) notionProperties[doctypeKey] = { select: { name: input.doctypeNotionKey } };

  const statusKey = w('designStatus');
  if (input.status && statusKey) {
    const statusOption = schemaProps[statusKey]?.status?.options
      ? findNotionStatusOption(schemaProps[statusKey].status.options, input.status.notionKey || input.status.displayName)
      : null;
    notionProperties[statusKey] = statusOption
      ? { status: { id: statusOption.id } }
      : { status: { name: input.status.notionKey } };
  }

  const designerKey = w('designer');
  if (input.designer?.displayName && designerKey) {
    notionProperties[designerKey] = { select: { name: input.designer.displayName } };
    const designerStatusKey = w('designerStatus');
    if (input.designer.status && designerStatusKey) {
      notionProperties[designerStatusKey] = { select: { name: input.designer.status } };
    }
  }

  const langKey = w('languages');
  if (input.languages?.length && langKey) {
    notionProperties[langKey] = { multi_select: input.languages.map((l) => ({ name: l })) };
  }

  const brandKey = w('brand');
  if (input.accountNames.length && brandKey) {
    notionProperties[brandKey] = { multi_select: input.accountNames.map((name) => ({ name })) };
  }

  const templateKey = w('canvaLink');
  if (input.templateLinkUrl && templateKey) {
    notionProperties[templateKey] = schemaProps[templateKey].type === 'files'
      ? { files: [{ name: 'Template Link', external: { url: input.templateLinkUrl } }] }
      : { url: input.templateLinkUrl };
  }

  // Link Dropbox yang sudah ada di app (mis. halaman dibuat ulang setelah File Request terbentuk)
  if (input.uploadRequestUrl && schemaProps[UPLOAD_LINK_PROPERTY]) notionProperties[UPLOAD_LINK_PROPERTY] = { url: input.uploadRequestUrl };
  if (input.outputUrl && schemaProps[DROPBOX_LINK_PROPERTY]) notionProperties[DROPBOX_LINK_PROPERTY] = { url: input.outputUrl };

  Object.assign(notionProperties, await customFieldProperties(unit.id, input.customFields, schemaProps));

  // Relation "Assets" dari section Assets di brief
  const briefAssets = await resolveBriefAssets(input.bodyText);
  const assetsRelation = assetsRelationProperty(
    schemaProps,
    briefAssets.map((a) => a.notionPageId).filter((id): id is string => !!id),
  );
  if (assetsRelation && briefAssets.length > 0) Object.assign(notionProperties, assetsRelation);

  const newNotionPage: any = await notionConfig.client.pages.create({
    parent: { database_id: notionConfig.databaseId },
    properties: notionProperties,
  });

  if (input.bodyText) {
    try {
      const blocks = markdownToNotionBlocks(input.bodyText);
      for (let i = 0; i < blocks.length; i += 100) {
        await notionConfig.client.blocks.children.append({ block_id: newNotionPage.id, children: blocks.slice(i, i + 100) });
      }
    } catch (bErr) {
      console.error('Failed to append body blocks to Notion:', bErr);
    }
  }

  return { id: newNotionPage.id, url: newNotionPage.url ?? null };
}

/** Pesan untuk pengguna saat halaman Notion gagal dibuat (task tetap tersimpan di app). */
function notionPageWarning(err: unknown): string {
  const reason = err instanceof Error ? err.message : String(err);
  return `Task tersimpan di app, tetapi halaman Notion gagal dibuat (${reason}). Buka task lalu klik "Buat di Notion" untuk mencoba lagi.`;
}

export async function createTaskAction(payload: CreateTaskPayload) {
  try {
    await assertPermission('task.create', payload.productionUnitId);
    const name = payload.name.trim();
    if (!name) return { success: false, error: 'Task name is required' };

    const targetUnit = await prisma.productionUnit.findUnique({
      where: { id: payload.productionUnitId },
      include: { platform: true },
    });
    if (!targetUnit) return { success: false, error: 'Production tujuan tidak ditemukan.' };

    // Link Canva hanya untuk platform Canva; platform lain (Dropbox) tidak menyimpan link Canva
    const isCanvaOutput = targetUnit.platform.outputType === 'canva_link';
    const validatedCanvaLinks = isCanvaOutput && payload.canvaLinks?.length
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

    // Production Dropbox: body kartu mendapat section Checklist QA dari Doctype
    if (targetUnit.platform.outputType === 'dropbox_link') {
      payload.bodyText = ensureChecklistSection(payload.bodyText, selectedDoctype?.qaChecklist ?? []);
    }

    let selectedDesigner: any = null;
    if (payload.designerId) {
      selectedDesigner = await prisma.designer.findUnique({ where: { id: payload.designerId } });
    }

    let selectedAccounts: any[] = [];
    if (payload.accountIds && payload.accountIds.length > 0) {
      selectedAccounts = await prisma.account.findMany({ where: { id: { in: payload.accountIds } } });
    }

    // Halaman Notion; bila gagal task tetap disimpan dengan ID sementara + peringatan (bisa "Buat di Notion" nanti)
    let createdNotionPageId = `${APP_CREATED_PREFIX}${Date.now()}`;
    let createdNotionUrl: string | null = payload.notionUrl?.trim() || null;
    let notionWarning: string | undefined;
    try {
      const page = await createNotionTaskPage(targetUnit, {
        name,
        qtySubmit: effectiveQtySubmit,
        pages: effectivePages,
        poolScore,
        taskMonth: payload.taskMonth,
        priority: payload.priority,
        license: payload.license,
        doctypeNotionKey: selectedDoctype?.notionKey,
        status: selectedStatus,
        designer: selectedDesigner,
        languages: payload.languages,
        accountNames: selectedAccounts.map((a) => a.displayName),
        templateLinkUrl: validatedCanvaLinks[0]?.normalizedUrl || payload.notionUrl?.trim() || null,
        customFields: payload.customFields,
        bodyText: payload.bodyText,
      });
      createdNotionPageId = page.id;
      createdNotionUrl = page.url || createdNotionUrl;
    } catch (notionErr) {
      console.error('Failed to create page in Notion API:', notionErr);
      notionWarning = notionPageWarning(notionErr);
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
        customFields: payload.customFields && Object.keys(payload.customFields).length > 0
          ? (payload.customFields as Prisma.InputJsonObject)
          : undefined,
        bodyText: payload.bodyText ? orderBriefMarkdown(payload.bodyText) : null,
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
        productionUnit: { connect: { id: targetUnit.id } },
      },
    });

    if (task.bodyText) await syncTaskAssetLinks(task.id, task.bodyText);

    // Platform Dropbox: buat File Request di latar belakang (tidak menahan respons simpan)
    runInBackground('dropbox-upload-request', () => attachUploadRequest(task.id));

    revalidatePath('/production', 'layout');
    return { success: true, taskId: task.id, notionWarning };
  } catch (error: unknown) {
    console.error('Failed to create task:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create task' };
  }
}

/**
 * "Buat di Notion": buat halaman untuk task yang tersimpan tanpa halaman Notion
 * (ID `app_created_…`, mis. pembuatan halaman gagal saat task dibuat).
 */
export async function createMissingNotionPageAction(taskId: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        doctype: true,
        designStatus: true,
        designer: true,
        canvaLinks: { orderBy: { createdAt: 'asc' } },
        taskAccounts: { include: { account: true } },
        productionUnit: true,
      },
    });
    if (!task) return { success: false, error: 'Task not found' };
    await assertPermission('task.create', task.productionUnitId);
    if (!isMissingNotionPage(task.notionPageId)) return { success: false, error: 'Task ini sudah punya halaman Notion.' };

    const page = await createNotionTaskPage(task.productionUnit, {
      name: task.name || 'Untitled',
      qtySubmit: task.qtySubmit != null ? Number(task.qtySubmit) : 1,
      pages: task.pages != null ? Number(task.pages) : null,
      poolScore: task.poolScore != null ? Number(task.poolScore) : null,
      taskMonth: task.taskMonth,
      priority: task.priority,
      license: task.license,
      doctypeNotionKey: task.doctype?.notionKey,
      status: task.designStatus,
      designer: task.designer,
      languages: task.languages,
      accountNames: task.taskAccounts.map((ta) => ta.account.displayName),
      templateLinkUrl: task.canvaLinks[0]?.url ?? null,
      customFields: task.customFields as Record<string, unknown> | null,
      bodyText: task.bodyText,
      uploadRequestUrl: task.uploadRequestUrl,
      outputUrl: task.outputUrl,
    });

    // Klik ganda / dua tab: hanya satu halaman yang ditautkan, sisanya diarsipkan
    const linked = await prisma.task.updateMany({
      where: { id: task.id, notionPageId: task.notionPageId },
      // lastEditedTime ikut berubah agar kanban mengganti data task di drawer yang terbuka
      data: { notionPageId: page.id, notionUrl: page.url ?? task.notionUrl, lastEditedTime: new Date() },
    });
    if (linked.count === 0) {
      const notionClient = await getNotionClient();
      await notionClient?.pages.update({ page_id: page.id, archived: true }).catch(() => {});
      return { success: false, error: 'Halaman Notion sudah dibuat dari tempat lain. Muat ulang halaman.' };
    }

    try {
      revalidatePath('/production', 'layout');
    } catch {
      // Ignore if called outside request context
    }
    return { success: true, notionPageId: page.id, notionUrl: page.url };
  } catch (error: unknown) {
    console.error('Failed to create missing Notion page:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Gagal membuat halaman Notion' };
  }
}

export async function deleteCommentAction(commentId: string) {
  const denied = await denyWrite('kanban.view');
  if (denied) return denied as never;
  try {
    await prisma.taskComment.delete({
      where: { id: commentId },
    });
    revalidatePath('/production', 'layout');
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
  /** Patch field tambahan production (key = nama properti Notion); digabung ke nilai lama lalu dikirim ke Notion. */
  customFields?: Record<string, unknown> | null;
}

export async function updateTaskFieldsAction(taskId: string, payload: TaskUpdatePayload) {
  try {
    const access = await assertCanEditTask(taskId);
    if (!access.allows('account.view')) delete (payload as { accountIds?: string[] }).accountIds;
    // Brief (isi task) hanya boleh diubah role manajemen; designer hanya mengubah miliknya di luar brief.
    if (!access.allows('task.edit')) delete (payload as { bodyText?: string | null }).bodyText;
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        designer: true,
        doctype: true,
        designStatus: true,
      },
    });

    if (!existingTask) return { success: false, error: 'Task not found' };

    const targetStatus = payload.designStatusId
      ? await prisma.designStatus.findUnique({ where: { id: payload.designStatusId } })
      : null;

    // Designer task bundle mengikuti order bundle (sumber utama); ubah lewat drawer order di Billing Statement.
    if (payload.designerId !== undefined && existingTask.bundleOrderId) {
      const order = await prisma.bundleOrder.findUnique({ where: { id: existingTask.bundleOrderId }, select: { designerId: true } });
      if (order && (payload.designerId || null) !== order.designerId) {
        return { success: false, error: 'Designer task bundle mengikuti order bundle. Ubah lewat Billing Statement → Order Bundle.' };
      }
    }

    // Task di platform Dropbox tidak memakai link Canva
    const taskUnit = await prisma.productionUnit.findUnique({
      where: { id: existingTask.productionUnitId },
      include: { platform: true },
    });
    const isDropboxTask = taskUnit?.platform.outputType === 'dropbox_link';

    // Checklist QA mengikuti Doctype task (lama atau baru)
    const targetDoctype = payload.doctypeId !== undefined
      ? (payload.doctypeId ? await prisma.doctype.findUnique({ where: { id: payload.doctypeId } }) : null)
      : existingTask.doctype;
    const required = targetDoctype?.qaChecklist ?? [];

    // Gerbang QA → In Review (dropdown Design Status); jalur kanban ada di updateTaskStatusAction
    if (targetStatus) {
      const gateError = checklistGateError({
        isDropbox: isDropboxTask,
        current: existingTask.designStatus,
        target: targetStatus,
        bodyText: existingTask.bodyText,
        required,
      });
      if (gateError) return { success: false, error: gateError };
    }

    // Body baru menurut aturan Checklist QA; undefined = body tidak berubah
    let nextBody: string | null | undefined = payload.bodyText;
    if (isDropboxTask) {
      let body = payload.bodyText !== undefined ? payload.bodyText : existingTask.bodyText;
      // Editor brief tidak memuat section checklist → sambung kembali dari body tersimpan
      if (payload.bodyText !== undefined && !extractChecklistSection(payload.bodyText)) {
        body = mergeChecklistSection(payload.bodyText, extractChecklistSection(existingTask.bodyText));
      }
      // Doctype diganti sebelum designer bekerja → section dibuat ulang dari Doctype baru
      if (payload.doctypeId !== undefined && payload.doctypeId !== existingTask.doctypeId && isPreWorkStatus(targetStatus ?? existingTask.designStatus)) {
        body = mergeChecklistSection(body, required.length ? buildChecklistSection(required.map((label) => ({ label, checked: false }))) : '');
      }
      // Masuk QA → pastikan section ada (task lama)
      if (isQaStatus(targetStatus ?? existingTask.designStatus)) body = ensureChecklistSection(body, required);
      if (payload.bodyText !== undefined || (body ?? null) !== (existingTask.bodyText ?? null)) nextBody = body;
    }

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
    if (nextBody !== undefined) updateData.bodyText = nextBody ? orderBriefMarkdown(nextBody) : nextBody;
    if (payload.customFields) {
      const merged: Record<string, unknown> = { ...((existingTask.customFields as Record<string, unknown> | null) ?? {}) };
      for (const [key, value] of Object.entries(payload.customFields)) {
        const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
        if (empty) delete merged[key];
        else merged[key] = value;
      }
      updateData.customFields = Object.keys(merged).length > 0 ? (merged as Prisma.InputJsonObject) : Prisma.DbNull;
    }
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
    if (payload.canvaLinks !== undefined && !isDropboxTask) {
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

    // Dropdown ke QA: periksa folder Dropbox sekarang
    if (isDropboxTask && targetStatus && isQaStatus(targetStatus)) {
      runInBackground('dropbox-checklist-scan', async () => { await scanDropboxChecklists([taskId]); });
    }

    // Aset Library yang dirujuk brief → TaskAsset (hitungan "Dipakai di") + relation Notion
    const assetPageIds = nextBody !== undefined
      ? await syncTaskAssetLinks(taskId, updateData.bodyText as string | null | undefined)
      : null;

    // Best-effort Notion sync offloaded to background
    if (isNotionLinked(existingTask.notionPageId)) {
      runInBackground(`Update Notion Fields for Task ${existingTask.name || taskId}`, async () => {
        const notionClient = await getNotionClient();
        if (!notionClient) return;

        const page: any = await notionClient.pages.retrieve({ page_id: existingTask.notionPageId });
        const schemaProps = page.properties || {};
        const mapping = (taskUnit?.fieldMapping ?? {}) as FieldMapping;
        const w = (key: FieldKey) => resolveWriteName(schemaProps, key, mapping);
        const notionProperties: any = {};

        const titleKey = w('name');
        if (payload.name !== undefined && titleKey) {
          notionProperties[titleKey] = {
            title: [{ text: { content: payload.name || '' } }],
          };
        }
        const qtyKey = w('qtySubmit');
        if (payload.qtySubmit !== undefined && qtyKey) {
          notionProperties[qtyKey] = { number: payload.qtySubmit ?? null };
        }
        const pagesKey = w('pages');
        if ((payload.pages !== undefined || updateData.pages !== undefined) && pagesKey) {
          notionProperties[pagesKey] = { number: updateData.pages ?? payload.pages ?? null };
        }
        const poolKey = w('poolScore');
        if (updateData.poolScore !== undefined && poolKey) {
          notionProperties[poolKey] = { number: Number(updateData.poolScore) };
        }
        const taskMonthKey = w('taskMonth');
        if (payload.taskMonth !== undefined && taskMonthKey) {
          if (schemaProps[taskMonthKey].type === 'date') {
            const dateStr = formatTaskMonthToDateString(payload.taskMonth);
            notionProperties[taskMonthKey] = dateStr ? { date: { start: dateStr } } : { date: null };
          } else {
            notionProperties[taskMonthKey] = payload.taskMonth ? { select: { name: payload.taskMonth } } : { select: null };
          }
        }
        const priorityKey = w('priority');
        if (payload.priority !== undefined && priorityKey) {
          notionProperties[priorityKey] = payload.priority
            ? { select: { name: payload.priority } }
            : { select: null };
        }
        const licenseKey = w('license');
        if (payload.license !== undefined && licenseKey) {
          notionProperties[licenseKey] = payload.license
            ? { select: { name: payload.license } }
            : { select: null };
        }

        // Sync Design Status
        const statusKey = w('designStatus');
        if (payload.designStatusId !== undefined && statusKey) {
          if (payload.designStatusId) {
            const statusRecord = await prisma.designStatus.findUnique({ where: { id: payload.designStatusId } });
            if (statusRecord) {
              const statusProperty = await getNotionPageStatusProperty(notionClient, page, statusKey);
              const statusOption = statusProperty?.type === 'status' && statusProperty.status?.options
                ? findNotionStatusOption(statusProperty.status.options, statusRecord.notionKey || statusRecord.displayName)
                : null;
              notionProperties[statusKey] = statusOption
                ? { status: { id: statusOption.id } }
                : { status: { name: statusRecord.displayName || statusRecord.notionKey } };
            }
          }
        }

        // Sync Designer
        const designerKey = w('designer');
        if (payload.designerId !== undefined && designerKey) {
          if (payload.designerId) {
            const designerRecord = await prisma.designer.findUnique({ where: { id: payload.designerId } });
            if (designerRecord) {
              notionProperties[designerKey] = { select: { name: designerRecord.displayName } };
              const designerStatusKey = w('designerStatus');
              if (designerRecord.status && designerStatusKey) {
                notionProperties[designerStatusKey] = { select: { name: designerRecord.status } };
              }
            }
          } else {
            notionProperties[designerKey] = { select: null };
          }
        }

        // Sync Doctype
        const doctypeKey = w('doctype');
        if (payload.doctypeId !== undefined && doctypeKey) {
          if (payload.doctypeId) {
            const doctypeRecord = await prisma.doctype.findUnique({ where: { id: payload.doctypeId } });
            if (doctypeRecord) {
              notionProperties[doctypeKey] = { select: { name: doctypeRecord.notionKey } };
            }
          } else {
            notionProperties[doctypeKey] = { select: null };
          }
        }

        // Sync Brand / Account
        const brandKey = w('brand');
        if (payload.accountIds !== undefined && brandKey) {
          if (payload.accountIds.length > 0) {
            const accounts = await prisma.account.findMany({ where: { id: { in: payload.accountIds } } });
            notionProperties[brandKey] = { multi_select: accounts.map((a) => ({ name: a.displayName })) };
          } else {
            notionProperties[brandKey] = { multi_select: [] };
          }
        }

        // Sync Languages
        const langKey = w('languages');
        if (payload.languages !== undefined && langKey) {
          notionProperties[langKey] = { multi_select: (payload.languages || []).map((l) => ({ name: l })) };
        }

        // Sync Template Link
        const templateKey = w('canvaLink');
        if (payload.canvaLinks !== undefined && !isDropboxTask && templateKey) {
          const linkUrl = payload.canvaLinks[0] || null;
          if (schemaProps[templateKey].type === 'files') {
            notionProperties[templateKey] = linkUrl
              ? { files: [{ name: 'Template Link', external: { url: linkUrl } }] }
              : { files: [] };
          } else {
            notionProperties[templateKey] = { url: linkUrl };
          }
        }

        // Field tambahan production
        Object.assign(notionProperties, await customFieldProperties(existingTask.productionUnitId, payload.customFields, schemaProps));

        if (assetPageIds) Object.assign(notionProperties, assetsRelationProperty(schemaProps, assetPageIds) ?? {});

        if (Object.keys(notionProperties).length > 0) {
          await notionClient.pages.update({
            page_id: existingTask.notionPageId,
            properties: notionProperties,
          });
        }

        if (nextBody !== undefined) {
          await syncNotionPageBodyBlocks(notionClient, existingTask.notionPageId, updateData.bodyText);
        }
      });
    }

    try {
      revalidatePath('/production', 'layout');
    } catch {
      // Ignore if called outside request context
    }
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update task fields:', error);
    return { success: false, error: error.message || 'Failed to update task fields' };
  }
}

/**
 * Centang/batal satu item Checklist QA (hanya saat status QA, oleh role task.edit).
 * Push body mengganti seluruh body Notion, jadi centang yang dibuat langsung di Notion
 * diambil dulu agar tidak tertimpa body lokal yang belum ter-sync.
 */
export async function toggleChecklistItemAction(taskId: string, label: string, checked: boolean) {
  try {
    const access = await assertCanEditTask(taskId);
    if (!access.allows('task.edit')) return { success: false, error: 'Hanya QA yang bisa mengubah Checklist QA.' };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        designStatus: true,
        doctype: { select: { qaChecklist: true } },
        productionUnit: { select: { platform: { select: { outputType: true } } } },
      },
    });
    if (!task) return { success: false, error: 'Task not found' };
    const required = task.doctype?.qaChecklist ?? [];
    if (task.productionUnit.platform.outputType !== 'dropbox_link' || !required.some((r) => r.toLowerCase() === label.toLowerCase())) {
      return { success: false, error: `Item "${label}" tidak ada di Checklist QA Doctype task ini.` };
    }
    if (!isQaStatus(task.designStatus)) return { success: false, error: 'Checklist QA hanya bisa diubah saat status QA.' };

    let body = task.bodyText;
    const fromNotion = isNotionLinked(task.notionPageId);
    const notionClient = fromNotion ? await getNotionClient() : null;
    if (notionClient && !isBodyPushBusy(task.notionPageId)) {
      try {
        const blocks: any[] = [];
        let cursor: string | undefined;
        do {
          const res: any = await notionClient.blocks.children.list({ block_id: task.notionPageId, page_size: 100, start_cursor: cursor });
          blocks.push(...(res.results ?? []));
          cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
        } while (cursor);
        const notionSection = extractChecklistSection(parseNotionBlocksToMarkdown(blocks));
        if (notionSection) body = mergeChecklistSection(body, notionSection);
      } catch (err) {
        console.warn('Gagal membaca Checklist QA terbaru dari Notion; memakai body lokal:', err);
      }
    }

    const nextBody = orderBriefMarkdown(setChecklistItem(body, required, label, checked));
    await prisma.task.update({ where: { id: taskId }, data: { bodyText: nextBody, lastEditedTime: new Date() } });

    if (notionClient) {
      runInBackground(`Update Checklist QA for Task ${task.name || taskId}`, () =>
        syncNotionPageBodyBlocks(notionClient, task.notionPageId, nextBody),
      );
    }

    try {
      revalidatePath('/production', 'layout');
    } catch {
      // Ignore if called outside request context
    }
    return { success: true, bodyText: nextBody };
  } catch (error: unknown) {
    console.error('Failed to toggle checklist item:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mengubah Checklist QA' };
  }
}

/** Tombol "Periksa folder" di tab Checklist QA: pindai folder Dropbox task sekarang. */
export async function scanTaskDropboxAction(taskId: string) {
  try {
    await assertCanEditTask(taskId);
    await scanDropboxChecklists([taskId]);
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { bodyText: true, dropboxFiles: true, dropboxScannedAt: true },
    });
    if (!task) return { success: false, error: 'Task not found' };
    try {
      revalidatePath('/production', 'layout');
    } catch {
      // Ignore if called outside request context
    }
    return {
      success: true,
      bodyText: task.bodyText,
      dropboxFiles: readSnapshot(task.dropboxFiles),
      dropboxScannedAt: task.dropboxScannedAt?.toISOString() ?? null,
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Gagal memeriksa folder Dropbox' };
  }
}

export async function fetchTaskMetadataOptionsAction(productionUnitId?: string) {
  try {
    const access = await getAccess();
    const canSeeBrand = access.allows('account.view', productionUnitId);
    // Doctype & akun mengikuti platform production yang dipilih (multi-production)
    const unit = productionUnitId
      ? await prisma.productionUnit.findUnique({ where: { id: productionUnitId }, include: { platform: true } })
      : null;
    const platformScope = unit ? { platformId: unit.platformId } : {};

    const [designers, doctypes, designStatuses, accounts, fields] = await Promise.all([
      prisma.designer.findMany({
        where: { status: 'Active' },
        select: { id: true, displayName: true, avatarColor: true },
        orderBy: { displayName: 'asc' },
      }),
      prisma.doctype.findMany({
        where: platformScope,
        select: { id: true, displayName: true, pages: true, poolRate: true, qaChecklist: true, _count: { select: { tasks: true } } },
        orderBy: [
          { tasks: { _count: 'desc' } },
          { displayName: 'asc' },
        ],
      }),
      prisma.designStatus.findMany({
        select: { id: true, displayName: true, notionKey: true },
        orderBy: { displayName: 'asc' },
      }),
      canSeeBrand
        ? prisma.account.findMany({
            where: platformScope,
            select: { id: true, displayName: true, color: true },
            orderBy: { displayName: 'asc' },
          })
        : Promise.resolve([]),
      // Field tambahan production yang ditampilkan di task drawer / buat task
      productionUnitId
        ? prisma.productionField.findMany({
            where: { productionUnitId, visible: true, missingInNotion: false },
            select: { id: true, name: true, type: true, options: true, editable: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          })
        : Promise.resolve([]),
    ]);

    return {
      success: true,
      data: JSON.parse(
        JSON.stringify({
          designers,
          doctypes,
          designStatuses,
          accounts,
          fields,
          disabledFields: unit?.disabledFields ?? [],
          outputType: unit?.platform.outputType ?? 'canva_link',
        })
      ),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch task metadata options' };
  }
}

export async function duplicateTaskAction(taskId: string) {
  try {
    await assertPermission('task.create');
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
      productionUnitId: existingTask.productionUnitId,
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
      revalidatePath('/production', 'layout');
      revalidatePath('/');
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to duplicate task' };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    await assertPermission('task.edit');
    if (!taskId) return { success: false, error: 'Task ID is required' };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) return { success: false, error: 'Task not found' };

    if (isNotionLinked(task.notionPageId)) {
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

    revalidatePath('/production', 'layout');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete task' };
  }
}


