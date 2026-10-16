'use server';

import { denyUnless, denyWrite } from '@/lib/access';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createTaskAction } from '@/app/actions/qa';

export interface CreateBundleOrderInput {
  bundleId: string;
  designerId: string;
  /** Task Month / periode payout, mis. "Oktober-2026". */
  period: string;
  /** Judul order; dipakai sebagai awalan nama tiap task. */
  title: string;
  bodyText?: string;
  orderType?: 'Trial' | 'Kontrak';
  /** Bulan payout ke designer; kosong = masuk antrian Closing. */
  payoutMonth?: string | null;
  paymentType?: 'Full' | 'DP';
  /** Nominal DP (hanya untuk paymentType 'DP'). */
  dpAmount?: number;
}

/** Buat satu BundleOrder + satu task per komponen bundle di board masing-masing. Harga di-snapshot. */
export async function createBundleOrderAction(input: CreateBundleOrderInput) {
  const denied = await denyWrite('billing.view');
  if (denied) return denied as never;
  try {
    const title = input.title.trim();
    if (!title) return { success: false, error: 'Judul order wajib diisi.' };
    if (!input.designerId) return { success: false, error: 'Designer / agency wajib dipilih.' };
    if (!input.period.trim()) return { success: false, error: 'Periode wajib diisi.' };

    const bundle = await prisma.bundle.findUnique({
      where: { id: input.bundleId },
      include: { items: { orderBy: { sortOrder: 'asc' }, include: { productionUnit: true } } },
    });
    if (!bundle) return { success: false, error: 'Bundle tidak ditemukan.' };
    if (!bundle.isActive) return { success: false, error: 'Bundle tidak aktif.' };
    if (bundle.items.length === 0) return { success: false, error: 'Bundle belum punya komponen.' };

    const paymentType = input.paymentType === 'DP' ? 'DP' : 'Full';
    const dpAmount = paymentType === 'DP' ? Number(input.dpAmount) : 0;
    if (paymentType === 'DP' && (!Number.isFinite(dpAmount) || dpAmount <= 0 || dpAmount >= Number(bundle.price))) {
      return { success: false, error: 'Nominal DP harus lebih dari 0 dan kurang dari harga paket.' };
    }

    const order = await prisma.bundleOrder.create({
      data: { bundleId: bundle.id, designerId: input.designerId, period: input.period.trim(), price: bundle.price, paymentType, dpAmount, orderType: input.orderType === 'Kontrak' ? 'Kontrak' : 'Trial', payoutMonth: input.payoutMonth?.trim() || null },
    });

    const failures: string[] = [];
    for (const item of bundle.items) {
      const res = await createTaskAction({
        productionUnitId: item.productionUnitId,
        name: `${title} — ${item.productionUnit.name}`,
        designerId: input.designerId,
        doctypeId: item.doctypeId,
        pages: item.pages,
        qtySubmit: 1,
        taskMonth: input.period.trim(),
        bodyText: input.bodyText || null,
      });
      if (!res.success || !('taskId' in res) || !res.taskId) {
        failures.push(`${item.productionUnit.name}: ${('error' in res && res.error) || 'gagal'}`);
        continue;
      }
      await prisma.task.update({
        where: { id: res.taskId },
        data: { bundleId: bundle.id, bundleItemId: item.id, bundleOrderId: order.id },
      });
    }

    revalidatePath('/billing-statement');
    revalidatePath('/production', 'layout');
    if (failures.length) {
      return { success: false, error: `Order dibuat, tetapi sebagian task gagal: ${failures.join('; ')}`, orderId: order.id };
    }
    return { success: true, orderId: order.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat order bundle.' };
  }
}

export async function deleteBundleOrderAction(orderId: string) {
  const denied = await denyWrite('billing.view');
  if (denied) return denied as never;
  try {
    const tasks = await prisma.task.count({ where: { bundleOrderId: orderId } });
    if (tasks > 0) return { success: false, error: 'Order masih punya task. Hapus task-nya dulu.' };
    await prisma.bundleOrder.delete({ where: { id: orderId } });
    revalidatePath('/billing-statement');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus order.' };
  }
}

/** Catat pembayaran: 'dp' = DP diterima, 'full' = pelunasan, 'reset' = batalkan pembayaran. */
export async function updateBundleOrderPaymentAction(orderId: string, step: 'dp' | 'full' | 'reset') {
  const denied = await denyWrite('billing.view');
  if (denied) return denied as never;
  try {
    const order = await prisma.bundleOrder.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: 'Order tidak ditemukan.' };
    const now = new Date();
    if (step === 'dp') {
      if (order.paymentType !== 'DP') return { success: false, error: 'Order ini dibayar lunas, tidak memakai DP.' };
      if (order.paidAt) return { success: false, error: 'Order sudah lunas.' };
      await prisma.bundleOrder.update({ where: { id: orderId }, data: { dpPaidAt: now } });
    } else if (step === 'full') {
      if (order.paymentType === 'DP' && !order.dpPaidAt) return { success: false, error: 'DP belum dibayar. Catat DP terlebih dahulu.' };
      await prisma.bundleOrder.update({ where: { id: orderId }, data: { paidAt: now } });
    } else {
      await prisma.bundleOrder.update({ where: { id: orderId }, data: { dpPaidAt: null, paidAt: null } });
    }
    revalidatePath('/billing-statement');
    return { success: true };
  } catch {
    return { success: false, error: 'Pembayaran gagal dicatat karena terjadi kesalahan pada sistem. Silakan coba lagi.' };
  }
}

/** Set Payout Month untuk beberapa order sekaligus (tab Closing). */
export async function setBundleOrderPayoutMonthAction(orderIds: string[], payoutMonth: string) {
  const denied = await denyWrite('billing.view');
  if (denied) return denied as never;
  try {
    const month = payoutMonth.trim();
    if (!month) return { success: false, error: 'Pilih bulan payout terlebih dahulu.' };
    if (orderIds.length === 0) return { success: false, error: 'Pilih minimal satu order bundle.' };
    await prisma.bundleOrder.updateMany({ where: { id: { in: orderIds } }, data: { payoutMonth: month } });
    revalidatePath('/billing-statement');
    return { success: true };
  } catch {
    return { success: false, error: 'Payout Month gagal disimpan karena terjadi kesalahan pada sistem. Silakan coba lagi.' };
  }
}

/** Trial yang sudah oke dijadikan kontrak (order berikutnya dibuat manual per periode). */
export async function convertBundleOrderToContractAction(orderId: string) {
  const denied = await denyWrite('billing.view');
  if (denied) return denied as never;
  try {
    await prisma.bundleOrder.update({ where: { id: orderId }, data: { orderType: 'Kontrak' } });
    revalidatePath('/billing-statement');
    return { success: true };
  } catch {
    return { success: false, error: 'Gagal menjadikan kontrak karena terjadi kesalahan pada sistem. Silakan coba lagi.' };
  }
}

/** Catat DP yang sudah dibayar: set skema DP, nominal, dan tanggal bayar sekarang (bisa dipakai juga untuk order lama bertipe Lunas). */
export async function recordBundleOrderDpAction(orderId: string, amount: number) {
  const denied = await denyWrite('billing.view');
  if (denied) return denied as never;
  try {
    const order = await prisma.bundleOrder.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: 'Order tidak ditemukan.' };
    if (order.paidAt) return { success: false, error: 'Order sudah lunas, DP tidak bisa dicatat.' };
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Nominal DP harus lebih dari 0.' };
    if (amount >= Number(order.price)) return { success: false, error: 'Nominal DP harus kurang dari harga paket. Untuk bayar penuh, gunakan Tandai Lunas.' };
    await prisma.bundleOrder.update({ where: { id: orderId }, data: { paymentType: 'DP', dpAmount: amount, dpPaidAt: new Date() } });
    revalidatePath('/billing-statement');
    return { success: true };
  } catch {
    return { success: false, error: 'DP gagal dicatat karena terjadi kesalahan pada sistem. Silakan coba lagi.' };
  }
}
