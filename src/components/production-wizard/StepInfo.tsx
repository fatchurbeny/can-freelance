'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import InfoTip from '../InfoTip';
import { isContracted, slugifyName, type PlatformOption, type WizardData } from './types';

interface Props {
  data: WizardData;
  platforms: PlatformOption[];
  onChange: (patch: Partial<WizardData>) => void;
}


export default function StepInfo({ data, platforms, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 border border-[#f0f0f0] dark:border-[#272a34] divide-y md:divide-y-0 md:divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
      <div className="p-4 space-y-2">
        <label className="block font-sans text-[11px] font-bold uppercase tracking-wider text-gray-500">Nama Production</label>
        <div className="flex h-11 items-stretch border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] focus-within:ring-1 focus-within:ring-[#ff5e1f]">
          <input
            className="min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 font-sans text-xs text-gray-900 dark:text-white outline-none"
            placeholder="Contoh: Freelance Malang"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value, slug: slugifyName(e.target.value) })}
          />
          <span className="max-w-[50%] shrink-0 self-center truncate pr-3 font-mono text-[11px] text-gray-400" title="Slug URL">/production/{data.slug || '…'}</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <span className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Platform
          <InfoTip label="Platform">Production hanya untuk platform yang sudah punya kontrak (tarif dasar). Isian wizard tetap tersimpan saat membuat kontrak baru.</InfoTip>
        </span>
        <div className="grid gap-2">
          {platforms.map((platform) => {
            const contracted = isContracted(platform);
            return (
              <button
                key={platform.id}
                type="button"
                disabled={!contracted}
                onClick={() => onChange({ platformId: platform.id })}
                title={contracted ? undefined : 'Buat tarif kontrak dulu di Rate Card → Kontrak'}
                className={`flex items-center justify-between h-11 px-3 rounded-none border font-sans text-xs text-left transition-colors ${
                  !contracted
                    ? 'border-[#f0f0f0] dark:border-[#272a34] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : data.platformId === platform.id
                      ? 'border-[#ff5e1f] text-[#262626] dark:text-white font-semibold cursor-pointer'
                      : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#16181d]/60 cursor-pointer'
                }`}
              >
                <span>{platform.name}</span>
                <span className={`text-[10px] ${contracted ? 'text-gray-400' : 'font-semibold text-amber-600 dark:text-amber-400'}`}>
                  {contracted ? (platform.outputType === 'dropbox_link' ? 'Dropbox Link' : 'Canva Link') : 'Belum berkontrak'}
                </span>
              </button>
            );
          })}
          {platforms.length === 0 && <p className="font-sans text-xs text-gray-400">Belum ada platform.</p>}
          <Link
            href="/rate-card?tab=kontrak&new=1&from=wizard"
            className="flex h-11 items-center gap-2 px-3 rounded-none border border-dashed border-[#e5e5e5] dark:border-[#272a34] font-sans text-xs font-semibold text-[#c2410c] hover:bg-gray-50 dark:hover:bg-[#16181d]/60"
          >
            <Plus className="h-3.5 w-3.5" /> Platform belum ada? Buat kontrak di Rate Card
          </Link>
        </div>
      </div>
    </div>
  );
}
