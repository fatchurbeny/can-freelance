'use client';

import { Fragment, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Files, ChevronRight } from 'lucide-react';
import MonthCalendarPicker from '../MonthCalendarPicker';

export interface MonthTotals { tasks: number; templates: number; pages: number; payout: number }

export interface ProductionCompareRow {
  unitId: string;
  name: string;
  platformName: string;
  cur: MonthTotals;
  cmp: MonthTotals;
  /** Antrian bulan depan: task approved tanpa Payroll Month. */
  queue: { tasks: number; payout: number };
}

interface Props {
  rows: ProductionCompareRow[];
  curLabel: string;
  cmpLabel: string;
  nextLabel: string;
  availableMonths: string[];
}

type Metric = 'payout' | 'pages' | 'tasks' | 'templates';
const METRICS: { key: Metric; label: string }[] = [
  { key: 'payout', label: 'Payout' },
  { key: 'pages', label: 'Pages' },
  { key: 'tasks', label: 'Task' },
  { key: 'templates', label: 'Template' },
];

const money = (n: number) => `IDR ${n.toLocaleString('id-ID')}`;
const fmt = (m: Metric, n: number) => (m === 'payout' ? money(n) : n.toLocaleString('id-ID'));
const shortMonth = (label: string) => label.split('-')[0].slice(0, 3);

function Delta({ cur, cmp }: { cur: number; cmp: number }) {
  if (cmp === 0 && cur === 0) return <span className="text-gray-300">–</span>;
  if (cmp === 0) return <span className="font-bold text-emerald-600 dark:text-emerald-400">baru</span>;
  const pct = Math.round(((cur - cmp) / cmp) * 100);
  if (pct === 0) return <span className="text-gray-400">0%</span>;
  return <span className={`font-bold ${pct > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{pct > 0 ? '▲' : '▼'} {Math.abs(pct)}%</span>;
}

/** Perbandingan per production untuk dua payroll month: satu metrik dengan bar, antrian bulan depan, rincian saat baris dibuka. */
export default function ProductionBreakdown({ rows, curLabel, cmpLabel, nextLabel, availableMonths }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [metric, setMetric] = useState<Metric>('payout');
  const [hideEmpty, setHideEmpty] = useState(true);
  const [showQueue, setShowQueue] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const setCompare = (month: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('compare', month);
    router.push(`${pathname}?${params.toString()}`);
  };

  const isEmpty = (r: ProductionCompareRow) => r.cur.payout + r.cmp.payout + r.cur.tasks + r.cmp.tasks + r.queue.payout + r.queue.tasks === 0;
  const visible = rows.filter((r) => !hideEmpty || !isEmpty(r));
  const hiddenCount = rows.length - visible.length;
  const max = Math.max(1, ...visible.flatMap((r) => [r.cur[metric], r.cmp[metric]]));
  const sum = (pick: (r: ProductionCompareRow) => number) => visible.reduce((n, r) => n + pick(r), 0);
  const totalCur = sum((r) => r.cur[metric]);
  const totalCmp = sum((r) => r.cmp[metric]);
  const queueTotal = sum((r) => r.queue.payout);
  const cols = showQueue ? 7 : 6;

  return (
    <div className="flex flex-col bg-white dark:bg-[#0d0e12] border-b border-[#f0f0f0] dark:border-[#272a34] font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#f0f0f0] dark:border-[#272a34]">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white"><Files className="w-4 h-4 text-[#ff5e1f]" /> Per Production</span>
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex h-[34px] border border-[#f0f0f0] dark:border-[#272a34]">
            {METRICS.map((m, i) => (
              <button key={m.key} type="button" onClick={() => setMetric(m.key)} className={`px-3.5 font-bold cursor-pointer ${i > 0 ? 'border-l border-[#f0f0f0] dark:border-[#272a34]' : ''} ${metric === m.key ? 'bg-[#16181d] text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>{m.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span>Bandingkan dengan</span>
            <div className="w-44 h-[34px] flex items-stretch border border-[#f0f0f0] dark:border-[#272a34] [&>div>button:first-child]:min-h-0 [&>div>button:first-child]:px-3 [&>div>button:first-child]:text-xs">
              <MonthCalendarPicker value={cmpLabel} availableMonths={availableMonths} mode="filter" align="right" showAllOption={false} onChange={setCompare} placeholder="Pilih bulan" />
            </div>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={showQueue} onChange={(e) => setShowQueue(e.target.checked)} className="accent-[#ff5e1f]" /> Antrian bulan depan</label>
          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="accent-[#ff5e1f]" /> Sembunyikan kosong{hiddenCount > 0 ? ` (${hiddenCount})` : ''}</label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 dark:bg-[#16181d] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
              <th className="px-4 py-3 font-bold">Production</th>
              <th className="px-4 py-3 font-bold w-[34%]">{METRICS.find((m) => m.key === metric)?.label} {shortMonth(curLabel)} vs {shortMonth(cmpLabel)}</th>
              <th className="px-4 py-3 font-bold text-right">{shortMonth(curLabel)}</th>
              <th className="px-4 py-3 font-bold text-right">{shortMonth(cmpLabel)}</th>
              <th className="px-4 py-3 font-bold text-right">Δ</th>
              {showQueue && <th className="px-4 py-3 font-bold text-right whitespace-nowrap">Antrian → {shortMonth(nextLabel)}</th>}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const isOpen = open === r.unitId;
              return (
                <Fragment key={r.unitId}>
                  <tr onClick={() => setOpen(isOpen ? null : r.unitId)} className="border-b border-[#f0f0f0] dark:border-[#272a34] cursor-pointer hover:bg-gray-50/70 dark:hover:bg-[#16181d]/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#262626] dark:text-white">{r.name}</div>
                      <div className="text-[11px] text-gray-400">{r.platformName} · {r.cur.tasks} task · {r.cur.pages} pages</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-2.5 bg-gray-100 dark:bg-[#20232b]"><div className="h-2.5 bg-[#ff5e1f]" style={{ width: `${(r.cur[metric] / max) * 100}%` }} /></div>
                      <div className="h-2.5 mt-1 bg-gray-100 dark:bg-[#20232b]"><div className="h-2.5 bg-gray-300 dark:bg-gray-600" style={{ width: `${(r.cmp[metric] / max) * 100}%` }} /></div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-[#262626] dark:text-white">{fmt(metric, r.cur[metric])}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">{fmt(metric, r.cmp[metric])}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap"><Delta cur={r.cur[metric]} cmp={r.cmp[metric]} /></td>
                    {showQueue && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {r.queue.tasks > 0 ? <span className="px-2 py-0.5 text-[11px] font-bold bg-[#fff1e8] text-[#c2410c] dark:bg-[#ff5e1f]/10 dark:text-[#ff8a57]">+{money(r.queue.payout)} · {r.queue.tasks} task</span> : <span className="text-gray-300">–</span>}
                      </td>
                    )}
                    <td className="pr-3 text-gray-400"><ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} /></td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/60 dark:bg-[#16181d]/50">
                      <td colSpan={cols + 1} className="px-4 py-3">
                        <table className="w-full text-right text-[11px]">
                          <thead className="text-gray-400 uppercase tracking-wider">
                            <tr>
                              <th className="text-left font-semibold pb-1" rowSpan={2} />
                              <th colSpan={4} className="font-bold text-gray-700 dark:text-gray-300 border-l border-[#e5e7eb] dark:border-[#272a34]">{curLabel}</th>
                              <th colSpan={4} className="font-bold text-gray-700 dark:text-gray-300 border-l border-[#e5e7eb] dark:border-[#272a34]">{cmpLabel}</th>
                            </tr>
                            <tr>
                              {[0, 1].map((k) => ['Task', 'Template', 'Pages', 'Payout'].map((h, i) => <th key={`${k}-${h}`} className={`font-semibold pb-1 ${i === 0 ? 'border-l border-[#e5e7eb] dark:border-[#272a34]' : ''}`}>{h}</th>))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="tabular-nums">
                              <td className="text-left font-semibold text-gray-600 dark:text-gray-300">{r.name}</td>
                              <td className="border-l border-[#e5e7eb] dark:border-[#272a34]">{r.cur.tasks}</td><td>{r.cur.templates}</td><td>{r.cur.pages}</td><td className="font-bold">{money(r.cur.payout)}</td>
                              <td className="border-l border-[#e5e7eb] dark:border-[#272a34]">{r.cmp.tasks}</td><td>{r.cmp.templates}</td><td>{r.cmp.pages}</td><td className="font-bold">{money(r.cmp.payout)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={cols + 1} className="px-4 py-6 text-center text-gray-400">Belum ada production dengan data di dua bulan ini.</td></tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-[#16181d] font-bold text-[#262626] dark:text-white">
            <tr>
              <td className="px-4 py-3">Total</td>
              <td />
              <td className="px-4 py-3 text-right tabular-nums">{fmt(metric, totalCur)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmt(metric, totalCmp)}</td>
              <td className="px-4 py-3 text-right"><Delta cur={totalCur} cmp={totalCmp} /></td>
              {showQueue && <td className="px-4 py-3 text-right tabular-nums">{queueTotal > 0 ? `+${money(queueTotal)}` : '–'}</td>}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap gap-5 px-4 py-2.5 text-[11px] text-gray-500 border-t border-[#f0f0f0] dark:border-[#272a34]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#ff5e1f]" /> {curLabel}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-gray-300 dark:bg-gray-600" /> {cmpLabel}</span>
        <span>Klik baris untuk rincian Task, Template, Pages, dan Payout kedua bulan. Order bundle dibandingkan di segmen Order Bundle.</span>
      </div>
    </div>
  );
}
