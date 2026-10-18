'use client';

import Link from 'next/link';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

interface ProgressProps {
  error: string | null;
  onRetry: () => void;
}

export function StepProgress({ error, onRetry }: ProgressProps) {
  return (
    <div className="border border-[#f0f0f0] dark:border-[#272a34] p-6 font-sans text-xs space-y-3">
      {error ? (
        <>
          <div className="flex items-center gap-2 font-semibold text-rose-500">
            <AlertTriangle className="w-4 h-4" /> Gagal membuat production
          </div>
          <p className="text-gray-500">{error}</p>
          <button type="button" onClick={onRetry} className="h-10 px-4 border border-[#f0f0f0] dark:border-[#272a34] font-semibold cursor-pointer">
            Kembali ke Review
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Loader2 className="w-4 h-4 animate-spin text-[#ff5e1f]" /> Membuat database dan menyimpan production…
        </div>
      )}
    </div>
  );
}

export function StepSuccess({ slug, name, onReset }: { slug: string; name: string; onReset: () => void }) {
  return (
    <div className="border border-[#f0f0f0] dark:border-[#272a34] p-6 font-sans text-xs space-y-3">
      <div className="flex items-center gap-2 font-semibold text-emerald-600">
        <CheckCircle2 className="w-4 h-4" /> {name} siap dipakai
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/production/${slug}`} className="inline-flex h-10 items-center px-4 bg-[#ff5e1f] text-white font-semibold">
          Buka Production
        </Link>
        <button type="button" onClick={onReset} className="h-10 px-4 border border-[#f0f0f0] dark:border-[#272a34] font-semibold cursor-pointer">
          Buat Production Lain
        </button>
      </div>
    </div>
  );
}
