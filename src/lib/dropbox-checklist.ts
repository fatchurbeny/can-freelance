/**
 * Slide Master Builder F2: baca folder Dropbox task → snapshot file + centang otomatis Checklist QA.
 * Dipanggil saat sync Notion (termasuk Sync Now), saat task masuk QA, dan dari tombol "Periksa folder".
 *
 * Hanya format yang BARU muncul sejak snapshot sebelumnya yang dicentang, jadi centang yang
 * dilepas QA tidak dipasang ulang pada sync berikutnya.
 */

import prisma from '@/lib/prisma';
import { Prisma } from '../../generated/prisma';
import { getDropboxStatus, listFolderFiles, taskFolderPath } from '@/lib/dropbox';
import { itemsFoundInFiles, readSnapshot, type DropboxSnapshot } from '@/lib/dropbox-files';
import { ensureChecklistSection, setChecklistItem } from '@/lib/checklist-qa';
import { orderBriefMarkdown } from '@/components/task-detail/brief-parser';
import { isNotionLinked } from '@/lib/notion-link';
import { getNotionClient } from '@/lib/notion-provision';
import { pushBodyToNotion } from '@/lib/notion-body-push';
import { markdownToNotionBlocks } from '@/lib/notion-body-blocks';

export interface DropboxScanResult {
  scanned: number;
  ticked: number;
}

/** Pindai task Dropbox yang sudah punya File Request. Tanpa `taskIds`: semua task yang belum disetujui. */
export async function scanDropboxChecklists(taskIds?: string[]): Promise<DropboxScanResult> {
  const status = await getDropboxStatus();
  if (!status.connected) return { scanned: 0, ticked: 0 };

  const tasks = await prisma.task.findMany({
    where: {
      uploadRequestUrl: { not: null },
      productionUnit: { platform: { outputType: 'dropbox_link' }, dropboxRoot: { not: null } },
      ...(taskIds
        ? { id: { in: taskIds } }
        : { OR: [{ designStatus: null }, { designStatus: { countsAsApproved: false } }] }),
    },
    include: { productionUnit: true, doctype: { select: { qaChecklist: true } } },
  });

  let scanned = 0;
  let ticked = 0;
  for (const task of tasks) {
    try {
      const path = task.dropboxFolderPath
        ?? taskFolderPath(task.productionUnit.dropboxRoot!, task.taskMonth, task.name ?? 'Untitled');
      const files = await listFolderFiles(path);
      scanned++;

      const required = task.doctype?.qaChecklist ?? [];
      const before = itemsFoundInFiles(required, readSnapshot(task.dropboxFiles)?.files ?? []);
      const newlyFound = itemsFoundInFiles(required, files ?? []).filter((label) => !before.includes(label));

      let body = task.bodyText;
      if (newlyFound.length) {
        body = ensureChecklistSection(body, required);
        for (const label of newlyFound) body = setChecklistItem(body, required, label, true);
        body = orderBriefMarkdown(body);
      }
      const bodyChanged = (body ?? null) !== (task.bodyText ?? null);

      const snapshot: DropboxSnapshot = { files: files ?? [] };
      await prisma.task.update({
        where: { id: task.id },
        data: {
          dropboxFiles: snapshot as unknown as Prisma.InputJsonObject,
          dropboxScannedAt: new Date(),
          // Path hasil hitungan disimpan setelah foldernya terbukti ada (tahan task di-rename)
          ...(!task.dropboxFolderPath && files ? { dropboxFolderPath: path } : {}),
          ...(bodyChanged ? { bodyText: body, lastEditedTime: new Date() } : {}),
        },
      });

      if (bodyChanged) {
        ticked += newlyFound.length;
        if (isNotionLinked(task.notionPageId)) {
          await pushBodyToNotion(await getNotionClient(), task.notionPageId, body, markdownToNotionBlocks);
        }
      }
    } catch (err: any) {
      console.warn(`[dropbox-checklist] task ${task.id}: ${err.message}`);
    }
  }
  return { scanned, ticked };
}
