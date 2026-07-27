'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, PencilLine, X } from 'lucide-react';
import { updateContractRateAction } from '@/app/actions/notion-config';

export default function ContractRateEditor({ initialRate }: { initialRate: number }) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(String(initialRate));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const nextRate = Number(rate);
    if (!Number.isFinite(nextRate) || nextRate < 0) {
      setError('Rate harus angka valid.');
      return;
    }
    setError('');
    setIsSaving(true);
    const res = await updateContractRateAction(nextRate);
    setIsSaving(false);
    if (!res.success) {
      setError(res.error || 'Gagal simpan rate.');
      return;
    }
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300" id="edit-contract-rate-button">
        <Banknote className="h-4 w-4" />
        rate/pool : IDR {new Intl.NumberFormat('id-ID').format(initialRate)}
        <PencilLine className="h-4 w-4" />
      </button>

      {open && typeof window !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
              <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl dark:bg-[#0f1218]/95">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit contract rate</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Simpan rate/pool di setting kontrak. Doctype tetap di tabel bawah.</p>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>
                </div>
                <label className="mt-5 grid gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <span>Rate / Pool</span>
                  <input id="contract-rate-input" type="number" min="0" step="1" value={rate} onChange={(e) => setRate(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                </label>
                {error ? <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">Cancel</button>
                  <button type="button" onClick={save} disabled={isSaving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">{isSaving ? 'Saving...' : 'Save rate/pool'}</button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
