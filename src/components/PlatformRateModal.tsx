'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { updatePlatformBaseRateAction } from '@/app/actions/rate-card';
import PlatformSelectCell from './PlatformSelectCell';

interface Props {
  open: boolean;
  onClose: () => void;
  platforms: { slug: string; name: string }[];
  /** Platform terpilih saat dibuka. */
  platformSlug: string;
  /** Tarif efektif per slug (baseRate platform, atau fallback global). */
  rates: Record<string, number>;
}

export default function PlatformRateModal({ open, onClose, platforms, platformSlug, rates }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(platformSlug);
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSlug(platformSlug);
      setRate(String(rates[platformSlug] ?? ''));
      setError('');
    }
  }, [open, platformSlug, rates]);

  if (!open || typeof window === 'undefined') return null;

  const save = async () => {
    const next = Number(rate);
    if (!Number.isFinite(next) || next < 0) {
      setError('Tarif harus angka valid.');
      return;
    }
    setIsSaving(true);
    const res = await updatePlatformBaseRateAction(slug, next);
    setIsSaving(false);
    if (!res.success) {
      setError(res.error || 'Gagal menyimpan.');
      toast.error(res.error || 'Gagal menyimpan.');
      return;
    }
    toast.success('Tarif dasar diperbarui.');
    onClose();
    router.refresh();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-2xl overflow-hidden font-sans">
        <div className="p-4 sm:p-5 bg-gray-50/50 dark:bg-[#16181d]/50 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">Edit Tarif Dasar Platform</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Tarif per halaman untuk kontrak satu platform.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-7 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-stretch text-xs min-h-[44px]">
          <div className="w-[130px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-4 flex items-center font-bold text-gray-500 dark:text-gray-400">Platform</div>
          <div className="flex-1">
            <PlatformSelectCell
              value={slug}
              options={platforms}
              onChange={(s) => { setSlug(s); setRate(String(rates[s] ?? '')); }}
            />
          </div>
        </div>
        <div className="flex items-stretch text-xs min-h-[44px]">
          <div className="w-[130px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-4 flex items-center font-bold text-gray-500 dark:text-gray-400">Tarif / Halaman</div>
          <input
            type="number"
            min="0"
            step="1"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="flex-1 min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-4 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
          />
        </div>
        {error && <p className="px-4 py-2 text-xs font-bold text-rose-500">{error}</p>}

        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
          <button type="button" onClick={onClose} disabled={isSaving} className="w-full py-3.5 px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 cursor-pointer">Cancel</button>
          <button type="button" onClick={save} disabled={isSaving} className="w-full py-3.5 px-4 bg-[#ff5e1f] hover:bg-[#ff7038] text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 cursor-pointer">{isSaving ? 'Saving…' : 'Save Tarif'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
