'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { createDoctypeAction } from '@/app/actions/rate-card';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Props {
  className?: string;
}

export default function AddDoctypeButton({ className }: Props) {
  const [name, setName] = useState('');
  const [poolRate, setPoolRate] = useState('1.5');
  const [ratePages, setRatePages] = useState('15000');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const resetForm = () => {
    setName('');
    setPoolRate('1.5');
    setRatePages('15000');
    setError('');
  };

  const closeModal = () => {
    if (isSaving) return;
    setOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    const nextName = name.trim();
    const nextPoolRate = Number(poolRate);
    const nextRatePages = Number(ratePages);

    if (!nextName || !Number.isFinite(nextPoolRate) || !Number.isFinite(nextRatePages) || nextPoolRate < 0 || nextRatePages < 1) {
      setError('Fill valid name, pool rate, pages.');
      toast.error('Fill valid name, pool rate, pages.');
      return;
    }

    setError('');
    setIsSaving(true);
    const res = await createDoctypeAction({
      name: nextName,
      poolRate: nextPoolRate,
      pages: nextRatePages,
    });
    setIsSaving(false);

    if (!res.success) {
      setError(res.error || 'Failed to create doctype.');
      toast.error(res.error || 'Failed to create doctype.');
      return;
    }

    toast.success(`Doctype "${nextName}" created successfully!`);
    closeModal();
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'inline-flex items-center gap-1.5 rounded-full bg-[#ff5e1f] hover:bg-[#ff7038] px-4 py-1.5 text-xs font-mono font-bold text-white shadow-sm transition-all duration-150 cursor-pointer'
        }
        id="add-doctype-button"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Doctype</span>
      </button>

      {open && typeof window !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={closeModal}
                id="add-doctype-backdrop"
              />

              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-doctype-title"
                className="relative w-full max-w-md rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-2xl overflow-hidden font-sans"
                id="add-doctype-modal"
              >
                {/* Header Cell */}
                <div className="p-4 sm:p-5 bg-gray-50/50 dark:bg-[#16181d]/50 flex items-start justify-between gap-4">
                  <div>
                    <h2 id="add-doctype-title" className="text-xs font-bold font-mono uppercase tracking-wider text-gray-900 dark:text-white">
                      Add New Doctype
                    </h2>
                    <p className="mt-1 text-xs font-mono text-gray-500 dark:text-gray-400">
                      Create doctype on web, then sync option to Notion.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex size-7 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    id="close-add-doctype-button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body Content Cell */}
                <div className="p-4 sm:p-5 space-y-4 bg-white dark:bg-[#0d0e12]">
                  <label className="flex flex-col gap-2.5 text-xs font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    <span>Doctype Name</span>
                    <input
                      id="doctype-name-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: Presentation"
                      className="w-full rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-3.5 py-2.5 font-mono text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff5e1f] transition-colors"
                    />
                  </label>

                  <label className="flex flex-col gap-2.5 text-xs font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    <span>Pool Rate</span>
                    <input
                      id="pool-rate-input"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={poolRate}
                      onChange={(e) => setPoolRate(e.target.value)}
                      className="w-full rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-3.5 py-2.5 font-mono text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff5e1f] transition-colors"
                    />
                  </label>

                  <label className="flex flex-col gap-2.5 text-xs font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    <span>Pages Per Template</span>
                    <input
                      id="pages-input"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={ratePages}
                      onChange={(e) => setRatePages(e.target.value)}
                      className="w-full rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-3.5 py-2.5 font-mono text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff5e1f] transition-colors"
                    />
                  </label>

                  {error ? (
                    <p className="text-xs font-mono font-bold text-rose-500 mt-2">
                      {error}
                    </p>
                  ) : null}
                </div>

                {/* Footer Action Table Row */}
                <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSaving}
                    className="w-full py-3.5 px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] font-mono text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 cursor-pointer text-center"
                    id="cancel-add-doctype-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="save-doctype-button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="w-full py-3.5 px-4 bg-[#ff5e1f] hover:bg-[#ff7038] font-mono text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 cursor-pointer text-center"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
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
