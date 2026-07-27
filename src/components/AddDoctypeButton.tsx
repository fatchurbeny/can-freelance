'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { createDoctypeAction } from '@/app/actions/rate-card';

export default function AddDoctypeButton() {
  const [name, setName] = useState('');
  const [poolRate, setPoolRate] = useState('1.5');
  const [ratePages, setRatePages] = useState('15000');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      return;
    }

    closeModal();
    window.location.reload();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        id="add-doctype-button"
      >
        <Plus className="w-4 h-4" />
        Add Doctype
      </button>

      {open && typeof window !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={closeModal}
                id="add-doctype-backdrop"
              />

              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-doctype-title"
                className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-white/95 dark:bg-[#0f1218]/95 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl"
                id="add-doctype-modal"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="add-doctype-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                      Add new doctype
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Create doctype on web, then sync option to Notion.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    id="close-add-doctype-button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4">
                  <label className="grid gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <span>Doctype name</span>
                    <input
                      id="doctype-name-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: Presentation"
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <span>Pool Rate</span>
                    <div className="flex items-center gap-2">
                      <input
                        id="pool-rate-input"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={poolRate}
                        onChange={(e) => setPoolRate(e.target.value)}
                        className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      />
                    </div>
                  </label>
                  <label className="grid gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <span>Pages per template</span>
                    <input
                      id="pages-input"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={ratePages}
                      onChange={(e) => setRatePages(e.target.value)}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </label>
                </div>

                {error ? (
                  <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                  </div>
                ) : null}

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSaving}
                    className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
                    id="cancel-add-doctype-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="save-doctype-button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
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
