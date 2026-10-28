import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

const compact = (id: string) => id.replace(/-/g, '').toLowerCase();

/**
 * Daftarkan database ke Notion Config → Databases agar fitur yang membaca daftar itu ikut mengenalnya.
 * Lewati bila ID sudah terdaftar atau Notion Config belum ada. `purpose` menandai database khusus
 * (mis. "asset_library"). Best-effort: kegagalan hanya dicatat, tidak membatalkan aksi pemanggil.
 */
export async function registerNotionDatabase(
  name: string,
  databaseId: string,
  parentPageId?: string | null,
  purpose?: string | null,
) {
  try {
    const config = await prisma.notionConfig.findFirst({ include: { databases: true } });
    if (!config || !databaseId) return;
    const target = compact(databaseId);
    const parent = parentPageId ? compact(parentPageId) : null;
    const existing = config.databases.find((db) => {
      try { return compact(decrypt(db.encryptedDatabaseId, db.iv)) === target; } catch { return false; }
    });
    if (existing) {
      // Dipakai lagi: keluarkan dari arsip, lengkapi page induk & kegunaan
      if (existing.archived || (!existing.parentPageId && parent) || (purpose && existing.purpose !== purpose)) {
        await prisma.notionDatabase.update({
          where: { id: existing.id },
          data: { archived: false, parentPageId: existing.parentPageId ?? parent, ...(purpose ? { purpose } : {}) },
        });
      }
      return;
    }
    const { iv, encryptedData } = encrypt(databaseId);
    await prisma.notionDatabase.create({
      data: { name, encryptedDatabaseId: encryptedData, iv, configId: config.id, parentPageId: parent, purpose: purpose ?? null },
    });
    try { revalidatePath('/notion-config', 'layout'); } catch {}
  } catch (error: any) {
    console.warn(`Gagal mendaftarkan database Notion "${name}" ke Notion Config:`, error?.message || error);
  }
}
