'use client';

import { slugifyName, type PlatformOption, type WizardData } from './types';

interface Props {
  data: WizardData;
  platforms: PlatformOption[];
  onChange: (patch: Partial<WizardData>) => void;
}

const fieldClass =
  'w-full h-11 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] px-3 font-sans text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-[#ff5e1f]';

export default function StepInfo({ data, platforms, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 border border-[#f0f0f0] dark:border-[#272a34] divide-y md:divide-y-0 md:divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
      <div className="p-4 space-y-2">
        <label className="block font-sans text-[11px] font-bold uppercase tracking-wider text-gray-500">Nama Production</label>
        <input
          className={fieldClass}
          placeholder="Contoh: Freelance Malang"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value, slug: slugifyName(e.target.value) })}
        />
        <p className="font-sans text-[11px] text-gray-400">Slug URL: <span className="font-mono">/production/{data.slug || '…'}</span></p>
      </div>
      <div className="p-4 space-y-2">
        <span className="block font-sans text-[11px] font-bold uppercase tracking-wider text-gray-500">Platform</span>
        <div className="grid gap-2">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => onChange({ platformId: platform.id })}
              className={`flex items-center justify-between h-11 px-3 rounded-none border font-sans text-xs text-left cursor-pointer transition-colors ${
                data.platformId === platform.id
                  ? 'border-[#ff5e1f] text-[#262626] dark:text-white font-semibold'
                  : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#16181d]/60'
              }`}
            >
              <span>{platform.name}</span>
              <span className="text-[10px] text-gray-400">{platform.outputType === 'dropbox_link' ? 'Dropbox Link' : 'Canva Link'}</span>
            </button>
          ))}
          {platforms.length === 0 && <p className="font-sans text-xs text-gray-400">Belum ada platform.</p>}
        </div>
      </div>
    </div>
  );
}
