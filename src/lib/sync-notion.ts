import prisma from '@/lib/prisma';
import { Client } from '@notionhq/client';
import { decrypt } from '@/lib/encryption';

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
    let activeApiKey = process.env.NOTION_API_KEY || null;
    let databasesToSync: string[] = [];
    
    if (process.env.NOTION_DATABASE_ID) {
      databasesToSync.push(process.env.NOTION_DATABASE_ID);
    }

    // Load credentials from database first
    const dbConfig = await prisma.notionConfig.findFirst({
      include: { databases: true }
    });
    if (dbConfig) {
      try {
        const decryptedApiKey = decrypt(dbConfig.encryptedApiKey, dbConfig.iv);
        if (decryptedApiKey) activeApiKey = decryptedApiKey;
        
        const dbIds = dbConfig.databases.map(db => decrypt(db.encryptedDatabaseId, db.iv)).filter(Boolean) as string[];
        if (dbIds.length > 0) {
          databasesToSync = dbIds;
        }
      } catch (err) {
        console.error('Failed to decrypt database-stored Notion config:', err);
      }
    }

    if (activeApiKey && databasesToSync.length > 0) {
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
      const lastSyncTime = lastSync
        ? new Date(lastSync.startedAt.getTime() - INCREMENTAL_OVERLAP_MS).toISOString()
        : undefined;

      // Ensure reference metadata exists (designers, doctypes, accounts, statuses)
      const designers = await prisma.designer.findMany();
      const doctypes = await prisma.doctype.findMany();
      const accounts = await prisma.account.findMany();
      const statuses = await prisma.designStatus.findMany();

      console.log('Clearing old mock tasks from database...');
      // Clear relations first
      await prisma.taskAccount.deleteMany({
        where: {
          task: {
            OR: [
              { notionPageId: { startsWith: 'notion_page_' } },
              { notionPageId: { startsWith: 'sync_mock_page_' } },
            ]
          }
        }
      });
      // Clear tasks
      await prisma.task.deleteMany({
        where: {
          OR: [
            { notionPageId: { startsWith: 'notion_page_' } },
            { notionPageId: { startsWith: 'sync_mock_page_' } },
          ]
        }
      });

      const allSyncedNotionIds: string[] = [];

      for (const databaseId of databasesToSync) {
        console.log(`Starting live Notion sync for database: ${databaseId}...`);
        
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
            const notionPageId = page.id;
            const notionUrl = page.url;

            // Parse name
            const name = properties.Name?.title?.map((t: any) => t.plain_text).join('') || 'Untitled Task';

            const designerName = properties.Designer?.select?.name;
          const designerStatusProp = properties['Designer Status']?.select?.name;
          
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
          const doctypeName = properties.Doctype?.select?.name;

          let doctypeId = null;
          if (doctypeName) {
            let foundDoctype = doctypes.find(
              (dt) => dt.notionKey.toLowerCase() === doctypeName.toLowerCase() ||
                      dt.displayName.toLowerCase() === doctypeName.toLowerCase()
            );
            
            if (!foundDoctype) {
              const newDt = await prisma.doctype.create({
                data: {
                  notionKey: doctypeName,
                  displayName: doctypeName,
                  isTopSpecialist: false,
                  sortOrder: doctypes.length + 1,
                  poolRate: 1.0,
                  pages: 1.0,
                }
              });
              doctypes.push(newDt);
              foundDoctype = newDt;
            }
            doctypeId = foundDoctype!.id;
          }

          // Parse Design Status (lookup by name/notionKey, create if missing)
          const statusProp = properties['Design Status'];
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
          const pages = properties.Pages?.number || 0;
          const qtySubmit = properties['QTY-Submit']?.number || 0;
          const license = properties.License?.select?.name || 'Free';
          
          let languages: string[] = [];
          const indEngProp = properties['IND/ENG'];
          if (indEngProp) {
            if (indEngProp.multi_select) {
              languages = indEngProp.multi_select.map((x: any) => x.name);
            } else if (indEngProp.select?.name) {
              languages = [indEngProp.select.name];
            }
          }
          
          const dateApprovedVal = properties['Date Aproved']?.date?.start;
          const dateApproved = dateApprovedVal ? new Date(dateApprovedVal) : null;
          
          const taskMonth = properties['Task Month']?.select?.name || null;
          const payrollMonth = properties['Payroll Month']?.select?.name || null;
          const priority = properties.Priority?.select?.name || 'Medium';
          
          // Get card created date from Notion (check custom properties or standard metadata)
          let createdTime = new Date(page.created_time);
          const customCreatedVal = 
            properties.Created?.date?.start || 
            properties['Created date']?.date?.start || 
            properties['Created Date']?.date?.start || 
            properties['Created Time']?.date?.start ||
            properties['Created Time']?.created_time ||
            properties.Created?.created_time;
          if (customCreatedVal) {
            createdTime = new Date(customCreatedVal);
          }

          const lastEditedTime = new Date(page.last_edited_time || new Date());
          const dateStartedVal = properties['Date Started']?.date?.start;
          const dateStarted = dateStartedVal ? new Date(dateStartedVal) : null;
          const dateCompletedVal = properties['Date Completd']?.date?.start || properties['Date Completed']?.date?.start;
          const dateCompleted = dateCompletedVal ? new Date(dateCompletedVal) : null;
          const datePOVal = properties['Date PO']?.date?.start;
          const datePO = datePOVal ? new Date(datePOVal) : null;
          const dateRejectVal = properties['Date Reject']?.date?.start;
          const dateReject = dateRejectVal ? new Date(dateRejectVal) : null;
          const poolScore = properties['Pool Score']?.number ?? null;

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
              syncedAt: new Date(),
          };

          // Upsert Task
          const existingTask = await prisma.task.findUnique({
            where: { notionPageId },
            select: { id: true },
          });

          if (existingTask) {
            updatedRecords++;
          } else {
            newRecords++;
          }

          const task = await prisma.task.upsert({
            where: { notionPageId },
            update: taskData,
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
            const canvaProp = properties['Template Link'] || properties['Canva Link'] || properties.Canva || properties.URL;
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

            // Only fetch blocks if we didn't find links in the properties (saves API calls and time)
            if (canvaUrls.length === 0) {
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
            } // END if (canvaUrls.length === 0)

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
          const brandProp = properties.Brand || properties.Account;
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
              const brandColors = ['#F97316', '#EF4444', '#10B981', '#EC4899', '#8B5CF6', '#3B82F6'];
              const randomColor = brandColors[Math.floor(Math.random() * brandColors.length)];
              const newAcc = await prisma.account.create({
                data: {
                  notionKey: na.name,
                  displayName: na.name,
                  color: randomColor,
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
    }

      // Incremental results are incomplete by design. Only a full result set can
      // safely identify pages deleted from Notion.
      if (mode === 'full') {
        await prisma.task.deleteMany({
          where: {
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
