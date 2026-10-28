'use client';

import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PROVISIONAL_DAYS } from '@/lib/canva-insights/view';
import { fmtDay, fmtNum } from './format';

export interface TrendLine {
  key: string;
  name: string;
  color: string;
  dash?: string;
  values: number[];
}

interface Props {
  title: string;
  subtitle: string;
  days: string[];
  lines: TrendLine[];
  /** Toggle Applies/Usages (hanya tampilan semua brand). */
  metric?: { value: 'applies' | 'usages'; onChange: (m: 'applies' | 'usages') => void };
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] p-2.5 shadow-xl text-xs font-sans min-w-[180px]">
      <p className="font-bold text-gray-900 dark:text-white mb-1.5">{fmtDay(label, true)}</p>
      {[...payload]
        .sort((a: any, b: any) => b.value - a.value)
        .map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <span aria-hidden="true" className="w-2.5 h-0.5" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-bold tabular-nums text-gray-900 dark:text-white">{fmtNum(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

const compact = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k`.replace('.', ',') : String(v));

export default function InsightsTrendChart({ title, subtitle, days, lines, metric }: Props) {
  const data = days.map((day, i) => {
    const row: Record<string, string | number> = { day };
    for (const l of lines) row[l.key] = l.values[i] ?? 0;
    return row;
  });
  const provisionalFrom = days.length > PROVISIONAL_DAYS ? days[days.length - PROVISIONAL_DAYS] : days[0];

  return (
    <section aria-label={title} className="bg-white dark:bg-[#0d0e12] border-b border-[#f0f0f0] dark:border-[#272a34]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#f0f0f0] dark:border-[#272a34]">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        {metric && (
          <div role="group" aria-label="Metrik" className="flex border border-[#e4e4e7] dark:border-[#272a34] text-xs font-sans">
            {(['applies', 'usages'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metric.value === m}
                onClick={() => metric.onChange(m)}
                className={`h-9 px-3.5 cursor-pointer ${
                  metric.value === m ? 'bg-[#262626] text-white dark:bg-white dark:text-black font-bold' : 'bg-white dark:bg-[#16181d] text-gray-700 dark:text-gray-300'
                } ${m === 'usages' ? 'border-l border-[#e4e4e7] dark:border-[#272a34]' : ''}`}
              >
                {m === 'applies' ? 'Applies' : 'Usages'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-[320px] px-2 pt-4 text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
            <ReferenceArea
              x1={provisionalFrom}
              x2={days[days.length - 1]}
              fill="rgba(156, 163, 175, 0.12)"
              label={{ value: 'Sementara', position: 'insideTopLeft', fontSize: 10, fill: '#6b7280' }}
            />
            <XAxis dataKey="day" tickFormatter={(d) => fmtDay(d)} stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickFormatter={compact} stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<ChartTooltip />} />
            {lines.map((l) => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                name={l.name}
                stroke={l.color}
                strokeDasharray={l.dash}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 px-5 py-3 border-t border-[#f0f0f0] dark:border-[#272a34] text-xs font-sans">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-2">
            <svg aria-hidden="true" width="24" height="8">
              <line x1="1" x2="23" y1="4" y2="4" stroke={l.color} strokeWidth="2" strokeDasharray={l.dash} />
            </svg>
            <span className="font-bold text-gray-900 dark:text-white">{l.name}</span>
            <span className="text-gray-500 dark:text-gray-400 tabular-nums">{fmtNum(l.values.reduce((a, v) => a + v, 0))}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
