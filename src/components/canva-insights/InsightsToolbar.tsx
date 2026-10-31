'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import SelectDropdown from '@/components/SelectDropdown';
import { RANGE_PRESETS, type RangePreset } from '@/lib/canva-insights/range';
import type { InsightsAudience, InsightsBrandView } from '@/lib/canva-insights/view';
import { brandStyle, fmtNum } from './format';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Free & Pro' },
  { value: 'B', label: 'Free' },
  { value: 'C', label: 'Pro' },
];

interface Props {
  brands: InsightsBrandView[];
  brandId: string;
  onBrandChange: (id: string) => void;
  audience: InsightsAudience;
  onAudienceChange: (a: InsightsAudience) => void;
  preset: RangePreset;
  onPresetChange: (p: RangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomChange: (from: string, to: string) => void;
  comparisonLabel: string | null;
}

function BrandSelect({ brands, value, onChange }: { brands: InsightsBrandView[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const options = [
    { value: 'all', label: 'Semua brand', meta: `${brands.filter((b) => b.hasData).length} dengan data`, color: '#262626' },
    ...brands.map((b, i) => ({
      value: b.brandId,
      label: b.name,
      meta: b.hasData ? fmtNum(b.applies) : 'belum sinkron',
      color: b.hasData ? brandStyle(i).color : '#a1a1aa',
    })),
  ];
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-10 flex items-center gap-2.5 px-3 border border-[#e4e4e7] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-xs font-sans text-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
      >
        <span className="text-gray-500 dark:text-gray-400">Brand</span>
        <span className="flex items-center gap-2 font-bold">
          <span aria-hidden="true" className="w-2.5 h-2.5" style={{ background: selected.color }} />
          {selected.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" aria-label="Pilih brand" className="absolute left-0 mt-1.5 w-72 border border-[#e4e4e7] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1 shadow-xl z-50 font-sans text-xs">
          {options.map((o) => {
            const isSel = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full h-10 flex items-center justify-between gap-2 px-2.5 text-left cursor-pointer ${
                  isSel ? 'bg-gray-100 dark:bg-[#20232b] font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="w-2.5 h-2.5" style={{ background: o.color }} />
                  {o.label}
                </span>
                <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-normal">
                  {o.meta}
                  {isSel && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InsightsToolbar(props: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12]">
      <BrandSelect brands={props.brands} value={props.brandId} onChange={props.onBrandChange} />
      <div className="w-36">
        <SelectDropdown
          label="Audiens"
          options={AUDIENCE_OPTIONS}
          value={props.audience}
          onChange={(v) => props.onAudienceChange(v as InsightsAudience)}
          buttonClassName="h-10 rounded-none"
        />
      </div>
      <div className="w-44">
        <SelectDropdown
          label="Rentang"
          options={RANGE_PRESETS}
          value={props.preset}
          onChange={(v) => props.onPresetChange(v as RangePreset)}
          buttonClassName="h-10 rounded-none"
        />
      </div>
      {props.preset === 'custom' && (
        <div className="flex items-center gap-1.5 text-xs font-sans text-gray-600 dark:text-gray-400">
          <label className="sr-only" htmlFor="insights-from">Dari tanggal</label>
          <input
            id="insights-from"
            type="date"
            value={props.customFrom}
            max={props.customTo}
            onChange={(e) => props.onCustomChange(e.target.value, props.customTo)}
            className="h-10 px-2 border border-[#e4e4e7] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-900 dark:text-gray-100"
          />
          <span aria-hidden="true">–</span>
          <label className="sr-only" htmlFor="insights-to">Sampai tanggal</label>
          <input
            id="insights-to"
            type="date"
            value={props.customTo}
            min={props.customFrom}
            onChange={(e) => props.onCustomChange(props.customFrom, e.target.value)}
            className="h-10 px-2 border border-[#e4e4e7] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-900 dark:text-gray-100"
          />
        </div>
      )}
      {props.comparisonLabel && (
        <span className="ml-auto text-[11px] font-sans text-gray-500 dark:text-gray-400">Dibanding {props.comparisonLabel}</span>
      )}
    </div>
  );
}
