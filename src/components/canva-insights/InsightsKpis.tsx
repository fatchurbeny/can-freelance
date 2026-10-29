'use client';

import { Activity, Layers, MousePointerClick, Percent } from 'lucide-react';
import type { InsightsBrandView } from '@/lib/canva-insights/view';
import { delta, fmtNum, pointDelta, ratio, TONE_PILL } from './format';

interface Props {
  /** Brand yang dijumlahkan (semua brand atau satu). */
  brands: InsightsBrandView[];
  /** Kartu ke-4: status sinkron (semua brand) atau jumlah template (satu brand). */
  fourth: { label: string; value: string; pill: string; sub: string };
  /** InsightsData.range.scale (persen = rata-rata per hari). */
  scale: number;
}

export default function InsightsKpis({ brands, fourth, scale }: Props) {
  const sum = (key: 'applies' | 'usages' | 'prevApplies' | 'prevUsages') => brands.reduce((a, b) => a + b[key], 0);
  const applies = sum('applies');
  const usages = sum('usages');
  const prevApplies = sum('prevApplies');
  const prevUsages = sum('prevUsages');
  const ratioDelta = pointDelta(applies ? usages / applies : 0, prevApplies ? prevUsages / prevApplies : 0, prevApplies > 0);

  const cards = [
    { label: 'Total Applies', icon: MousePointerClick, value: fmtNum(applies), d: delta(applies, prevApplies, scale), sub: `Sebelumnya ${fmtNum(prevApplies)}` },
    { label: 'Total Usages', icon: Activity, value: fmtNum(usages), d: delta(usages, prevUsages, scale), sub: `Sebelumnya ${fmtNum(prevUsages)}` },
    { label: 'Usages per Applies', icon: Percent, value: ratio(usages, applies), d: ratioDelta, sub: `Sebelumnya ${ratio(prevUsages, prevApplies)}` },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12] border-b border-[#f0f0f0] dark:border-[#272a34]">
      {cards.map((c) => (
        <div key={c.label} className="p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</h4>
            <c.icon className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-sans font-bold text-3xl text-[#262626] dark:text-white tabular-nums">{c.value}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TONE_PILL[c.d.tone]}`}>{c.d.text}</span>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">{c.sub}</span>
        </div>
      ))}
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">{fourth.label}</h4>
          <Layers className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-sans font-bold text-3xl text-[#262626] dark:text-white tabular-nums">{fourth.value}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TONE_PILL.none}`}>{fourth.pill}</span>
        </div>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">{fourth.sub}</span>
      </div>
    </div>
  );
}
