/**
 * Output Dropbox per task (multi-production Fase 6).
 * - Saat task dibuat di platform Dropbox: buat File Request di folder {root}/{Bulan}/{Task}.
 * - Simpan URL di Task.uploadRequestUrl dan di properti Notion "Upload Link".
 */

import prisma from '@/lib/prisma';
import {
  createFileRequest,
  folderHasFiles,
  getOrCreateFolderLink,
  taskFolderPath,
  getDropboxStatus,
} from '@/lib/dropbox';
import { ensureUrlProperty, setNotionPageUrl } from '@/lib/notion-provision';

export const UPLOAD_LINK_PROPERTY = 'Upload Link';
export const DROPBOX_LINK_PROPERTY = 'Dropbox Link';

export async function attachUploadRequest(taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { productionUnit: { include: { platform: true } } },
  });
  if (!task) return;
  const unit = task.productionUnit;
  if (unit.platform.outputType !== 'dropbox_link' || task.uploadRequestUrl) return;
  if (!unit.dropboxRoot) return;

  const status = await getDropboxStatus();
  if (!status.connected) return;

  const folder = taskFolderPath(unit.dropboxRoot, task.taskMonth, task.name ?? 'Untitled');
  const url = await createFileRequest(task.name ?? 'Upload', folder);
  await prisma.task.update({ where: { id: task.id }, data: { uploadRequestUrl: url } });

  // Tulis ke Notion hanya untuk task yang berasal dari Notion (bukan dibuat lokal/mock)
  const fromNotion = !task.notionPageId.startsWith('app_created_') && !task.notionPageId.startsWith('sync_mock_page_');
  if (fromNotion) {
    await ensureUrlProperty(unit.notionTaskDbId, UPLOAD_LINK_PROPERTY);
    await setNotionPageUrl(task.notionPageId, UPLOAD_LINK_PROPERTY, url);
  }
}

/** Validator output Dropbox: link harus berupa URL https ke domain Dropbox. */
export function isDropboxUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'www.dropbox.com' || u.hostname.endsWith('.dropbox.com'));
  } catch (_) {
    return false;
  }
}

/**
 * Dipanggil saat sync: untuk task Dropbox yang belum punya output dan belum disetujui,
 * jika folder upload sudah berisi file, buat shared link folder → Task.outputUrl.
 */
export async function syncDropboxOutputs(): Promise<{ linked: number }> {
  const status = await getDropboxStatus();
  if (!status.connected) return { linked: 0 };

  const tasks = await prisma.task.findMany({
    where: {
      uploadRequestUrl: { not: null },
      outputUrl: null,
      productionUnit: { platform: { outputType: 'dropbox_link' }, dropboxRoot: { not: null } },
      OR: [{ designStatus: null }, { designStatus: { countsAsApproved: false } }],
    },
    include: { productionUnit: true },
  });

  let linked = 0;
  for (const task of tasks) {
    try {
      const folder = taskFolderPath(task.productionUnit.dropboxRoot!, task.taskMonth, task.name ?? 'Untitled');
      if (!(await folderHasFiles(folder))) continue;
      const link = await getOrCreateFolderLink(folder);
      if (!isDropboxUrl(link)) continue;
      await prisma.task.update({ where: { id: task.id }, data: { outputUrl: link } });

      // Tulis ke Notion (properti "Dropbox Link") untuk task yang berasal dari Notion
      const fromNotion = !task.notionPageId.startsWith('app_created_') && !task.notionPageId.startsWith('sync_mock_page_');
      if (fromNotion) {
        await ensureUrlProperty(task.productionUnit.notionTaskDbId, DROPBOX_LINK_PROPERTY);
        await setNotionPageUrl(task.notionPageId, DROPBOX_LINK_PROPERTY, link);
      }
      linked++;
    } catch (err: any) {
      console.warn(`[dropbox-sync] task ${task.id}: ${err.message}`);
    }
  }
  return { linked };
}
