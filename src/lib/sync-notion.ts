import prisma from '@/lib/prisma';
import { isBodyPushBusy } from '@/lib/notion-body-push';
import { Client } from '@notionhq/client';
import { decrypt } from '@/lib/encryption';
import { formatDateStringToTaskMonth, formatTaskMonthToDateString } from '@/lib/period-utils';
import { getPresetPagesByName } from '@/lib/doctype-presets';
import {
  getProperty,
  extractCustomFields,
  resolveWriteName,
  type FieldKey,
  type FieldMapping,
} from '@/lib/production-field-mapping';
import { Prisma } from '../../generated/prisma';
import { syncDropboxOutputs } from '@/lib/dropbox-output';

export type NotionSyncMode = 'incremental' | 'full';

export interface SyncProgressState {
  isSyncing: boolean;
  startTime: number | null;
  processedRecords: number;
  totalRecordsEst: number;
  percentage: number;
  etaSeconds: number;
  currentStepMessage: string;
  newRecords: number;
  failedRecords: number;
}

let syncProgressStore: SyncProgressState = {
  isSyncing: false,
  startTime: null,
  processedRecords: 0,
  totalRecordsEst: 288,
  percentage: 0,
  etaSeconds: 0,
  currentStepMessage: 'Idle',
  newRecords: 0,
  failedRecords: 0,
};

export function getSyncProgress(): SyncProgressState {
  return syncProgressStore;
}

const INCREMENTAL_OVERLAP_MS = 2 * 60 * 1000;

function findNotionStatusOption(options: Array<{ id: string; name: string }>, targetKey: string) {
  if (!options || !targetKey) return null;
  const cleanTarget = targetKey.trim().toLowerCase();

  const exact = options.find((opt) => opt.name.toLowerCase() === cleanTarget || opt.id === targetKey);
  if (exact) return exact;

  const normTarget = cleanTarget.replace(/[^a-z0-9]/g, '');
  const normMatch = options.find((opt) => opt.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normTarget);
  if (normMatch) return normMatch;

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

export function formatRichTextToMarkdown(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(t => {
    const plain = t.plain_text || '';
    const url = t.href || t.text?.link?.url;
    if (url && plain && plain !== url) {
      return `[${plain}](${url})`;
    }
    return plain;
  }).join('');
}

export function parseNotionBlocksToMarkdown(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  const lines: string[] = [];

  for (const block of blocks) {
    const type = block.type;
    if (!type) continue;

    if (block.heading_1) {
      const text = formatRichTextToMarkdown(block.heading_1.rich_text);
      if (text) lines.push(`# ${text}`);
    } else if (block.heading_2) {
      const text = formatRichTextToMarkdown(block.heading_2.rich_text);
      if (text) lines.push(`## ${text}`);
    } else if (block.heading_3) {
      const text = formatRichTextToMarkdown(block.heading_3.rich_text);
      if (text) lines.push(`### ${text}`);
    } else if (block.bulleted_list_item) {
      const text = formatRichTextToMarkdown(block.bulleted_list_item.rich_text);
      if (text) lines.push(`- ${text}`);
    } else if (block.numbered_list_item) {
      const text = formatRichTextToMarkdown(block.numbered_list_item.rich_text);
      if (text) lines.push(`- ${text}`);
    } else if (block.to_do) {
      const text = formatRichTextToMarkdown(block.to_do.rich_text);
      const mark = block.to_do.checked ? '[x]' : '[ ]';
      if (text) lines.push(`- ${mark} ${text}`);
    } else if (block.quote) {
      const text = formatRichTextToMarkdown(block.quote.rich_text);
      if (text) lines.push(`> ${text}`);
    } else if (block.callout && /^Extracted Color Palette/i.test(formatRichTextToMarkdown(block.callout.rich_text))) {
      // Generated by markdownToNotionBlocks — restore the original markdown line
      const hexes = formatRichTextToMarkdown(block.callout.rich_text).match(/#[A-Fa-f0-9]{6}/g);
      if (hexes?.length) lines.push(`- Swatches: ${hexes.join(', ')}`);
    } else if (block.callout) {
      const icon = block.callout.icon?.emoji || '💡';
      const text = formatRichTextToMarkdown(block.callout.rich_text);
      if (text) lines.push(`> ${icon} ${text}`);
    } else if (block.toggle) {
      const text = formatRichTextToMarkdown(block.toggle.rich_text);
      if (text) lines.push(`- ${text}`);
    } else if (block.image) {
      // Keep reference images; skip the auto-generated palette strip (regenerated on push)
      const url = block.image.external?.url || block.image.file?.url;
      if (url && !url.includes('/api/palette/strip')) lines.push(`![](${url})`);
    } else if (block.bookmark?.url || block.embed?.url || block.link_preview?.url) {
      const url = block.bookmark?.url || block.embed?.url || block.link_preview?.url;
      if (url && !url.includes('/embed/palette')) lines.push(url);
    } else if (block.divider) {
      lines.push('---');
    } else if (block.paragraph) {
      const text = formatRichTextToMarkdown(block.paragraph.rich_text);
      if (text) {
        lines.push(text);
      } else {
        lines.push('');
      }
    }
  }

  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  return lines.join('\n');
}

export async function pushPendingLocalChangesToNotion() {
  const pendingTasks = await prisma.task.findMany({
    where: {
      syncStatus: 'PENDING_PUSH',
      NOT: {
        notionPageId: { startsWith: 'sync_mock_page_' }
      }
    },
    include: {
      designer: true,
      doctype: true,
      designStatus: true,
      taskAccounts: { include: { account: true } },
      canvaLinks: true,
      productionUnit: true,
    }
  });

  if (pendingTasks.length === 0) {
    return { pushedCount: 0 };
  }

  let activeApiKey = process.env.NOTION_API_KEY || null;

  const dbConfig = await prisma.notionConfig.findFirst();

  if (dbConfig) {
    try {
      const decryptedApiKey = decrypt(dbConfig.encryptedApiKey, dbConfig.iv);
      if (decryptedApiKey) activeApiKey = decryptedApiKey;
    } catch (err) {
      console.error('Failed to decrypt Notion config for outbound push:', err);
    }
  }

  if (!activeApiKey) {
    console.warn('Cannot push local changes to Notion: Missing API Key.');
    return { pushedCount: 0 };
  }

  const client = new Client({ auth: activeApiKey });
  // Setiap task dipush ke database Notion milik production unitnya sendiri
  const schemaByDatabase = new Map<string, Record<string, any>>();

  let pushedCount = 0;

  for (const task of pendingTasks) {
    try {
      const databaseId = task.productionUnit.notionTaskDbId;
      let schemaProps = schemaByDatabase.get(databaseId);
      if (!schemaProps) {
        schemaProps = await getNotionDatabaseSchemaProperties(client, databaseId);
        schemaByDatabase.set(databaseId, schemaProps);
      }
      const properties: Record<string, any> = {};
      const mapping = (task.productionUnit.fieldMapping ?? {}) as FieldMapping;
      const w = (key: FieldKey) => resolveWriteName(schemaProps!, key, mapping);

      const titleKey = w('name');
      if (task.name && titleKey) {
        properties[titleKey] = { title: [{ text: { content: task.name } }] };
      }

      // Payroll Month
      const payrollKey = w('payrollMonth');
      if (task.payrollMonth !== undefined && payrollKey) {
        properties[payrollKey] = task.payrollMonth
          ? { select: { name: task.payrollMonth } }
          : { select: null };
      }

      // Task Month
      const taskMonthKey = w('taskMonth');
      if (task.taskMonth && taskMonthKey) {
        if (schemaProps[taskMonthKey].type === 'date') {
          const dateStr = formatTaskMonthToDateString(task.taskMonth);
          if (dateStr) properties[taskMonthKey] = { date: { start: dateStr } };
        } else {
          properties[taskMonthKey] = { select: { name: task.taskMonth } };
        }
      }

      // Design Status
      const statusKey = w('designStatus');
      if (task.designStatus && statusKey) {
        const options = schemaProps[statusKey]?.status?.options || schemaProps[statusKey]?.select?.options;
        const statusOption = options
          ? findNotionStatusOption(options, task.designStatus.notionKey || task.designStatus.displayName)
          : null;
        if (schemaProps[statusKey].type === 'status') {
          properties[statusKey] = statusOption
            ? { status: { id: statusOption.id } }
            : { status: { name: task.designStatus.notionKey || task.designStatus.displayName } };
        } else {
          properties[statusKey] = statusOption
            ? { select: { name: statusOption.name } }
            : { select: { name: task.designStatus.displayName } };
        }
      }

      const qtyKey = w('qtySubmit');
      if (task.qtySubmit != null && qtyKey) properties[qtyKey] = { number: Number(task.qtySubmit) };

      const pagesKey = w('pages');
      if (task.pages != null && pagesKey) properties[pagesKey] = { number: Number(task.pages) };

      const poolKey = w('poolScore');
      if (task.poolScore != null && poolKey) properties[poolKey] = { number: Number(task.poolScore) };

      const priorityKey = w('priority');
      if (task.priority && priorityKey) properties[priorityKey] = { select: { name: task.priority } };

      const licenseKey = w('license');
      if (task.license && licenseKey) properties[licenseKey] = { select: { name: task.license } };

      const doctypeKey = w('doctype');
      if (task.doctype?.notionKey && doctypeKey) properties[doctypeKey] = { select: { name: task.doctype.notionKey } };

      const designerKey = w('designer');
      if (task.designer?.displayName && designerKey) {
        properties[designerKey] = { select: { name: task.designer.displayName } };
        const designerStatusKey = w('designerStatus');
        if (task.designer.status && designerStatusKey) {
          properties[designerStatusKey] = { select: { name: task.designer.status } };
        }
      }

      const langKey = w('languages');
      if (task.languages && task.languages.length > 0 && langKey) {
        properties[langKey] = { multi_select: task.languages.map((l) => ({ name: l })) };
      }

      const brandKey = w('brand');
      if (task.taskAccounts && task.taskAccounts.length > 0 && brandKey) {
        properties[brandKey] = { multi_select: task.taskAccounts.map((ta) => ({ name: ta.account.displayName })) };
      }

      // Template Link
      const templateLinkUrl = task.canvaLinks?.[0]?.url || task.notionUrl || null;
      const templateKey = w('canvaLink');
      if (templateLinkUrl && templateKey) {
        if (schemaProps[templateKey].type === 'files') {
          properties[templateKey] = {
            files: [{ name: 'Template Link', external: { url: templateLinkUrl } }],
          };
        } else {
          properties[templateKey] = { url: templateLinkUrl };
        }
      }

      await client.pages.update({
        page_id: task.notionPageId,
        properties,
      });

      await prisma.task.update({
        where: { id: task.id },
        data: {
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
        },
      });

      pushedCount++;
    } catch (err: any) {
      console.error(`Failed to push local task ${task.id} to Notion:`, err);
      await prisma.task.update({
        where: { id: task.id },
        data: { syncStatus: 'ERROR' },
      }).catch(() => {});
    }
  }

  return { pushedCount };
}

export async function syncNotionData(mode: NotionSyncMode = 'incremental') {
  const startedAt = new Date();
  
  const baselineCount = (await prisma.task.count().catch(() => 288)) || 288;
  syncProgressStore = {
    isSyncing: true,
    startTime: Date.now(),
    processedRecords: 0,
    totalRecordsEst: baselineCount,
    percentage: 5,
    etaSeconds: 25,
    currentStepMessage: 'Connecting to Notion API...',
    newRecords: 0,
    failedRecords: 0,
  };

  // Create running sync log
  const log = await prisma.syncLog.create({
    data: {
      startedAt,
      status: 'running',
    },
  });

  try {
    // Phase 1: Push pending local App UI changes to Notion
    try {
      syncProgressStore.currentStepMessage = 'Mengirim perubahan lokal ke Notion...';
      const pushRes = await pushPendingLocalChangesToNotion();
      if (pushRes.pushedCount > 0) {
        console.log(`Successfully pushed ${pushRes.pushedCount} pending local tasks to Notion.`);
      }
    } catch (pushErr) {
      console.error('Outbound sync error during pushPendingLocalChangesToNotion:', pushErr);
    }

    let activeApiKey = process.env.NOTION_API_KEY || null;

    // Load credentials from database first
    const dbConfig = await prisma.notionConfig.findFirst();
    if (dbConfig) {
      try {
        const decryptedApiKey = decrypt(dbConfig.encryptedApiKey, dbConfig.iv);
        if (decryptedApiKey) activeApiKey = decryptedApiKey;
      } catch (err) {
        console.error('Failed to decrypt database-stored Notion config:', err);
      }
    }

    // One sync target per active production unit (its own Notion task database)
    const productionUnits = await prisma.productionUnit.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const syncTargets = productionUnits.map((unit) => ({ databaseId: unit.notionTaskDbId, unit }));

    if (activeApiKey && syncTargets.length > 0) {
      const notionClient = new Client({ auth: activeApiKey });

      let recordsSynced = 0;
      let newRecords = 0;
      let updatedRecords = 0;
      let failedRecords = 0;

      // Start-time cutoff prevents edits made during a prior run from being skipped.
      // Two-minute overlap also protects timestamp boundaries; upserts make repeats safe.
      const lastSync = mode === 'incremental'
        ? await prisma.syncLog.findFirst({
            where: { status: 'success' },
            orderBy: { startedAt: 'desc' },
          })
        : null;
      const lastSyncTime = mode === 'incremental'
        ? (lastSync
            ? new Date(lastSync.startedAt.getTime() - INCREMENTAL_OVERLAP_MS).toISOString()
            : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        : undefined;

      // Ensure reference metadata exists (designers & statuses are global; doctypes & accounts are per platform)
      const designers = await prisma.designer.findMany();
      const statuses = await prisma.designStatus.findMany();

      const allSyncedNotionIds: string[] = [];
      const syncedUnitIds: string[] = [];
      const skippedUnits: string[] = [];

      for (const { databaseId, unit } of syncTargets) {
        console.log(`Starting live Notion sync for production "${unit.name}" (database: ${databaseId})...`);
        const unitMapping = (unit.fieldMapping ?? {}) as FieldMapping;
        const doctypes = await prisma.doctype.findMany({ where: { platformId: unit.platformId } });
        const accounts = await prisma.account.findMany({ where: { platformId: unit.platformId } });
        try {
        
        let cursor: string | undefined = undefined;
        let hasMore = true;
        let activeDataSourceId = databaseId;
        
        try {
          console.log('Resolving actual data source ID from Notion database metadata...');
          const dbMetadata: any = await notionClient.databases.retrieve({ database_id: databaseId });
          if (dbMetadata.data_sources?.[0]?.id) {
            activeDataSourceId = dbMetadata.data_sources[0].id;
            console.log(`Resolved data source ID: ${activeDataSourceId}`);
          }
        } catch (err: any) {
          console.warn(`Could not retrieve database metadata, falling back to direct ID: ${err.message}`);
        }

        while (hasMore) {
          const queryPayload: any = {
            data_source_id: activeDataSourceId,
            start_cursor: cursor,
            page_size: 100,
          };
          
          if (lastSyncTime) {
            queryPayload.filter = {
              timestamp: 'last_edited_time',
              last_edited_time: {
                on_or_after: lastSyncTime,
              },
            };
          }

          const response: any = await (notionClient as any).dataSources.query(queryPayload);

          for (const page of response.results as any[]) {
            const properties = page.properties;
            const p = (key: FieldKey) => getProperty(properties, key, unitMapping);
            const notionPageId = page.id;
            const notionUrl = page.url;

            // Parse name
            const name = p('name')?.title?.map((t: any) => t.plain_text).join('') || 'Untitled Task';

            const designerName = p('designer')?.select?.name;
          const designerStatusProp = p('designerStatus')?.select?.name;
          
          let isDesignerActive = true;
          if (designerStatusProp) {
            if (designerStatusProp.toLowerCase().includes('resign')) {
              isDesignerActive = false;
            } else if (designerStatusProp.toLowerCase().includes('active')) {
              isDesignerActive = true;
            }
          }

          let designerId = null;
          if (designerName) {
            let foundDesigner = designers.find(
              (d) => d.notionKey.toLowerCase() === designerName.toLowerCase() ||
                     d.displayName.toLowerCase() === designerName.toLowerCase()
            );
            
            if (!foundDesigner) {
              const avatarColors = ['#10B981', '#6366F1', '#EC4899', '#3B82F6', '#F59E0B', '#8B5CF6'];
              const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
              const newD = await prisma.designer.create({
                data: {
                  notionKey: designerName,
                  displayName: designerName,
                  avatarColor: randomColor,
                  status: 'Active',
                }
              });
              designers.push(newD);
              foundDesigner = newD;
            }
            designerId = foundDesigner.id;
          }

          // Parse Doctype (lookup by name/notionKey, create if missing)
          const doctypeName = p('doctype')?.select?.name;

          let doctypeId = null;
          if (doctypeName) {
            let foundDoctype = doctypes.find(
              (dt) => dt.notionKey.toLowerCase() === doctypeName.toLowerCase() ||
                      dt.displayName.toLowerCase() === doctypeName.toLowerCase()
            );
            
            if (!foundDoctype) {
              const presetPages = getPresetPagesByName(doctypeName);
              const newDt = await prisma.doctype.create({
                data: {
                  notionKey: doctypeName,
                  displayName: doctypeName,
                  isTopSpecialist: false,
                  sortOrder: doctypes.length + 1,
                  poolRate: 1.0,
                  pages: presetPages,
                  platformId: unit.platformId,
                }
              });
              doctypes.push(newDt);
              foundDoctype = newDt;
            }
            doctypeId = foundDoctype!.id;
          }

          // Parse Design Status (lookup by name/notionKey, create if missing)
          const statusProp = p('designStatus');
          const statusName = statusProp?.status?.name || statusProp?.select?.name;
          let designStatusId = null;
          if (statusName) {
            const lowerName = statusName.toLowerCase();
            const isQaVariant = lowerName === 'qa' || lowerName.includes('q&a') || lowerName.includes('in qa') || lowerName.includes('quality assurance');

            let foundStatus = statuses.find(
              (s) => s.notionKey.toLowerCase() === lowerName ||
                     s.displayName.toLowerCase() === lowerName ||
                     (isQaVariant && (s.notionKey.toLowerCase().includes('qa') || s.displayName.toLowerCase().includes('qa')))
            );

            if (!foundStatus) {
              const isApproved = lowerName.includes('aprov') && !lowerName.includes('profile');
              const isProfileOnly = lowerName.includes('profile');
              const isSubmitted = !lowerName.includes('draft');
              const group = isApproved || isProfileOnly ? 'complete' : (lowerName.includes('review') || lowerName.includes('progress') || isQaVariant ? 'in_progress' : 'to_do');
              const newS = await prisma.designStatus.create({
                data: {
                  notionKey: statusName,
                  displayName: statusName,
                  statusGroup: group,
                  countsAsSubmitted: isSubmitted,
                  countsAsApproved: isApproved,
                  countsAsProfileOnly: isProfileOnly,
                }
              });
              statuses.push(newS);
              foundStatus = newS;
            }
            designStatusId = foundStatus.id;
          }

          // Parse fields
          const pages = p('pages')?.number || 0;
          const qtySubmit = p('qtySubmit')?.number || 0;
          const license = p('license')?.select?.name || 'Free';
          
          let languages: string[] = [];
          const indEngProp = p('languages');
          if (indEngProp) {
            if (indEngProp.multi_select) {
              languages = indEngProp.multi_select.map((x: any) => x.name);
            } else if (indEngProp.select?.name) {
              languages = [indEngProp.select.name];
            }
          }
          
          const dateApprovedVal = p('dateApproved')?.date?.start;
          const dateApproved = dateApprovedVal ? new Date(dateApprovedVal) : null;
          
          const rawTaskMonth = p('taskMonth')?.select?.name ||
            p('taskMonth')?.date?.start ||
            (p('taskMonth')?.rich_text ? p('taskMonth')?.rich_text.map((t: any) => t.plain_text).join('') : null);
          const taskMonth = formatDateStringToTaskMonth(rawTaskMonth);

          const rawPayrollMonth = p('payrollMonth')?.select?.name ||
            p('payrollMonth')?.date?.start ||
            (p('payrollMonth')?.rich_text ? p('payrollMonth')?.rich_text.map((t: any) => t.plain_text).join('') : null);
          const payrollMonth = formatDateStringToTaskMonth(rawPayrollMonth);

          const priority = p('priority')?.select?.name || 'Medium';
          
          // Get card created date from Notion (check custom properties or standard metadata)
          let createdTime = new Date(page.created_time);
          const createdProp = p('createdTime');
          const customCreatedVal =
            createdProp?.date?.start ||
            createdProp?.created_time;
          if (customCreatedVal) {
            createdTime = new Date(customCreatedVal);
          }

          const lastEditedTime = new Date(page.last_edited_time || new Date());
          const dateStartedVal = p('dateStarted')?.date?.start;
          const dateStarted = dateStartedVal ? new Date(dateStartedVal) : null;
          const dateCompletedVal = p('dateCompleted')?.date?.start;
          const dateCompleted = dateCompletedVal ? new Date(dateCompletedVal) : null;
          const datePOVal = p('datePO')?.date?.start;
          const datePO = datePOVal ? new Date(datePOVal) : null;
          const dateRejectVal = p('dateReject')?.date?.start;
          const dateReject = dateRejectVal ? new Date(dateRejectVal) : null;
          const poolScore = p('poolScore')?.number ?? null;

          const taskData = {
              name,
              designerId,
              doctypeId,
              designStatusId,
              pages,
              qtySubmit,
              license,
              languages,
              dateApproved,
              taskMonth,
              payrollMonth,
              priority,
              createdTime,
              lastEditedTime,
              dateStarted,
              dateCompleted,
              datePO,
              dateReject,
              poolScore,
              productionUnitId: unit.id,
              customFields: extractCustomFields(properties, unitMapping) ?? Prisma.DbNull,
              syncedAt: new Date(),
          };

          // Upsert Task
          const existingTask = await prisma.task.findUnique({
            where: { notionPageId },
            select: { id: true, lastEditedTime: true, syncStatus: true, bundleOrder: { select: { designerId: true } } },
          });
          // Page body changed in Notion since our last sync → re-read its blocks
          const pageEditedSinceLastSync =
            !existingTask?.lastEditedTime ||
            lastEditedTime.getTime() > new Date(existingTask.lastEditedTime).getTime();
          const hasPendingLocalPush = existingTask?.syncStatus === 'PENDING_PUSH';

          if (existingTask) {
            updatedRecords++;
          } else {
            newRecords++;
          }

          // Task bundle: designer selalu mengikuti order bundle, bukan nilai Designer di Notion.
          const updateData = existingTask?.bundleOrder ? { ...taskData, designerId: existingTask.bundleOrder.designerId } : taskData;
          const task = await prisma.task.upsert({
            where: { notionPageId },
            update: updateData,
            create: {
              notionPageId,
              notionUrl,
              ...taskData
            },
          });

          // Extract Canva links from properties and page body blocks
          try {
            const canvaUrls: string[] = [];
            // Check properties for Canva Link or Template Link
            const canvaProp = p('canvaLink');
            if (canvaProp) {
              if (canvaProp.type === 'files') {
                for (const file of canvaProp.files) {
                  const url = file.external?.url || file.file?.url || file.name;
                  if (url && url.includes('canva.link')) {
                    const match = url.match(/https?:\/\/(?:www\.)?canva\.link\/[^\s]+/i);
                    if (match) canvaUrls.push(match[0]);
                  } else if (file.name && file.name.includes('canva.link')) {
                    const match = file.name.match(/https?:\/\/(?:www\.)?canva\.link\/[^\s]+/i);
                    if (match) canvaUrls.push(match[0]);
                  }
                }
              } else if (canvaProp.url && canvaProp.url.includes('canva.link')) {
                canvaUrls.push(canvaProp.url);
              } else if (canvaProp.type === 'rich_text') {
                 for (const rt of canvaProp.rich_text) {
                    const url = rt.href || rt.text?.link?.url || rt.plain_text;
                    if (url && url.includes('canva.link')) {
                      const match = url.match(/https?:\/\/(?:www\.)?canva\.link\/[^\s]+/i);
                      if (match) canvaUrls.push(match[0]);
                    }
                 }
              }
            }

            async function fetchAllBlocks(blockId: string, depth = 0): Promise<any[]> {
              if (depth > 3) return []; // Limit depth to avoid infinite loops and rate limits
              try {
                const response: any = await (notionClient as any).blocks.children.list({
                  block_id: blockId,
                  page_size: 100,
                });
                let blocks = response.results || [];
                const childPromises = blocks
                  .filter((b: any) => b.has_children)
                  .map((b: any) => fetchAllBlocks(b.id, depth + 1));
                const childrenArrays = await Promise.all(childPromises);
                for (const children of childrenArrays) {
                  blocks = blocks.concat(children);
                }
                return blocks;
              } catch (e) {
                console.warn(`Could not fetch children for block ${blockId}`);
                return [];
              }
            }

            // Decoupled block fetching: fetch blocks if bodyText is missing, full sync, or no canva link found yet
            // Never overwrite local edits that still wait to be pushed to Notion
            const shouldFetchBlocks =
              !hasPendingLocalPush &&
              !isBodyPushBusy(notionPageId) &&
              (!task.bodyText || canvaUrls.length === 0 || mode === 'full' || pageEditedSinceLastSync);

            if (shouldFetchBlocks) {
              const allBlocks = await fetchAllBlocks(notionPageId);

              for (const block of allBlocks) {
                const textContainers = [
                  block.paragraph?.rich_text,
                  block.bulleted_list_item?.rich_text,
                  block.numbered_list_item?.rich_text,
                  block.to_do?.rich_text,
                  block.toggle?.rich_text,
                  block.quote?.rich_text,
                  block.callout?.rich_text
                ];
                for (const rts of textContainers) {
                  if (rts) {
                    for (const rt of rts) {
                      const url = rt.href || rt.text?.link?.url || rt.plain_text;
                      if (url && url.includes('canva.link')) {
                        const match = url.match(/https?:\/\/(?:www\.)?canva\.link\/[^\s]+/i);
                        if (match) {
                          canvaUrls.push(match[0]);
                        }
                      }
                    }
                  }
                }

                // Extract from bookmarks and embeds
                const blockUrls = [block.bookmark?.url, block.embed?.url, block.link_preview?.url];
                for (const bUrl of blockUrls) {
                  if (bUrl && bUrl.includes('canva.link')) {
                    const match = bUrl.match(/https?:\/\/(?:www\.)?canva\.link\/[^\s]+/i);
                    if (match) {
                      canvaUrls.push(match[0]);
                    }
                  }
                }
              }

              const parsedBody = parseNotionBlocksToMarkdown(allBlocks);
              if (parsedBody) {
                await prisma.task.update({
                  where: { id: task.id },
                  data: { bodyText: parsedBody },
                });
              }
            }

            const uniqueCanvaUrls = Array.from(new Set(canvaUrls));
            await prisma.taskCanvaLink.deleteMany({ where: { taskId: task.id } });
            if (uniqueCanvaUrls.length > 0) {
              await prisma.taskCanvaLink.createMany({
                data: uniqueCanvaUrls.map(url => ({ taskId: task.id, url })),
              });
            }
          } catch (blockErr: any) {
            console.warn(`Could not fetch blocks for page ${notionPageId}: ${blockErr.message}`);
          }

          // Parse and link Accounts

          // Parse and link Accounts (Brands) - supports both multi-select and select
          let notionAccounts: { name: string }[] = [];
          const brandProp = p('brand');
          if (brandProp) {
            if (brandProp.multi_select) {
              notionAccounts = brandProp.multi_select;
            } else if (brandProp.select?.name) {
              notionAccounts = [{ name: brandProp.select.name }];
            }
          }
          
          // Clear old relationships
          await prisma.taskAccount.deleteMany({
            where: { taskId: task.id },
          });

          // Parse and link Accounts

          // Insert new ones
          for (const na of notionAccounts) {
            let foundAccount = accounts.find(
              (a) => a.notionKey.toLowerCase() === na.name.toLowerCase() ||
                     a.displayName.toLowerCase() === na.name.toLowerCase()
            );
            if (!foundAccount) {
              const cleanNa = na.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              foundAccount = accounts.find((a) => {
                const cleanKey = a.notionKey.toLowerCase().replace(/[^a-z0-9]/g, '');
                const cleanDisplay = a.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
                return (
                  cleanKey === cleanNa ||
                  cleanDisplay === cleanNa ||
                  (cleanNa.includes('uicreative') && cleanDisplay.includes('uicreative')) ||
                  (cleanNa.includes('impro') && cleanDisplay.includes('impro')) ||
                  (cleanNa.includes('chital') && cleanDisplay.includes('chital')) ||
                  (cleanNa.includes('antler') && cleanDisplay.includes('antler'))
                );
              });
            }
            if (!foundAccount) {
              const brandColors = ['#F97316', '#EF4444', '#10B981', '#EC4899', '#8B5CF6', '#3B82F6'];
              const randomColor = brandColors[Math.floor(Math.random() * brandColors.length)];
              const newAcc = await prisma.account.create({
                data: {
                  notionKey: na.name,
                  displayName: na.name,
                  color: randomColor,
                  platformId: unit.platformId,
                }
              });
              accounts.push(newAcc);
              foundAccount = newAcc;
            }
            await prisma.taskAccount.create({
              data: {
                taskId: task.id,
                accountId: foundAccount.id,
              },
            });
          }

          recordsSynced++;
          allSyncedNotionIds.push(notionPageId);

          const elapsedMs = Math.max(1, Date.now() - (syncProgressStore.startTime || Date.now()));
          const recordsPerMs = recordsSynced / elapsedMs;
          const totalEst = Math.max(recordsSynced, syncProgressStore.totalRecordsEst);
          const percentage = Math.min(99, Math.round((recordsSynced / totalEst) * 100));
          const remainingRecords = Math.max(0, totalEst - recordsSynced);
          const etaSeconds = Math.max(1, Math.ceil(remainingRecords / (recordsPerMs * 1000)));

          syncProgressStore = {
            ...syncProgressStore,
            processedRecords: recordsSynced,
            totalRecordsEst: totalEst,
            percentage,
            etaSeconds,
            currentStepMessage: `Mengunduh task: ${name.substring(0, 25)}...`,
            newRecords,
            failedRecords,
          };
        }

        hasMore = response.has_more;
        cursor = response.next_cursor || undefined;
      }
        syncedUnitIds.push(unit.id);
        } catch (unitErr: any) {
          // Database Notion unit ini hilang/tidak bisa diakses: lewati unit, jangan gagalkan sync production lain
          console.warn(`Skip production "${unit.name}" (database ${databaseId}): ${unitErr?.message || unitErr}`);
          skippedUnits.push(unit.name);
        }
    }

      // Platform Dropbox: tautkan folder yang sudah berisi file ke Task.outputUrl
      try {
        await syncDropboxOutputs();
      } catch (dbxErr: any) {
        console.warn('Dropbox output sync skipped:', dbxErr.message);
      }

      // Incremental results are incomplete by design. Only a full result set can
      // safely identify pages deleted from Notion.
      if (mode === 'full') {
        await prisma.task.deleteMany({
          where: {
            // Hanya production yang berhasil di-sync penuh: unit diarsipkan/gagal dibaca tidak ikut dibersihkan
            productionUnitId: { in: syncedUnitIds },
            notionPageId: { notIn: allSyncedNotionIds },
            notionUrl: { startsWith: 'https://notion.so/' }, // Only delete live tasks, keep mocks if any
          },
        });
      }

      // Update sync log success
      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: 'success',
          recordsSynced,
        },
      });

      return { 
        status: 'success', 
        recordsSynced,
        newRecords,
        updatedRecords,
        failedRecords,
        skippedUnits,
      };
    } else {
      // Fallback: Generate mock data changes to simulate active sync execution
      console.warn('Notion credentials missing. Running mock incremental sync...');
      
      // Simulate sync lag
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const designers = await prisma.designer.findMany({ where: { status: 'Active' } });
      const doctypes = await prisma.doctype.findMany();
      const accounts = await prisma.account.findMany();
      const statuses = await prisma.designStatus.findMany();

      if (designers.length === 0 || doctypes.length === 0 || accounts.length === 0) {
        throw new Error('Database is unseeded. Run seeding first before syncing.');
      }

      // We will generate 8-15 new mock tasks
      const numNewTasks = Math.floor(Math.random() * 8) + 8;
      const projectNames = [
        'Spring Collection Feed', 'Modern Presentation Template', 'Brand Pitch Slides v2',
        'Zahra Promo Poster', 'UI Assets Package', 'Company Newsletter PDF',
        'Social Media Kit', 'Product Launch Banner'
      ];
      
      const nowTime = new Date();
      let mockCreatedCount = 0;
      const mockUnit = await prisma.productionUnit.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
      if (!mockUnit) throw new Error('Belum ada production aktif untuk mock sync.');

      for (let i = 0; i < numNewTasks; i++) {
        const designer = designers[Math.floor(Math.random() * designers.length)];
        const doctype = doctypes[Math.floor(Math.random() * doctypes.length)];
        // 80% chance of approved tasks, 20% other statuses
        const status = (Math.random() < 0.8
          ? statuses.find(s => s.notionKey === 'Aproved')
          : statuses[Math.floor(Math.random() * statuses.length)]) || statuses[0];

        const pages = Math.floor(Math.random() * 10) + 2;
        const qtySubmit = Math.floor(Math.random() * 5) + 1;
        const license = Math.random() < 0.8 ? 'Pro' : 'Free';
        const languages = Math.random() < 0.7 ? ['IND'] : (Math.random() < 0.6 ? ['ENG'] : ['IND', 'ENG']);
        const dateApproved = status.countsAsApproved || status.countsAsProfileOnly
          ? new Date(nowTime.getTime() - Math.random() * 24 * 60 * 60 * 1000)
          : null;
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const taskMonth = `${monthNames[nowTime.getMonth()]}-${nowTime.getFullYear()}`;
        // Simulate manual assignment of payroll month (sometimes current month, sometimes next month)
        const isNextMonth = Math.random() > 0.5;
        const payrollMonthDate = new Date(nowTime);
        if (isNextMonth) {
          payrollMonthDate.setMonth(payrollMonthDate.getMonth() + 1);
        }
        const payrollMonth = status.countsAsApproved ? `${monthNames[payrollMonthDate.getMonth()]}-${payrollMonthDate.getFullYear()}` : null;

        const taskName = `${doctype.displayName} - ${projectNames[Math.floor(Math.random() * projectNames.length)]} [Sync #${Math.floor(Math.random() * 9000) + 1000}]`;

        const task = await prisma.task.create({
          data: {
            notionPageId: `sync_mock_page_${nowTime.getTime()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
            notionUrl: `https://notion.so/workspace/database/sync_${i}`,
            name: taskName,
            designerId: designer.id,
            doctypeId: doctype.id,
            designStatusId: status.id,
            pages,
            qtySubmit,
            license,
            languages,
            dateApproved,
            taskMonth,
            payrollMonth,
            priority: Math.random() < 0.3 ? 'High' : 'Medium',
            createdTime: nowTime,
            productionUnitId: mockUnit.id,
          },
        });

        // Link to 1 or 2 accounts
        const numBrands = Math.random() < 0.9 ? 1 : 2;
        const shuffledAccounts = [...accounts].sort(() => 0.5 - Math.random());
        for (let j = 0; j < numBrands; j++) {
          await prisma.taskAccount.create({
            data: {
              taskId: task.id,
              accountId: shuffledAccounts[j].id,
            },
          });
        }
        // Mock Canva links (70% chance to have one)
        if (Math.random() > 0.3) {
          await prisma.taskCanvaLink.create({
            data: {
              taskId: task.id,
              url: `https://www.canva.com/design/DAFAKE${Math.random().toString(36).substring(2, 10).toUpperCase()}/view`
            }
          });
        }

        mockCreatedCount++;
      }

      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: 'success',
          recordsSynced: mockCreatedCount,
        },
      });

      return { status: 'success', recordsSynced: mockCreatedCount };
    }
  } catch (error: any) {
    console.error('Notion Sync failed:', error);
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        finishedAt: new Date(),
        status: 'failed',
        errorMessage: error.message || String(error),
      },
    });

    return { status: 'failed', errorMessage: error.message || String(error) };
  } finally {
    syncProgressStore = {
      ...syncProgressStore,
      isSyncing: false,
      percentage: 100,
      etaSeconds: 0,
      currentStepMessage: 'Selesai',
    };
  }
}
