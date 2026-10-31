'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X } from 'lucide-react';
import { createBundleContractAction } from '@/app/actions/bundle-order';
import type { DateRange } from '../DateRangePicker';
import ContractPeriodField, { firstDayOfNextMonth } from '../ContractPeriodField';
import InfoTip from '../InfoTip';
import { parseTaskMonthToKey, taskMonthsInRange } from '@/lib/period-utils';
import type { BundleOrderRow } from './BundleOrdersSection';

interface Props {
  /** Order trial yang lolos (semua task approved). */
  trial: BundleOrderRow;
  /** Harga paket bundle saat ini (default harga per periode). */
  bundlePrice: number;
  onClose: () => void;
  onCreated: () => void;
}

const row = 'flex min-h-11 items-stretch text-xs';
const labelCell = 'flex w-[150px] shrink-0 items-center whitespace-nowrap border-r border-[#f0f0f0] bg-gray-50/50 px-5 font-bold text-gray-500 select-none dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-400';
const valueCell = 'flex min-w-0 flex-1 items-center px-5 font-bold text-gray-900 dark:text-white';
const moneyWrap = 'flex flex-1 items-stretch bg-gray-50/50 focus-within:bg-white focus-within:ring-1 focus-within:ring-inset focus-within:ring-[#ff5e1f] dark:bg-[#16181d]/50 dark:focus-within:bg-[#16181d]';
const moneyInput = 'h-full min-h-11 w-full min-w-0 rounded-none border-0 bg-transparent pl-2 text-xs font-bold text-gray-900 outline-none dark:text-white';
const unit = 'flex shrink-0 items-center whitespace-nowrap pr-5 text-[11px] font-medium text-gray-500 dark:text-gray-400';
const money = (n: number) => `IDR ${n.toLocaleString('id-ID')}`;

/** Jadikan trial bundle sebagai kontrak berperiode; order trial tetap tercatat sebagai Trial. */
export default function BundleContractDrawer({ trial, bundlePrice, onClose, onCreated }: Props) {
  const [price, setPrice] = useState(String(bundlePrice || trial.price));
  const [period, setPeriod] = useState<DateRange>({ start: null, end: null });
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const priceNumber = Number(price);
  const periodDone = !!period.start && !!period.end;
  const months = periodDone ? taskMonthsInRange(period.start!, period.end!) : [];
  const valid = Number.isFinite(priceNumber) && priceNumber > 0 && periodDone;

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await createBundleContractAction({
        trialOrderId: trial.id,
        price: priceNumber,
        contractStartDate: period.start!,
        contractEndDate: period.end!,
        notes,
      });
      if (!res.success) { setError(res.error || 'Gagal membuat kontrak.'); return; }
      onCreated();
    });

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label="Jadikan kontrak">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={(e) => { e.preventDefault(); if (valid) save(); }}
        className="relative flex h-full w-full max-w-140 flex-col border-l border-[#f0f0f0] bg-white font-sans shadow-2xl animate-[slideInRight_180ms_ease-out] dark:border-[#272a34] dark:bg-[#0d0e12]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#f0f0f0] bg-gray-50/50 px-5 py-4 dark:border-[#272a34] dark:bg-[#16181d]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-[#f0f0f0] bg-white text-violet-600 dark:border-[#272a34] dark:bg-[#16181d] dark:text-violet-400"><FileText className="h-4 w-4" /></div>
            <div>
              <h2 className="text-sm font-bold uppercase text-gray-900 dark:text-white">Jadikan Kontrak</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{trial.bundleName} · {trial.designerName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-8 items-center justify-center border border-[#f0f0f0] bg-white text-gray-500 hover:text-gray-900 dark:border-[#272a34] dark:bg-[#16181d] dark:hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 divide-y divide-[#f0f0f0] overflow-y-auto dark:divide-[#272a34]">
          <div className={row}><span className={labelCell}>Bundle</span><span className={valueCell}>{trial.bundleName}</span></div>
          <div className={row}><span className={labelCell}>Designer / Agency</span><span className={valueCell}>{trial.designerName}</span></div>
          <div className={row}>
            <span className={labelCell}>Trial asal</span>
            <span className={`${valueCell} gap-2`}>
              {trial.period || '-'}
              <span className="bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{trial.approvedTasks}/{trial.totalTasks} APPROVED</span>
            </span>
          </div>
          <div className={row}>
            <label htmlFor="bundle-contract-price" className={`${labelCell} gap-1.5`}>
              Harga per periode
              <InfoTip label="Harga per periode">Default harga paket {money(bundlePrice || trial.price)}. Dipakai sebagai harga setiap order periode kontrak.</InfoTip>
            </label>
            <div className={moneyWrap}>
              <span className="flex items-center pl-5 text-xs font-bold text-gray-500">IDR</span>
              <input id="bundle-contract-price" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className={moneyInput} />
              <span className={unit}>/ periode</span>
            </div>
          </div>
          <ContractPeriodField
            value={period}
            onChange={setPeriod}
            defaultStart={firstDayOfNextMonth(parseTaskMonthToKey(trial.period))}
            info="Pilihan cepat dimulai tanggal 1 bulan setelah periode trial. Pilih Custom untuk tanggal sendiri."
            rowClass={row}
            labelClass={labelCell}
          />
          {periodDone && (
            <div className={row}>
              <span className={`${labelCell} gap-1.5`}>
                Periode order
                <InfoTip label="Periode order">Order tiap periode dibuat manual lewat “Order Periode Berikutnya”.</InfoTip>
              </span>
              <span className="flex flex-1 items-center gap-2 px-5 font-bold text-gray-900 dark:text-white">
                {months.length} periode
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{months[0]} – {months[months.length - 1]}</span>
              </span>
            </div>
          )}
          <div className="flex min-h-24 items-stretch text-xs">
            <label htmlFor="bundle-contract-notes" className={`${labelCell} items-start pt-3`}>Catatan</label>
            <textarea
              id="bundle-contract-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Opsional, mis. kesepakatan revisi atau jumlah template per bulan"
              className="min-h-24 w-full resize-none rounded-none border-0 bg-gray-50/50 px-5 py-3 text-xs font-medium text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#ff5e1f] dark:bg-[#16181d]/50 dark:text-white dark:focus:bg-[#16181d]"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 border-t border-[#f0f0f0] px-5 py-3 text-[11px] text-gray-500 dark:border-[#272a34] dark:text-gray-400">
          Order trial tetap tercatat sebagai Trial.
          <InfoTip label="Order trial">Pembayaran order trial tidak berubah. Kontrak ini menjadi dasar order setiap periode.</InfoTip>
        </div>

        {error && <div className="shrink-0 border-t border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <div className="grid shrink-0 grid-cols-2 divide-x divide-[#f0f0f0] border-t border-[#f0f0f0] dark:divide-[#272a34] dark:border-[#272a34]">
          <button type="button" onClick={onClose} className="w-full bg-gray-50/50 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:bg-[#16181d]/50 dark:text-gray-300 dark:hover:bg-[#16181d] cursor-pointer">Batal</button>
          <button type="submit" disabled={pending || !valid} className="w-full bg-[#ff5e1f] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-50 cursor-pointer">
            {pending ? 'Menyimpan…' : 'Buat Kontrak'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
