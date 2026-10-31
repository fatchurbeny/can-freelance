'use server';

import { denyUnless, denyWrite } from '@/lib/access';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createTaskAction, updateTaskFieldsAction } from '@/app/actions/qa';
import { parseTaskMonthToKey, taskMonthsInRange } from '@/lib/period-utils';

export interface CreateBundleOrderInput {
  bundleId: string;
  designerId: string;
  /** Task Month / periode payout, mis. "Oktober-2026". */
  period: string;
  /** Judul order; dipakai sebagai awalan nama tiap task. */
  title: string;
  bodyText?: string;
  /** Order periode dari kontrak bundle: bundle, designer, harga & tipe diambil dari kontrak. Tanpa ini = Trial. */
  contractId?: string | null;
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
    if (!input.period.trim()) return { success: false, error: 'Periode wajib diisi.' };

    // Order kontrak: semua data inti mengikuti kontrak; periode harus di dalam masa kontrak & belum dipakai
    const contract = input.contractId
      ? await prisma.bundleContract.findUnique({ where: { id: input.contractId }, include: { orders: { select: { period: true } } } })
      : null;
    if (input.contractId && !contract) return { success: false, error: 'Kontrak tidak ditemukan.' };
    if (contract) {
      const periodKey = parseTaskMonthToKey(input.period);
      const allowed = taskMonthsInRange(contract.contractStartDate, contract.contractEndDate);
      if (!periodKey || !allowed.some((m) => parseTaskMonthToKey(m) === periodKey)) {
        return { success: false, error: `Periode di luar masa kontrak (${allowed[0]} – ${allowed[allowed.length - 1]}).` };
      }
      if (contract.orders.some((o) => parseTaskMonthToKey(o.period) === periodKey)) {
        return { success: false, error: 'Periode ini sudah punya order di kontrak yang sama.' };
      }
    }
    const designerId = contract ? contract.designerId : input.designerId;
    if (!designerId) return { success: false, error: 'Designer / agency wajib dipilih.' };

    const bundle = await prisma.bundle.findUnique({
      where: { id: contract ? contract.bundleId : input.bundleId },
      include: { items: { orderBy: { sortOrder: 'asc' }, include: { productionUnit: true } } },
    });
    if (!bundle) return { success: false, error: 'Bundle tidak ditemukan.' };
    if (!bundle.isActive) return { success: false, error: 'Bundle tidak aktif.' };
    if (bundle.items.length === 0) return { success: false, error: 'Bundle belum punya komponen.' };

    const price = contract ? contract.price : bundle.price;
    const paymentType = input.paymentType === 'DP' ? 'DP' : 'Full';
    const dpAmount = paymentType === 'DP' ? Number(input.dpAmount) : 0;
    if (paymentType === 'DP' && (!Number.isFinite(dpAmount) || dpAmount <= 0 || dpAmount >= Number(price))) {
      return { success: false, error: 'Nominal DP harus lebih dari 0 dan kurang dari harga.' };
    }

    const order = await prisma.bundleOrder.create({
      data: {
        bundleId: bundle.id,
        designerId,
        period: input.period.trim(),
        price,
        paymentType,
        dpAmount,
        orderType: contract ? 'Kontrak' : 'Trial',
        contractId: contract?.id ?? null,
        payoutMonth: input.payoutMonth?.trim() || null,
      },
    });

    const failures: string[] = [];
    const notionMissing: string[] = [];
    for (const item of bundle.items) {
      const res = await createTaskAction({
        productionUnitId: item.productionUnitId,
        name: `${title} — ${item.productionUnit.name}`,
        designerId,
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
      if ('notionWarning' in res && res.notionWarning) notionMissing.push(item.productionUnit.name);
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
    const warning = notionMissing.length
      ? `Halaman Notion gagal dibuat untuk task di ${notionMissing.join(', ')}. Buka task-nya lalu klik "Buat di Notion".`
      : undefined;
    return { success: true, orderId: order.id, warning };
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
    const contract = await prisma.bundleContract.findUnique({ where: { trialOrderId: orderId }, select: { id: true } });
    if (contract) return { success: false, error: 'Trial ini sudah dijadikan kontrak, tidak bisa dihapus.' };
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

/**
 * Trial yang lolos (semua task approved) dijadikan kontrak bundle berperiode. Order trial tetap tercatat
 * sebagai Trial; order tiap periode kontrak dibuat manual lewat `createBundleOrderAction({ contractId })`.
 */
export async function createBundleContractAction(input: {
  trialOrderId: string;
  price: number;
  contractStartDate: string;
  contractEndDate: string;
  notes?: string | null;
}) {
  const denied = await denyWrite('billing.view');
  if (denied) return denied as never;
  try {
    const trial = await prisma.bundleOrder.findUnique({
      where: { id: input.trialOrderId },
      include: {
        contractFromTrial: { select: { id: true } },
        designer: { select: { status: true } },
        tasks: { select: { designStatus: { select: { countsAsApproved: true } } } },
      },
    });
    if (!trial) return { success: false, error: 'Order trial tidak ditemukan.' };
    if (trial.orderType !== 'Trial') return { success: false, error: 'Hanya order Trial yang bisa dijadikan kontrak.' };
    if (trial.contractFromTrial) return { success: false, error: 'Trial ini sudah dijadikan kontrak.' };
    const approved = trial.tasks.filter((t) => t.designStatus?.countsAsApproved).length;
    if (trial.tasks.length === 0 || approved < trial.tasks.length) {
      return { success: false, error: `Trial belum lolos: ${approved}/${trial.tasks.length} task approved.` };
    }
    if (!trial.designerId) return { success: false, error: 'Trial belum punya designer / agency.' };
    if (trial.designer?.status === 'Resign') return { success: false, error: 'Designer trial berstatus Resign.' };

    if (!Number.isFinite(input.price) || input.price <= 0) return { success: false, error: 'Harga per periode wajib diisi (lebih dari 0).' };
    const start = new Date(`${input.contractStartDate}T00:00:00Z`);
    const end = new Date(`${input.contractEndDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { success: false, error: 'Periode kontrak wajib diisi.' };
    if (end < start) return { success: false, error: 'Tanggal akhir harus setelah tanggal mulai.' };

    const contract = await prisma.bundleContract.create({
      data: {
        bundleId: trial.bundleId,
        designerId: trial.designerId,
        trialOrderId: trial.id,
        price: Math.round(input.price),
        contractStartDate: start,
        contractEndDate: end,
        notes: input.notes?.trim() || null,
      },
    });
    revalidatePath('/billing-statement');
    return { success: true, contractId: contract.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat kontrak bundle.' };
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

/**
 * Ganti designer/agency order bundle. Order adalah sumber utama: semua task bundle ikut diganti
 * (lewat updateTaskFieldsAction agar tersinkron ke Notion). Bila pembayaran sudah dicatat, pemanggil harus
 * mengonfirmasi (`confirmPaid`) bahwa catatan pembayaran ikut pindah ke designer baru (koreksi data).
 */
export async function updateBundleOrderDesignerAction(orderId: string, designerId: string, confirmPaid = false) {
  const denied = await denyWrite('billing.view');
  if (denied) return denied as never;
  try {
    const order = await prisma.bundleOrder.findUnique({ where: { id: orderId }, include: { tasks: { select: { id: true } } } });
    if (!order) return { success: false, error: 'Order tidak ditemukan.' };
    if ((order.dpPaidAt || order.paidAt) && !confirmPaid) {
      return { success: false, needsConfirm: true, error: 'Order ini sudah punya pembayaran tercatat; catatan itu ikut pindah ke designer baru.' };
    }
    const designer = await prisma.designer.findUnique({ where: { id: designerId }, select: { id: true, status: true } });
    if (!designer) return { success: false, error: 'Designer tidak ditemukan.' };
    if (designer.status === 'Resign') return { success: false, error: 'Designer sudah resign.' };

    if (order.designerId !== designerId) {
      await prisma.bundleOrder.update({ where: { id: orderId }, data: { designerId } });
    }
    const failures: string[] = [];
    for (const task of order.tasks) {
      const res = await updateTaskFieldsAction(task.id, { designerId });
      if (!res.success) failures.push(res.error || task.id);
    }

    revalidatePath('/billing-statement');
    revalidatePath('/production', 'layout');
    if (failures.length) return { success: false, error: `Order diperbarui, tetapi sebagian task gagal: ${failures.join('; ')}` };
    return { success: true };
  } catch {
    return { success: false, error: 'Designer gagal diganti karena terjadi kesalahan pada sistem. Silakan coba lagi.' };
  }
}
