'use server';

import { denyUnless, denyWrite } from '@/lib/access';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface BundleItemInput {
  productionUnitId: string;
  doctypeId: string;
  pages: number;
}

export interface SaveBundleInput {
  id?: string;
  name: string;
  price: number;
  effectiveFrom?: string | null;
  notes?: string;
  isActive: boolean;
  items: BundleItemInput[];
}

export async function saveBundleAction(input: SaveBundleInput) {
  const denied = await denyWrite('rateCard.edit');
  if (denied) return denied as never;
  try {
    const name = input.name.trim();
    if (!name) return { success: false, error: 'Nama bundle belum diisi. Silakan isi nama bundle terlebih dahulu.' };
    if (!Number.isFinite(input.price) || input.price < 0) return { success: false, error: 'Harga paket tidak valid. Isi dengan angka 0 atau lebih.' };
    if (input.items.length < 2) return { success: false, error: 'Bundle harus memiliki minimal 2 komponen. Klik "Tambah Komponen" untuk menambah.' };

    for (const [idx, item] of input.items.entries()) {
      if (!item.productionUnitId) return { success: false, error: `Komponen ${idx + 1}: silakan pilih board (platform) terlebih dahulu.` };
      if (!item.doctypeId) return { success: false, error: `Komponen ${idx + 1}: silakan pilih doctype terlebih dahulu.` };
    }

    const doctypes = await prisma.doctype.findMany({ where: { id: { in: input.items.map((i) => i.doctypeId) } }, select: { id: true, platformId: true } });
    const units = await prisma.productionUnit.findMany({ where: { id: { in: input.items.map((i) => i.productionUnitId) } }, select: { id: true, platformId: true } });
    for (const [idx, item] of input.items.entries()) {
      const unit = units.find((u) => u.id === item.productionUnitId);
      const doctype = doctypes.find((d) => d.id === item.doctypeId);
      if (!unit || !doctype) return { success: false, error: `Komponen ${idx + 1}: board atau doctype tidak ditemukan. Muat ulang halaman lalu coba lagi.` };
      if (doctype.platformId !== unit.platformId) return { success: false, error: `Komponen ${idx + 1}: doctype yang dipilih tidak sesuai dengan board-nya. Pilih doctype dari platform yang sama.` };
      if (!Number.isFinite(item.pages) || item.pages <= 0) return { success: false, error: `Komponen ${idx + 1}: jumlah halaman harus lebih dari 0.` };
    }

    const data = {
      name,
      price: input.price,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : null,
      notes: input.notes?.trim() || null,
      isActive: input.isActive,
    };
    const items = input.items.map((i, idx) => ({ productionUnitId: i.productionUnitId, doctypeId: i.doctypeId, pages: i.pages, sortOrder: idx }));

    const bundle = await prisma.$transaction(async (tx) => {
      if (input.id) {
        await tx.bundleItem.deleteMany({ where: { bundleId: input.id } });
        return tx.bundle.update({ where: { id: input.id }, data: { ...data, items: { create: items } } });
      }
      return tx.bundle.create({ data: { ...data, items: { create: items } } });
    });

    revalidatePath('/rate-card');
    return { success: true, bundle: JSON.parse(JSON.stringify(bundle)) };
  } catch (error: any) {
    if (error?.code === 'P2003') return { success: false, error: 'Komponen bundle ini sudah dipakai oleh task/order, jadi tidak bisa diubah. Nonaktifkan bundle ini lalu buat bundle baru.' };
    return { success: false, error: 'Bundle gagal disimpan karena terjadi kesalahan pada sistem. Silakan coba lagi.' };
  }
}

export async function deleteBundleAction(id: string) {
  const denied = await denyWrite('rateCard.edit');
  if (denied) return denied as never;
  try {
    const used = await prisma.bundleOrder.count({ where: { bundleId: id } });
    if (used > 0) return { success: false, error: 'Bundle sudah punya order. Nonaktifkan saja.' };
    await prisma.bundle.delete({ where: { id } });
    revalidatePath('/rate-card');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Bundle gagal dihapus karena terjadi kesalahan pada sistem. Silakan coba lagi.' };
  }
}
