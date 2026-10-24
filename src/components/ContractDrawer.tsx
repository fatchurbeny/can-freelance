'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X } from 'lucide-react';
import { createContractAction, updateContractAction } from '@/app/actions/rate-card';
import { workingDaysInRange, type DateRange } from './DateRangePicker';
import ContractPeriodField, { firstDayOfNextMonth } from './ContractPeriodField';
import InfoTip from './InfoTip';

/** Kontrak yang sudah ada (mode edit). */
export interface ContractRow {
  id: string;
  name: string;
  slug: string;
  outputType: string;
  baseRate?: number | null;
  contractStartDate?: string | Date | null;
  contractEndDate?: string | Date | null;
}

interface Props {
  /** Diisi = mode edit; kosong = Kontrak Baru. */
  contract?: ContractRow | null;
  onClose: () => void;
  onSaved: (platform: { id: string; name: string; slug: string }) => void;
}

/** Kolom DATE disimpan sebagai tengah malam UTC → "YYYY-MM-DD". */
const toDateKey = (value?: string | Date | null) => (value ? new Date(value).toISOString().slice(0, 10) : null);

const OUTPUTS = [
  { value: 'canva_link', label: 'Canva Link', hint: 'Hasil berupa link template Canva; production bisa memakai Asset Library.' },
  { value: 'dropbox_link', label: 'Dropbox Link', hint: 'Hasil diunggah lewat Dropbox File Request per task.' },
] as const;

const row = 'flex min-h-11 items-stretch text-xs';
const labelCell = 'flex w-[150px] shrink-0 items-center whitespace-nowrap border-r border-[#f0f0f0] bg-gray-50/50 px-5 font-bold text-gray-500 select-none dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-400';
const input = 'h-full min-h-11 w-full rounded-none border-0 bg-gray-50/50 px-5 text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#ff5e1f] dark:bg-[#16181d]/50 dark:text-white dark:focus:bg-[#16181d]';
const moneyWrap = 'flex flex-1 items-stretch bg-gray-50/50 focus-within:bg-white focus-within:ring-1 focus-within:ring-inset focus-within:ring-[#ff5e1f] dark:bg-[#16181d]/50 dark:focus-within:bg-[#16181d]';
const moneyInput = 'h-full min-h-11 w-full min-w-0 rounded-none border-0 bg-transparent pl-2 text-xs font-bold text-gray-900 outline-none dark:text-white';
const unit = 'flex shrink-0 items-center whitespace-nowrap pr-5 text-[11px] font-medium text-gray-500 dark:text-gray-400';

/**
 * Rate Card → Kontrak: + Kontrak Baru (platform baru) atau Edit Kontrak (klik baris tabel).
 * Jenis output dikunci saat edit karena menentukan cara kerja task production yang sudah berjalan.
 */
export default function ContractDrawer({ contract = null, onClose, onSaved }: Props) {
  const isEdit = !!contract;
  const [name, setName] = useState(contract?.name ?? '');
  const [outputType, setOutputType] = useState<string>(contract?.outputType === 'dropbox_link' ? 'dropbox_link' : 'canva_link');
  const [baseRate, setBaseRate] = useState(contract?.baseRate != null ? String(contract.baseRate) : '');
  const [period, setPeriod] = useState<DateRange>({ start: toDateKey(contract?.contractStartDate), end: toDateKey(contract?.contractEndDate) });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rateNumber = Number(baseRate);
  const periodDone = !!period.start && !!period.end;
  const workDays = periodDone ? workingDaysInRange(period.start!, period.end!) : 0;
  const valid = !!name.trim() && baseRate.trim() !== '' && Number.isFinite(rateNumber) && rateNumber > 0 && periodDone;

  const save = () =>
    startTransition(async () => {
      setError(null);
      const payload = { name, baseRate: rateNumber, contractStartDate: period.start!, contractEndDate: period.end! };
      const res = isEdit
        ? await updateContractAction({ id: contract!.id, ...payload })
        : await createContractAction({ ...payload, outputType });
      if (!res.success) { setError(res.error); return; }
      onSaved(res.platform);
    });

  if (typeof window === 'undefined') return null;
  const selected = OUTPUTS.find((o) => o.value === outputType);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit kontrak' : 'Kontrak baru'}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={(e) => { e.preventDefault(); if (valid) save(); }}
        className="relative flex h-full w-full max-w-140 flex-col border-l border-[#f0f0f0] bg-white font-sans shadow-2xl animate-[slideInRight_180ms_ease-out] dark:border-[#272a34] dark:bg-[#0d0e12]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#f0f0f0] bg-gray-50/50 px-5 py-4 dark:border-[#272a34] dark:bg-[#16181d]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-[#f0f0f0] bg-white text-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d]"><FileText className="h-4 w-4" /></div>
            <div>
              <h2 className="text-sm font-bold uppercase text-gray-900 dark:text-white">{isEdit ? 'Edit Kontrak' : 'Kontrak Baru'}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isEdit ? `${contract!.name} · ${contract!.slug}` : 'Platform tempat hasil desain dijual, beserta tarifnya'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-8 items-center justify-center border border-[#f0f0f0] bg-white text-gray-500 hover:text-gray-900 dark:border-[#272a34] dark:bg-[#16181d] dark:hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 divide-y divide-[#f0f0f0] overflow-y-auto dark:divide-[#272a34]">
          <div className={row}>
            <label htmlFor="contract-name" className={labelCell}>Nama platform</label>
            <div className="flex-1"><input id="contract-name" value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Contoh: Creative Market" autoFocus={!isEdit} /></div>
          </div>
          <div className={row}>
            <span className={`${labelCell} gap-1.5`}>
              Jenis output
              <InfoTip label="Jenis output">
                {selected?.hint} {isEdit ? 'Tidak bisa diubah: menentukan cara kerja task production (Template Link / Dropbox).' : 'Tidak bisa diubah setelah kontrak dibuat.'}
              </InfoTip>
            </span>
            <div className="grid flex-1 grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
              {OUTPUTS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={outputType === o.value}
                  disabled={isEdit}
                  onClick={() => setOutputType(o.value)}
                  className={`text-xs font-bold uppercase disabled:cursor-not-allowed ${
                    outputType === o.value
                      ? `bg-[#ff5e1f] text-white ${isEdit ? 'opacity-70' : ''}`
                      : 'bg-gray-50/50 text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-gray-50/50 dark:bg-[#16181d]/50 dark:text-gray-300 dark:hover:bg-[#16181d] dark:disabled:text-gray-600'
                  } ${isEdit ? '' : 'cursor-pointer'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className={row}>
            <label htmlFor="contract-rate" className={`${labelCell} gap-1.5`}>
              Tarif dasar
              <InfoTip label="Tarif dasar">
                Tarif per halaman desain.{isEdit ? ' Perubahan berlaku untuk perhitungan payout platform ini.' : ' Bisa diubah lagi dengan klik baris kontrak.'}
              </InfoTip>
            </label>
            <div className={moneyWrap}>
              <span className="flex items-center pl-5 text-xs font-bold text-gray-500">Rp</span>
              <input id="contract-rate" type="number" min={1} required value={baseRate} onChange={(e) => setBaseRate(e.target.value)} className={moneyInput} placeholder="15000" />
              <span className={unit}>/ halaman</span>
            </div>
          </div>
          <ContractPeriodField
            value={period}
            onChange={setPeriod}
            defaultStart={firstDayOfNextMonth()}
            info="Pilihan cepat dimulai tanggal 1 bulan depan (atau tanggal mulai kontrak saat edit). Pilih Custom untuk tanggal sendiri."
            rowClass={row}
            labelClass={labelCell}
          />
          {periodDone && (
            <div className={row}>
              <span className={`${labelCell} gap-1.5`}>
                Hari kerja
                <InfoTip label="Hari kerja">Senin–Jumat di periode ini (Sabtu &amp; Minggu libur). Libur nasional belum dikurangi.</InfoTip>
              </span>
              <span className="flex flex-1 items-center gap-2 px-5 text-xs font-bold text-gray-900 dark:text-white">
                {workDays.toLocaleString('id-ID')} hari
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Sen–Jum</span>
              </span>
            </div>
          )}
        </div>

        {!isEdit && (
          <div className="flex shrink-0 items-center gap-1.5 border-t border-[#f0f0f0] px-5 py-3 text-[11px] text-gray-500 dark:border-[#272a34] dark:text-gray-400">
            Setelah dibuat, platform bisa dipilih di wizard production.
            <InfoTip label="Langkah setup lainnya">Tambahkan juga Doctype (tab Doctype) dan Akun/Brand (Account &amp; Team) untuk platform ini.</InfoTip>
          </div>
        )}

        {error && <div className="shrink-0 border-t border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <div className="grid shrink-0 grid-cols-2 divide-x divide-[#f0f0f0] border-t border-[#f0f0f0] dark:divide-[#272a34] dark:border-[#272a34]">
          <button type="button" onClick={onClose} className="w-full bg-gray-50/50 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:bg-[#16181d]/50 dark:text-gray-300 dark:hover:bg-[#16181d] cursor-pointer">Batal</button>
          <button type="submit" disabled={pending || !valid} className="w-full bg-[#ff5e1f] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-50 cursor-pointer">
            {pending ? 'Menyimpan…' : 'Simpan Kontrak'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
