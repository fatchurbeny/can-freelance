'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface LeaderboardItem {
  designer: string;
  taskTotal: number;
  approvalPct: number;
  col1Count: number;
  col2Count: number;
  col3Count: number;
  otherCount: number;
  otherTooltip: string;
}

interface LeaderboardWidgetProps {
  data: LeaderboardItem[];
  columns: string[];
  topPerformer: string | null;
  brandName: string;
}

export default function LeaderboardWidget({ data, columns, topPerformer, brandName }: LeaderboardWidgetProps) {
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const col1 = columns?.[0] || 'Specialist 1';
  const col2 = columns?.[1] || 'Specialist 2';
  const col3 = columns?.[2] || 'Specialist 3';

  const visibleRows = data.filter((row) => row.taskTotal > 0);
  const hoveredRow = hoveredRowIndex !== null ? visibleRows[hoveredRowIndex] : null;
  const tooltipTop = 96 + (hoveredRowIndex ?? 0) * 58;

  const renderAvatar = (name: string) => {
    const initials = name.substring(0, 2).toUpperCase();
    const colors: { [key: string]: string } = {
      Najih: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      Putery: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
      Shela: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
      Rizal: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
    };

    const styleClass = colors[name] || 'bg-gray-500/10 text-gray-500 border border-gray-500/20';

    return (
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${styleClass}`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="glass dark:bg-[#111827] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-fit self-start overflow-visible">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Designer Leaderboard</h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            Output Top 3 Doctype Spesialis Designer - {brandName}
          </p>
        </div>
        {topPerformer && (
          <span className="text-[10px] font-bold px-3 py-1 rounded-full text-[#F0A848] border border-[#F0A848] bg-transparent flex items-center gap-1 uppercase">
            🏆 {topPerformer}
          </span>
        )}
      </div>

      <div className="relative overflow-visible pr-3">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[500px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#E8E0D8] dark:bg-[#111827] dark:shadow-[0_1px_0_0_#1F2937]">
              <tr className="font-bold text-gray-400 dark:text-gray-500">
                <th className="py-2.5 font-semibold">Designer</th>
                <th className="py-2.5 font-semibold text-center">Task</th>
                <th className="py-2.5 font-semibold">Approval</th>
                <th className="py-2.5 font-semibold text-center text-emerald-600 truncate max-w-[120px] dark:text-emerald-400" title={col1}>{col1}</th>
                <th className="py-2.5 font-semibold text-center text-pink-600 truncate max-w-[120px] dark:text-pink-400" title={col2}>{col2}</th>
                <th className="py-2.5 font-semibold text-center text-orange-600 truncate max-w-[120px] dark:text-orange-400" title={col3}>{col3}</th>
                <th className="py-2.5 font-semibold text-center flex items-center justify-center gap-1">
                  Other
                  <span title="Doctype di luar spesialis top-3">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D8]/60 font-medium text-gray-700 dark:divide-gray-800 dark:text-gray-300">
              {visibleRows.length > 0 ? (
                visibleRows.map((row, index) => (
                  <tr
                    key={row.designer}
                    className="hover:bg-[#F5F0EB]/50 transition-colors dark:hover:bg-gray-800/20"
                    onMouseEnter={() => row.otherCount > 0 && setHoveredRowIndex(index)}
                    onMouseLeave={() => setHoveredRowIndex((current) => (current === index ? null : current))}
                  >
                    <td className="py-3 flex items-center gap-2.5">
                      {renderAvatar(row.designer)}
                      <span className="font-semibold text-gray-900 dark:text-white">{row.designer}</span>
                    </td>
                    <td className="py-3 text-center font-bold text-gray-900 dark:text-white">{row.taskTotal}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 text-right font-bold text-gray-900 dark:text-white">{row.approvalPct}%</span>
                        <div className="w-12 h-1 rounded-full bg-gray-200 overflow-hidden shrink-0 dark:bg-gray-850">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.approvalPct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-emerald-600 bg-emerald-500/5 dark:bg-emerald-500/2 dark:text-emerald-400">{row.col1Count}</td>
                    <td className="py-3 text-center font-mono font-bold text-pink-600 bg-pink-500/5 dark:bg-pink-500/2 dark:text-pink-400">{row.col2Count}</td>
                    <td className="py-3 text-center font-mono font-bold text-orange-600 bg-orange-500/5 dark:bg-orange-500/2 dark:text-orange-400">{row.col3Count}</td>
                    <td className="py-3 text-center">
                      {row.otherCount > 0 ? (
                        <button
                          type="button"
                          onMouseEnter={() => setHoveredRowIndex(index)}
                          className="font-mono font-bold underline decoration-dotted decoration-gray-400 hover:text-gray-950 dark:hover:text-white"
                        >
                          {row.otherCount}
                        </button>
                      ) : (
                        <span className="font-mono text-gray-400 dark:text-gray-600">0</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center font-semibold text-gray-400 dark:text-gray-500">
                    Tidak ada data leaderboard
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {hoveredRow && (
          <div
            className="pointer-events-none absolute right-3 z-50 w-[230px] rounded-xl border border-gray-200 bg-[#111827]/95 p-2.5 text-left text-[10px] text-gray-300 shadow-2xl backdrop-blur-md dark:border-gray-800"
            style={{ top: `${tooltipTop}px` }}
          >
            <p className="mb-1 flex items-center justify-between border-b border-gray-200 pb-1 font-bold text-white dark:border-gray-800">
              <span>Detail Lainnya</span>
              <span className="text-[8px] font-normal text-gray-500">Task count</span>
            </p>
            <div className="space-y-0.5 font-medium leading-normal">
              {hoveredRow.otherTooltip.split(', ').filter(Boolean).map((item, idx) => (
                <p key={`${item}-${idx}`} className="truncate">
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
