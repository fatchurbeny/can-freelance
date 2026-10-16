'use client';

import { DEFAULT_FIELD_ALIASES } from '@/lib/production-field-mapping';

/** Skema inti terkunci (nama default sync). Custom field ditarik otomatis saat sync. */
const CORE_NAMES = Object.values(DEFAULT_FIELD_ALIASES).map((aliases) => aliases[0]);

export default function StepSchema() {
  return (
    <div className="border border-[#f0f0f0] dark:border-[#272a34] font-sans">
      <div className="p-4 border-b border-[#f0f0f0] dark:border-[#272a34] text-xs text-gray-600 dark:text-gray-300">
        Properti inti dikunci agar sync dan perhitungan billing tetap konsisten. Properti lain di database akan disimpan sebagai custom field.
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:[&>li:nth-child(odd)]:border-r border-[#f0f0f0] dark:border-[#272a34]">
        {CORE_NAMES.map((name) => (
          <li key={name} className="flex items-center justify-between px-4 py-2.5 text-xs border-b border-[#f0f0f0] dark:border-[#272a34]">
            <span className="text-[#262626] dark:text-white">{name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Terkunci</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
