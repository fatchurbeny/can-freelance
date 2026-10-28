'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, AlertTriangle, Info } from 'lucide-react';
import { getPlatformSetupAction } from '@/app/actions/production-unit';

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

export function StepSuccess({ slug, name, platformId, onReset }: { slug: string; name: string; platformId: string; onReset: () => void }) {
  // Platform baru belum punya Doctype/Akun → dropdown di task kosong; ingatkan untuk mengisinya
  const [setup, setSetup] = useState<{ name: string; doctypes: number; accounts: number } | null>(null);
  useEffect(() => {
    let alive = true;
    getPlatformSetupAction(platformId).then((res) => { if (alive && res.success) setSetup(res); });
    return () => { alive = false; };
  }, [platformId]);
  const missing = setup ? [setup.doctypes === 0 && 'Doctype', setup.accounts === 0 && 'Akun/Brand'].filter(Boolean) : [];

  return (
    <div className="border border-[#f0f0f0] dark:border-[#272a34] p-6 font-sans text-xs space-y-3">
      <div className="flex items-center gap-2 font-semibold text-emerald-600">
        <CheckCircle2 className="w-4 h-4" /> {name} siap dipakai
      </div>
      {setup && missing.length > 0 && (
        <div className="flex gap-2.5 border border-amber-200 bg-amber-50 p-3 leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p>Platform <strong>{setup.name}</strong> belum punya {missing.join(' dan ')}, jadi dropdown itu di task masih kosong.</p>
            <p className="flex flex-wrap gap-3 font-semibold">
              {setup.doctypes === 0 && <Link href="/rate-card" className="text-[#c2410c] hover:underline">Tambah Doctype di Rate Card</Link>}
              {setup.accounts === 0 && <Link href="/account-team" className="text-[#c2410c] hover:underline">Tambah Akun di Account &amp; Team</Link>}
            </p>
          </div>
        </div>
      )}
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
