'use client';

import type { InsightsBrandView } from '@/lib/canva-insights/view';
import { brandStyle, delta, fmtNum, ratio, relativeTime, RUN_LABEL, TONE_TEXT } from './format';

function SyncCell({ brand }: { brand: InsightsBrandView }) {
  if (!brand.lastRun) {
    return <span className="text-amber-700 dark:text-amber-400">Belum pernah · sinkronkan dari extension</span>;
  }
  const r = brand.lastRun;
  const tone = r.status === 'OK' && !brand.stale ? 'text-gray-700 dark:text-gray-300' : 'text-amber-700 dark:text-amber-400';
  return (
    <span className={tone} title={r.message ?? undefined}>
      {RUN_LABEL[r.status] ?? r.status} · {relativeTime(r.at)}
      {r.host ? ` · ${r.host}` : ''}
      {r.status === 'OK' && brand.stale ? ' · lebih dari 48 jam' : ''}
    </span>
  );
}

export default function BrandCompareTable({ brands, onSelect }: { brands: InsightsBrandView[]; onSelect: (id: string) => void }) {
  return (
    <section aria-labelledby="insights-compare" className="bg-white dark:bg-[#0d0e12]">
      <div className="px-5 py-3.5 border-b border-[#f0f0f0] dark:border-[#272a34]">
        <h3 id="insights-compare" className="text-sm font-bold text-gray-900 dark:text-white">Perbandingan brand</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs font-sans">
          <thead>
            <tr className="bg-gray-50/70 dark:bg-[#16181d] text-left text-gray-500 dark:text-gray-400">
              <th scope="col" className="px-5 py-2.5 font-semibold">Brand</th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-right">Applies</th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-right">Usages</th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-right">Usages / Applies</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Tier</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Sinkron terakhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
            {brands.map((b, i) => {
              const da = delta(b.applies, b.prevApplies);
              const du = delta(b.usages, b.prevUsages);
              return (
                <tr key={b.brandId} className="hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50">
                  <td className="px-5 py-3">
                    <button type="button" onClick={() => onSelect(b.brandId)} className="flex items-center gap-2.5 font-bold text-gray-900 dark:text-white hover:underline cursor-pointer">
                      <span aria-hidden="true" className="w-2.5 h-2.5" style={{ background: b.hasData ? brandStyle(i).color : '#a1a1aa' }} />
                      {b.name}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {b.hasData ? fmtNum(b.applies) : '—'} {b.hasData && <span className={`ml-1 text-[10px] font-bold ${TONE_TEXT[da.tone]}`}>{da.text}</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {b.hasData ? fmtNum(b.usages) : '—'} {b.hasData && <span className={`ml-1 text-[10px] font-bold ${TONE_TEXT[du.tone]}`}>{du.text}</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{b.hasData ? ratio(b.usages, b.applies) : '—'}</td>
                  <td className="px-3 py-3">{b.tier ?? '—'}</td>
                  <td className="px-5 py-3">
                    <SyncCell brand={b} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
