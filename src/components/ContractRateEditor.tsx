'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, PencilLine, X } from 'lucide-react';
import { updateContractRateAction } from '@/app/actions/notion-config';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function ContractRateEditor({
  initialRate,
  className,
}: {
  initialRate: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(String(initialRate));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const save = async () => {
    const nextRate = Number(rate);
    if (!Number.isFinite(nextRate) || nextRate < 0) {
      setError('Rate harus angka valid.');
      toast.error('Rate harus angka valid.');
      return;
    }
    setError('');
    setIsSaving(true);
    const res = await updateContractRateAction(nextRate);
    setIsSaving(false);
    if (!res.success) {
      setError(res.error || 'Gagal simpan rate.');
      toast.error(res.error || 'Gagal simpan rate.');
      return;
    }
    toast.success('Contract rate updated successfully!');
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'flex items-center gap-2.5 px-5 sm:px-6 py-4 bg-white dark:bg-[#0d0e12] text-gray-700 dark:text-gray-300 font-sans text-xs hover:bg-gray-50 dark:hover:bg-[#16181d] hover:text-[#ff5e1f] dark:hover:text-[#ff5e1f] transition-all cursor-pointer whitespace-nowrap h-full'
        }
        id="edit-contract-rate-button"
      >
        <Banknote className="h-4 w-4 text-[#ff5e1f] shrink-0" />
        <span>Rate/Pool: <strong className="font-bold text-gray-900 dark:text-white">IDR {new Intl.NumberFormat('id-ID').format(initialRate)}</strong></span>
        <PencilLine className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0 ml-1" />
      </button>

      {open && typeof window !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setOpen(false)} />
              <div className="relative w-full max-w-md rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-2xl overflow-hidden font-sans">
                {/* Header Cell */}
                <div className="p-4 sm:p-5 bg-gray-50/50 dark:bg-[#16181d]/50 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-gray-900 dark:text-white">
                      Edit Contract Rate
                    </h3>
                    <p className="mt-1 text-xs font-sans text-gray-500 dark:text-gray-400">
                      Simpan rate/pool di setting kontrak. Doctype tetap di tabel bawah.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body Content Cell */}
                <div className="p-4 sm:p-5 space-y-4 bg-white dark:bg-[#0d0e12]">
                  <label className="flex flex-col gap-2.5 text-xs font-sans font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    <span>Rate / Pool</span>
                    <input
                      id="contract-rate-input"
                      type="number"
                      min="0"
                      step="1"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="w-full rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-3.5 py-2.5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff5e1f] transition-colors"
                    />
                  </label>
                  {error ? (
                    <p className="text-xs font-sans font-bold text-rose-500 mt-2">
                      {error}
                    </p>
                  ) : null}
                </div>

                {/* Footer Action Table Row */}
                <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={isSaving}
                    className="w-full py-3.5 px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] font-sans text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={isSaving}
                    className="w-full py-3.5 px-4 bg-[#ff5e1f] hover:bg-[#ff7038] font-sans text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 cursor-pointer text-center"
                  >
                    {isSaving ? 'Saving…' : 'Save Rate / Pool'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
