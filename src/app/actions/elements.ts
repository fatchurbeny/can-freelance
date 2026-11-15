'use server';

import prisma from '@/lib/prisma';
import { getAccess } from '@/lib/access';
import { fetchElementLibrary } from '@/lib/impro-elements';
import type { ElementCategoryKey } from '@/lib/element-categories';

export interface ElementSetItem {
  ref: string;
  brandId: string;
  name: string;
  style: string | null;
  category: ElementCategoryKey;
  count: number;
  thumbs: string[];
}

export type ElementLibraryResult =
  | { success: true; sets: ElementSetItem[]; brands: { id: string; name: string }[] | null }
  | { success: false; error: string };

/**
 * Katalog set elemen improstd untuk picker 🧩 Elemen di Design Brief (kontrak I-23).
 * Hanya untuk yang boleh mengedit brief. Tanpa `account.view`, nama/handle brand tidak dikirim
 * (`brands: null`); set dan thumbnail tetap boleh.
 */
export async function getElementLibraryAction(): Promise<ElementLibraryResult> {
  const access = await getAccess();
  if (access.enabled) {
    if (!access.user || access.user.pinMustChange) return { success: false, error: 'Sesi berakhir. Silakan masuk lagi.' };
    if (!access.allows('task.edit') && !access.allows('task.edit.own')) return { success: false, error: 'Anda tidak punya izin untuk aksi ini.' };
  }
  try {
    const lib = await fetchElementLibrary();
    const sets: ElementSetItem[] = lib.sets.map((s) => ({
      ref: s.ref,
      brandId: s.brand,
      name: s.name,
      style: s.style ?? null,
      category: s.category,
      count: s.count,
      thumbs: (s.thumbs ?? []).slice(0, 4),
    }));
    if (!access.allows('account.view')) return { success: true, sets, brands: null };
    // Nama brand: akun Canva di app (Account.canvaBrandId), fallback nama dari katalog.
    const accounts = await prisma.account.findMany({
      where: { canvaBrandId: { in: lib.brands.map((b) => b.id) } },
      select: { canvaBrandId: true, displayName: true },
    });
    const names = new Map(accounts.map((a) => [a.canvaBrandId, a.displayName]));
    const brands = lib.brands.map((b) => ({ id: b.id, name: names.get(b.id) || b.name || b.handle || b.id }));
    return { success: true, sets, brands };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat katalog elemen.' };
  }
}
