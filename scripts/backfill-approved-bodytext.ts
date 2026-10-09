import prisma from '../src/lib/prisma';
import { decrypt } from '../src/lib/encryption';
import { Client } from '@notionhq/client';
import { parseNotionBlocksToMarkdown } from '../src/lib/sync-notion';

async function fetchAllBlocks(client: Client, blockId: string, depth = 0): Promise<any[]> {
  if (depth > 3) return [];
  try {
    const response: any = await client.blocks.children.list({
      block_id: blockId,
      page_size: 100,
    });
    let blocks = response.results || [];
    const childPromises = blocks
      .filter((b: any) => b.has_children)
      .map((b: any) => fetchAllBlocks(client, b.id, depth + 1));
    const childrenArrays = await Promise.all(childPromises);
    for (const children of childrenArrays) {
      blocks = blocks.concat(children);
    }
    return blocks;
  } catch (err: any) {
    console.warn(`[fetchAllBlocks] Error fetching block ${blockId}: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log('========================================================');
  console.log('🚀 BACKFILL SCRIPT: NOTION BODY TEXT & CANVA LINKS');
  console.log('========================================================');

  const dbConfig = await prisma.notionConfig.findFirst({
    include: { databases: true }
  });

  if (!dbConfig) {
    console.error('❌ Error: No NotionConfig found in database.');
    process.exit(1);
  }

  const apiKey = decrypt(dbConfig.encryptedApiKey, dbConfig.iv);
  if (!apiKey) {
    console.error('❌ Error: Failed to decrypt Notion API key.');
    process.exit(1);
  }

  const notionClient = new Client({ auth: apiKey });

  // Find all tasks where bodyText is null or empty string
  const tasksToBackfill = await prisma.task.findMany({
    where: {
      OR: [
        { bodyText: null },
        { bodyText: '' }
      ]
    },
    include: {
      designStatus: true,
      designer: true
    },
    orderBy: { createdTime: 'desc' }
  });

  console.log(`📋 Found ${tasksToBackfill.length} tasks without bodyText in database.`);
  let updatedCount = 0;
  let emptyInNotionCount = 0;
  let failedCount = 0;

  for (let i = 0; i < tasksToBackfill.length; i++) {
    const task = tasksToBackfill[i];
    const prefix = `[${i + 1}/${tasksToBackfill.length}]`;
    const statusName = task.designStatus?.displayName || 'Unknown';
    const taskTitle = task.name || 'Untitled';

    try {
      const allBlocks = await fetchAllBlocks(notionClient, task.notionPageId);
      
      // Extract any extra Canva links embedded in body blocks
      const extraCanvaUrls: string[] = [];
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
                if (match) extraCanvaUrls.push(match[0]);
              }
            }
          }
        }
        const blockUrls = [block.bookmark?.url, block.embed?.url, block.link_preview?.url];
        for (const bUrl of blockUrls) {
          if (bUrl && bUrl.includes('canva.link')) {
            const match = bUrl.match(/https?:\/\/(?:www\.)?canva\.link\/[^\s]+/i);
            if (match) extraCanvaUrls.push(match[0]);
          }
        }
      }

      if (extraCanvaUrls.length > 0) {
        const uniqueUrls = Array.from(new Set(extraCanvaUrls));
        for (const u of uniqueUrls) {
          const exists = await prisma.taskCanvaLink.findFirst({
            where: { taskId: task.id, url: u }
          });
          if (!exists) {
            await prisma.taskCanvaLink.create({
              data: { taskId: task.id, url: u }
            });
          }
        }
      }

      const markdown = parseNotionBlocksToMarkdown(allBlocks);

      if (markdown && markdown.trim()) {
        await prisma.task.update({
          where: { id: task.id },
          data: { bodyText: markdown }
        });
        updatedCount++;
        console.log(`✅ ${prefix} Updated "${taskTitle}" (${statusName}) — ${allBlocks.length} blocks parsed.`);
      } else {
        emptyInNotionCount++;
        console.log(`⚪ ${prefix} Skipped "${taskTitle}" (${statusName}) — Page is empty in Notion.`);
      }
    } catch (err: any) {
      failedCount++;
      console.error(`❌ ${prefix} Failed "${taskTitle}": ${err.message}`);
    }
  }

  console.log('\n========================================================');
  console.log('🎉 BACKFILL COMPLETED!');
  console.log('========================================================');
  console.log(`Total Tasks Processed     : ${tasksToBackfill.length}`);
  console.log(`Successfully Updated       : ${updatedCount}`);
  console.log(`Empty/No Content in Notion: ${emptyInNotionCount}`);
  console.log(`Failed                    : ${failedCount}`);
  console.log('========================================================');
}

main()
  .catch((err) => {
    console.error('Backfill script error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
