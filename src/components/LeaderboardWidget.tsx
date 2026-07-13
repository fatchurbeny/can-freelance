'use client';

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
  const col1 = columns?.[0] || 'Specialist 1';
  const col2 = columns?.[1] || 'Specialist 2';
  const col3 = columns?.[2] || 'Specialist 3';

  // Helper to draw designer initials avatar
  const renderAvatar = (name: string) => {
    const initials = name.substring(0, 2).toUpperCase();
    
    // Choose nice bg colors for initials
    const colors: { [key: string]: string } = {
      'Najih': 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      'Putery': 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
      'Shela': 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
      'Rizal': 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
    };

    const styleClass = colors[name] || 'bg-gray-500/10 text-gray-500 border border-gray-500/20';

    return (
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${styleClass}`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="glass dark:bg-[#111827] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full max-h-[268px] overflow-visible">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">
            Designer Leaderboard
          </h3>
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

      {/* Table Container */}
      <div className="flex-1 overflow-x-auto overflow-y-visible relative pr-3">
        <table className="w-full text-left text-xs border-collapse min-w-[500px]">
          <thead className="sticky top-0 z-10 bg-white dark:bg-[#111827] shadow-[0_1px_0_0_#E8E0D8] dark:shadow-[0_1px_0_0_#1F2937]">
            <tr className="text-gray-400 dark:text-gray-500 font-bold">
              <th className="py-2.5 font-semibold">Designer</th>
              <th className="py-2.5 font-semibold text-center">Task</th>
              <th className="py-2.5 font-semibold">Approval</th>
              <th className="py-2.5 font-semibold text-center text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]" title={col1}>
                {col1}
              </th>
              <th className="py-2.5 font-semibold text-center text-pink-600 dark:text-pink-400 truncate max-w-[120px]" title={col2}>
                {col2}
              </th>
              <th className="py-2.5 font-semibold text-center text-orange-600 dark:text-orange-400 truncate max-w-[120px]" title={col3}>
                {col3}
              </th>
              <th className="py-2.5 font-semibold text-center flex items-center justify-center gap-1">
                Other
                <span title="Doctype di luar spesialis top-3">
                  <Info className="w-3 h-3 text-gray-400 cursor-help" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E0D8]/60 dark:divide-gray-800 font-medium text-gray-700 dark:text-gray-300">
            {data.filter(row => row.taskTotal > 0).length > 0 ? (
              data.filter(row => row.taskTotal > 0).map((row) => (
                <tr key={row.designer} className="hover:bg-[#F5F0EB]/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="py-3 flex items-center gap-2.5">
                    {renderAvatar(row.designer)}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {row.designer}
                    </span>
                  </td>
                  <td className="py-3 text-center text-gray-900 dark:text-white font-bold">
                    {row.taskTotal}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 text-right font-bold text-gray-900 dark:text-white">{row.approvalPct}%</span>
                      <div className="w-12 h-1 rounded-full bg-gray-200 dark:bg-gray-850 overflow-hidden shrink-0">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${row.approvalPct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/2 font-mono">
                    {row.col1Count}
                  </td>
                  <td className="py-3 text-center font-bold text-pink-600 dark:text-pink-400 bg-pink-500/5 dark:bg-pink-500/2 font-mono">
                    {row.col2Count}
                  </td>
                  <td className="py-3 text-center font-bold text-orange-600 dark:text-orange-400 bg-orange-500/5 dark:bg-orange-500/2 font-mono">
                    {row.col3Count}
                  </td>
                  <td className="py-3 text-center relative">
                    {row.otherCount > 0 ? (
                      <div className="relative group cursor-pointer inline-block">
                        <span className="underline decoration-dotted decoration-gray-400 hover:text-gray-950 dark:hover:text-white font-bold font-mono">
                          {row.otherCount}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block bg-[#111827]/95 border border-gray-200 dark:border-gray-800 p-2.5 rounded-xl shadow-2xl z-50 min-w-[180px] text-left text-[10px] text-gray-300 backdrop-blur-md">
                          <p className="font-bold text-white mb-1 border-b border-gray-200 dark:border-gray-800 pb-1 flex items-center justify-between">
                            <span>Detail Lainnya</span>
                            <span className="text-[8px] text-gray-500 font-normal">Task count</span>
                          </p>
                          <div className="space-y-0.5 font-medium leading-normal max-h-32 overflow-y-auto">
                            {row.otherTooltip.split(', ').map((item: string, idx: number) => (
                              <p key={idx} className="truncate">{item}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600 font-mono">0</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400 dark:text-gray-500 font-semibold">
                  Tidak ada data leaderboard
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
