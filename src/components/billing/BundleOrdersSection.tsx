'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Package, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createBundleOrderAction, deleteBundleOrderAction, updateBundleOrderPaymentAction, recordBundleOrderDpAction, updateBundleOrderDesignerAction } from '@/app/actions/bundle-order';
import type { BundleContractSummary } from '@/lib/queries';
import { parseTaskMonthToKey } from '@/lib/period-utils';
import PlatformSelectCell from '../PlatformSelectCell';
import MonthCalendarPicker from '../MonthCalendarPicker';
import BundleOrderDetailDrawer from './BundleOrderDetailDrawer';
import BundleContractDrawer from './BundleContractDrawer';

export interface BundleOrderRow {
  id: string;
  bundleId?: string;
  designerId?: string | null;
  orderType: 'Trial' | 'Kontrak';
  period?: string | null;
  payoutMonth?: string | null;
  bundleName: string;
  designerName: string;
  isAgency: boolean;
  price: number;
  paymentType: 'Full' | 'DP';
  dpAmount: number;
  dpPaid: boolean;
  paid: boolean;
  dpPaidAt?: string | null;
  paidAt?: string | null;
  totalTasks: number;
  approvedTasks: number;
  completed: boolean;
  tasks: { id: string; name: string; board: string; approved: boolean }[];
  /** Kontrak tempat order ini menjadi satu periode (order Kontrak). */
  contract?: BundleContractSummary | null;
  /** Kontrak yang lahir dari order Trial ini. */
  trialContract?: BundleContractSummary | null;
  /** Urutan periode order ini di kontrak (1-based; 0 = bukan order kontrak). */
  contractPeriodIndex?: number;
}

interface Props {
  rows: BundleOrderRow[];
  periodLabel: string;
  bundles: { id: string; name: string; price: number }[];
  designers: { id: string; displayName: string; isAgency: boolean }[];
  months: string[];
}

const LABEL = 'w-[130px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-4 flex items-center font-bold text-gray-500 dark:text-gray-400 select-none';
const INPUT = 'flex-1 min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-4 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f]';
const money = (n: number) => `IDR ${n.toLocaleString('id-ID')}`;

/** Billing "Bundle": order paket multi-platform. Harga paket dibayar sekali per order setelah semua task approved. */
export default function BundleOrdersSection({ rows, periodLabel, bundles, designers, months }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bundleId, setBundleId] = useState('');
  const [designerId, setDesignerId] = useState('');
  const [period, setPeriod] = useState(periodLabel);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dpDialog, setDpDialog] = useState<{ id: string; amount: string } | null>(null);
  const [dpSaving, setDpSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentType, setPaymentType] = useState<'Full' | 'DP'>('Full');
  // Order periode kontrak: bundle, designer, harga & tipe mengikuti kontrak
  const [formContract, setFormContract] = useState<BundleContractSummary | null>(null);
  const [contractTrialId, setContractTrialId] = useState<string | null>(null);
  const [payoutMonth, setPayoutMonth] = useState('');
  const [dpAmount, setDpAmount] = useState('');

  const paidTotal = rows.reduce((n, r) => n + (r.paid ? r.price : r.dpPaid ? r.dpAmount : 0), 0);
  const total = rows.filter((r) => r.completed).reduce((n, r) => n + r.price, 0);

  /** Tanpa argumen = order Trial baru; dengan kontrak = order periode berikutnya dari kontrak itu. */
  const openForm = (contractOf?: { row: BundleOrderRow; contract: BundleContractSummary }) => {
    setDetailId(null);
    setPayoutMonth(''); setTitle(''); setBody(''); setError(''); setPaymentType('Full'); setDpAmount('');
    setFormContract(contractOf?.contract ?? null);
    setBundleId(contractOf?.row.bundleId ?? '');
    setDesignerId(contractOf?.row.designerId ?? '');
    setPeriod(contractOf ? contractOf.contract.nextPeriod ?? '' : periodLabel === 'Unknown' ? '' : periodLabel);
    setOpen(true);
  };

  /** Kontrak terkait order: kontrak dari trial ini, atau kontrak tempat order ini berada. */
  const contractOfRow = (r: BundleOrderRow) => r.trialContract ?? r.contract ?? null;

  const submit = async () => {
    setError('');
    if (!bundleId) return setError('Pilih bundle.');
    if (formContract) {
      const key = parseTaskMonthToKey(period);
      const free = formContract.periods.filter((p) => !formContract.usedPeriods.includes(p));
      if (!key || !free.some((p) => parseTaskMonthToKey(p) === key)) {
        return setError(`Pilih periode kontrak yang belum dipakai (${free[0] ?? '-'} – ${free[free.length - 1] ?? '-'}).`);
      }
    }
    setSaving(true);
    const res = await createBundleOrderAction({ bundleId, designerId, period, title, bodyText: body, contractId: formContract?.id ?? null, payoutMonth: payoutMonth || null, paymentType, dpAmount: Number(dpAmount) });
    setSaving(false);
    if (!res.success) {
      setError(res.error || 'Gagal membuat order.');
      toast.error(res.error || 'Gagal membuat order.');
      if (res.orderId) router.refresh();
      return;
    }
    toast.success(formContract ? `Order periode ${period} dibuat, task dikirim ke tiap board.` : 'Order bundle dibuat, task dikirim ke tiap board.');
    if (res.warning) toast(res.warning, { icon: '⚠️', duration: 8000 });
    setOpen(false);
    router.refresh();
  };

  const pay = async (id: string, step: 'dp' | 'full' | 'reset') => {
    const res = await updateBundleOrderPaymentAction(id, step);
    if (!res.success) return void toast.error(res.error || 'Gagal mencatat pembayaran.');
    toast.success(step === 'dp' ? 'DP dicatat.' : step === 'full' ? 'Pelunasan dicatat.' : 'Pembayaran direset.');
    router.refresh();
  };

  const submitDp = async () => {
    if (!dpDialog) return;
    setDpSaving(true);
    const res = await recordBundleOrderDpAction(dpDialog.id, Number(dpDialog.amount));
    setDpSaving(false);
    if (!res.success) return void toast.error(res.error || 'Gagal mencatat DP.');
    toast.success('DP dicatat.');
    setDpDialog(null);
    router.refresh();
  };

  /** Tombol CTA per order: kolom Action (kompak, selebar sel) dan footer drawer detail. */
  const actionButtons = (r: BundleOrderRow, variant: 'link' | 'button') => {
    const base = variant === 'link' ? 'w-full px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs';
    const cls = (tone: 'primary' | 'violet' | 'neutral') =>
      `${base} font-bold border rounded-none text-center whitespace-nowrap cursor-pointer transition-colors ${
        tone === 'primary'
          ? 'bg-[#ff5e1f] border-[#ff5e1f] text-white hover:bg-[#ff7038]'
          : tone === 'violet'
            ? 'border-violet-500/50 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10'
            : 'border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] hover:text-gray-900 dark:hover:text-white'
      }`;
    // Di baris tabel hanya aksi pembayaran berikutnya; aksi lain ada di drawer detail.
    if (variant === 'link') {
      if (r.paid) return <span className="text-[11px] text-gray-300 text-center">–</span>;
      if (r.dpPaid) return <button type="button" onClick={() => pay(r.id, 'full')} className={cls('primary')}>Lunasi</button>;
      if (r.paymentType === 'DP') return <button type="button" onClick={() => setDpDialog({ id: r.id, amount: r.dpAmount > 0 ? String(r.dpAmount) : '' })} className={cls('primary')}>Catat DP</button>;
      return <button type="button" onClick={() => pay(r.id, 'full')} className={cls('primary')}>Tandai Lunas</button>;
    }
    return (
      <>
        {!r.dpPaid && !r.paid && <button type="button" onClick={() => setDpDialog({ id: r.id, amount: r.dpAmount > 0 ? String(r.dpAmount) : '' })} className={cls('primary')}>Catat DP</button>}
        {!r.paid && (r.paymentType === 'Full' || r.dpPaid) && <button type="button" onClick={() => pay(r.id, 'full')} className={cls('primary')}>{r.paymentType === 'DP' ? 'Lunasi' : 'Tandai Lunas'}</button>}
        {(() => {
          const contract = contractOfRow(r);
          if (r.orderType === 'Trial' && !contract) {
            // Trial baru boleh dijadikan kontrak setelah semua task approved
            return r.completed
              ? <button type="button" onClick={() => setContractTrialId(r.id)} className={cls('violet')}>Jadikan Kontrak</button>
              : <button type="button" disabled title="Semua task trial harus approved dulu" className={`${cls('violet')} cursor-not-allowed opacity-50`}>Jadikan Kontrak · {r.approvedTasks}/{r.totalTasks} approved</button>;
          }
          if (!contract) return null;
          return contract.nextPeriod
            ? <button type="button" onClick={() => openForm({ row: r, contract })} className={cls('violet')}>Order Periode Berikutnya · {contract.nextPeriod}</button>
            : <span className={`${base} border border-[#f0f0f0] font-bold text-gray-400 dark:border-[#272a34]`}>Periode kontrak selesai</span>;
        })()}
        {(r.paid || r.dpPaid) && <button type="button" onClick={() => pay(r.id, 'reset')} className={cls('neutral')}>Reset Pembayaran</button>}
      </>
    );
  };

  /** Designer order = sumber utama; task bundle di tiap board ikut diganti oleh server. */
  const changeDesigner = async (r: BundleOrderRow, nextId: string) => {
    if (!nextId || nextId === r.designerId) return;
    let res = await updateBundleOrderDesignerAction(r.id, nextId);
    if (!res.success && 'needsConfirm' in res && res.needsConfirm) {
      if (!window.confirm(`${res.error} Lanjutkan?`)) return;
      res = await updateBundleOrderDesignerAction(r.id, nextId, true);
    }
    if (!res.success) return void toast.error(res.error || 'Gagal mengganti designer.');
    toast.success('Designer order dan semua task bundle diperbarui.');
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Hapus order bundle ini?')) return;
    const res = await deleteBundleOrderAction(id);
    if (!res.success) return void toast.error(res.error || 'Gagal menghapus.');
    toast.success('Order dihapus.');
    router.refresh();
  };

  return (
    <div className="flex flex-col bg-white dark:bg-[#0d0e12] border-b border-[#f0f0f0] dark:border-[#272a34]">
      <div className="flex items-stretch justify-between border-b border-[#f0f0f0] dark:border-[#272a34] font-sans text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
        <span className="flex items-center gap-2 px-4 py-3.5"><Package className="w-4 h-4 text-[#ff5e1f]" /> Order Bundle <span className="text-[10px] font-medium text-gray-400 normal-case tracking-normal">{periodLabel} · selesai {money(total)} · terbayar {money(paidTotal)}</span></span>
        <button type="button" onClick={() => openForm()} className="flex items-center gap-1.5 px-5 bg-[#ff5e1f] hover:bg-[#ff7038] text-white cursor-pointer transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Order Bundle
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-sans text-xs">
          <thead className="bg-gray-50 dark:bg-[#16181d] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
              <th className="px-4 py-3 font-bold">Bundle</th>
              <th className="px-4 py-3 font-bold">Designer</th>
              <th className="px-4 py-3 font-bold">Task</th>
              <th className="px-4 py-3 font-bold text-right">Harga Paket</th>
              <th className="px-4 py-3 font-bold text-center">Status</th>
              <th className="px-4 py-3 font-bold">Pembayaran</th>
              <th className="px-4 py-3 font-bold">Action</th>
              <th className="px-2 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
            {rows.map((r) => (
              <tr key={r.id} onClick={() => setDetailId(r.id)} className="cursor-pointer hover:bg-gray-50/70 dark:hover:bg-[#16181d]/60 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 dark:text-white">{r.bundleName}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold ${r.orderType === 'Kontrak' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                      {r.orderType === 'Kontrak' ? `KONTRAK${r.contract && r.contractPeriodIndex ? ` ${r.contractPeriodIndex}/${r.contract.periods.length}` : ''}` : 'TRIAL'}
                    </span>
                    {r.orderType === 'Trial' && r.trialContract && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400">DIKONTRAK</span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-400">Order {r.period || '-'} · Payout {r.payoutMonth || 'belum diset'}</div>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {r.designerName}{r.isAgency && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">AGENCY</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {r.tasks.map((t) => (
                      <span key={t.id} title={t.name} className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${t.approved ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-[#20232b] text-gray-600 dark:text-gray-400'}`}>{t.board}</span>
                    ))}
                    <span className="text-[11px] text-gray-400 self-center">{r.approvedTasks}/{r.totalTasks}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{money(r.price)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${r.completed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600'}`}>{r.completed ? 'COMPLETED' : 'IN PROGRESS'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5 items-start">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${r.paid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : r.dpPaid ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-gray-100 dark:bg-[#20232b] text-gray-500'}`}>
                      {r.paid ? 'LUNAS' : r.dpPaid ? 'DP DIBAYAR' : 'BELUM BAYAR'}
                    </span>
                    {r.paymentType === 'DP' && !r.paid && (
                      <span className="text-[11px] text-gray-500 whitespace-nowrap">DP {money(r.dpAmount)} · sisa {money(r.price - (r.dpPaid ? r.dpAmount : 0))}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col items-stretch min-w-[110px]">{actionButtons(r, 'link')}</div>
                </td>
                <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => remove(r.id)} aria-label="Hapus order" className="text-gray-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Belum ada order bundle di periode ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {dpDialog && typeof window !== 'undefined' && (() => {
        const target = rows.find((x) => x.id === dpDialog.id);
        if (!target) return null;
        const amount = Number(dpDialog.amount) || 0;
        return createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-black/50 cursor-pointer" onClick={() => setDpDialog(null)} aria-label="Tutup" />
            <div className="relative w-full max-w-md bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] shadow-2xl font-sans divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
              <div className="px-5 py-4 bg-gray-50/50 dark:bg-[#16181d]/50">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Catat DP</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">{target.bundleName} · {target.designerName}</p>
              </div>
              <div className="flex items-stretch text-xs min-h-[44px]"><div className={LABEL}>Harga Paket</div><div className="flex-1 px-4 flex items-center font-bold">{money(target.price)}</div></div>
              <div className="flex items-stretch text-xs min-h-[44px]">
                <div className={LABEL}>Nominal DP</div>
                <input autoFocus className={INPUT} type="number" min="0" value={dpDialog.amount} onChange={(e) => setDpDialog({ ...dpDialog, amount: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') submitDp(); }} placeholder="ex: 50000" />
              </div>
              <div className="flex items-stretch text-xs min-h-[44px]"><div className={LABEL}>Sisa</div><div className="flex-1 px-4 flex items-center font-bold text-rose-600 dark:text-rose-400">{money(Math.max(target.price - amount, 0))}</div></div>
              <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
                <button type="button" onClick={() => setDpDialog(null)} disabled={dpSaving} className="py-3.5 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 cursor-pointer disabled:opacity-50">Cancel</button>
                <button type="button" onClick={submitDp} disabled={dpSaving} className="py-3.5 bg-[#ff5e1f] hover:bg-[#ff7038] text-xs font-bold uppercase tracking-wider text-white cursor-pointer disabled:opacity-50">{dpSaving ? 'Menyimpan…' : 'Simpan DP'}</button>
              </div>
            </div>
          </div>,
          document.body,
        );
      })()}

      <BundleOrderDetailDrawer
        row={rows.find((r) => r.id === detailId) ?? null}
        onClose={() => setDetailId(null)}
        actions={(() => { const r = rows.find((x) => x.id === detailId); return r ? actionButtons(r, 'button') : null; })()}
        designers={designers}
        onChangeDesigner={(id) => { const r = rows.find((x) => x.id === detailId); if (r) void changeDesigner(r, id); }}
      />

      {contractTrialId && (() => {
        const trial = rows.find((r) => r.id === contractTrialId);
        if (!trial) return null;
        return (
          <BundleContractDrawer
            trial={trial}
            bundlePrice={bundles.find((b) => b.id === trial.bundleId)?.price ?? trial.price}
            onClose={() => setContractTrialId(null)}
            onCreated={() => {
              setContractTrialId(null);
              toast.success('Kontrak bundle dibuat. Lanjutkan dengan Order Periode Berikutnya.');
              router.refresh();
            }}
          />
        );
      })()}

      {open && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-70">
          <button type="button" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40 cursor-pointer" aria-label="Close modal" />
          <div className="absolute right-0 top-0 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0 mr-3">
                <div className="w-8 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">{formContract ? 'Order Periode Kontrak' : 'Add Order Bundle'}</h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Membuat satu task per komponen di board masing-masing.</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
            <div className="flex items-stretch text-xs min-h-[44px]">
              <div className={LABEL}>Tipe Order</div>
              <div className="flex-1 px-4 flex items-center gap-2 font-bold">
                {formContract ? (
                  <>
                    <span className="px-2 py-0.5 text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400">KONTRAK</span>
                    <span className="font-medium text-gray-500">periode {formContract.usedPeriods.length + 1}/{formContract.periods.length}</span>
                  </>
                ) : (
                  <>
                    <span className="px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400">TRIAL</span>
                    <span className="font-medium text-gray-500">Kontrak dibuat dari trial yang lolos</span>
                  </>
                )}
              </div>
            </div>
            {formContract ? (
              <>
                <div className="flex items-stretch text-xs min-h-[44px]"><div className={LABEL}>Bundle</div><div className="flex-1 px-4 flex items-center font-bold">{bundles.find((b) => b.id === bundleId)?.name ?? '-'}</div></div>
                <div className="flex items-stretch text-xs min-h-[44px]"><div className={LABEL}>Designer / Agency</div><div className="flex-1 px-4 flex items-center font-bold">{designers.find((d) => d.id === designerId)?.displayName ?? '-'}</div></div>
                <div className="flex items-stretch text-xs min-h-[44px]"><div className={LABEL}>Harga</div><div className="flex-1 px-4 flex items-center font-bold text-emerald-600 dark:text-emerald-400">{money(formContract.price)} <span className="ml-2 font-medium text-gray-400">harga kontrak</span></div></div>
              </>
            ) : (
              <>
                <div className="flex items-stretch text-xs min-h-[44px]">
                  <div className={LABEL}>Bundle</div>
                  <div className="flex-1"><PlatformSelectCell value={bundleId} options={bundles.map((b) => ({ slug: b.id, name: `${b.name} — ${money(b.price)}` }))} placeholder="Pilih Bundle..." onChange={setBundleId} /></div>
                </div>
                <div className="flex items-stretch text-xs min-h-[44px]">
                  <div className={LABEL}>Designer / Agency</div>
                  <div className="flex-1"><PlatformSelectCell value={designerId} options={designers.map((d) => ({ slug: d.id, name: d.isAgency ? `${d.displayName} (Agency)` : d.displayName }))} placeholder="Pilih Designer..." onChange={setDesignerId} /></div>
                </div>
              </>
            )}
            <div className="flex items-stretch text-xs min-h-[44px]">
              <div className={LABEL}>Periode</div>
              <div className="flex-1 flex items-stretch bg-white dark:bg-[#0d0e12]">
                <MonthCalendarPicker
                  value={period}
                  placeholder="Pilih Bulan..."
                  onChange={setPeriod}
                  availableMonths={formContract ? formContract.periods.filter((p) => !formContract.usedPeriods.includes(p)) : undefined}
                />
              </div>
            </div>
            {formContract && (
              <p className="px-5 py-2 text-[11px] text-gray-500 dark:text-gray-400">
                Masa kontrak {formContract.periods[0]} – {formContract.periods[formContract.periods.length - 1]}; bulan yang sudah punya order tidak bisa dipilih.
              </p>
            )}
            <div className="flex items-stretch text-xs min-h-[44px]">
              <div className={LABEL}>Payout Month</div>
              <div className="flex-1 flex items-stretch bg-white dark:bg-[#0d0e12]"><MonthCalendarPicker value={payoutMonth} placeholder="Kosong = masuk antrian Closing" onChange={setPayoutMonth} /></div>
            </div>
            <div className="flex items-stretch text-xs min-h-[44px]">
              <div className={LABEL}>Judul Order</div>
              <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Template Wedding" />
            </div>
            <div className="flex items-stretch text-xs min-h-[44px]">
              <div className={LABEL}>Pembayaran</div>
              <div className="flex-1 grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
                {([['Full', 'Lunas'], ['DP', 'DP + Pelunasan']] as const).map(([v, label]) => (
                  <button key={v} type="button" onClick={() => setPaymentType(v)}
                    className={`min-h-[44px] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${paymentType === v ? 'bg-emerald-600 text-white' : 'bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>{label}</button>
                ))}
              </div>
            </div>
            {paymentType === 'DP' && (
              <div className="flex items-stretch text-xs min-h-[44px]">
                <div className={LABEL}>Nominal DP</div>
                <input className={INPUT} type="number" min="0" value={dpAmount} onChange={(e) => setDpAmount(e.target.value)} placeholder="ex: 50000" />
              </div>
            )}
            <div className="flex items-stretch text-xs min-h-[80px]">
              <div className={LABEL}>Brief</div>
              <textarea className={`${INPUT} py-3 resize-none`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Brief awal (disalin ke semua task)" />
            </div>
            {error && <p className="px-5 py-3 text-xs font-bold text-rose-500">{error}</p>}
            </div>
            <div className="grid shrink-0 grid-cols-2 border-t border-[#f0f0f0] dark:border-[#272a34] divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
              <button type="button" onClick={() => setOpen(false)} disabled={saving} className="py-3.5 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="button" onClick={submit} disabled={saving} className="py-3.5 bg-[#ff5e1f] hover:bg-[#ff7038] text-xs font-bold uppercase tracking-wider text-white cursor-pointer disabled:opacity-50">{saving ? 'Membuat…' : 'Create Order'}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
