'use client';

import { useMemo } from 'react';
import {
  FileText, FileClock, Loader2, Hourglass, FileCheck2, CheckCircle2, UserCheck, XCircle,
} from 'lucide-react';
import { isTaskInPeriods, formatPeriodKeyToLabel } from '@/lib/period-utils';

interface Task {
  id: string;
  taskMonth?: string | null;
  designStatus: { notionKey: string; displayName: string } | null;
  doctype: { displayName: string } | null;
}

interface Props {
  tasks: Task[];
  selectedMonths?: string[];
}

const STATUS_CARDS = [
  { label: 'Draft', statuses: ['Draft', 'draft'], Icon: FileText, chip: 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400' },
  { label: 'Not Started', statuses: ['Not Started', 'Not started'], Icon: FileClock, chip: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400' },
  { label: 'In Progress', statuses: ['In Progress', 'In progress'], Icon: Loader2, chip: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400' },
  { label: 'QA', statuses: ['QA', 'qa', 'Q&A', 'q&a', 'In QA', 'in qa', 'QA Process', 'Quality Assurance', 'Testing/QA', 'QA/Testing'], Icon: Hourglass, chip: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400' },
  { label: 'In Review', statuses: ['In Review', 'In review'], Icon: FileCheck2, chip: 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400' },
  { label: 'Approved', statuses: ['Aproved', 'Approved'], Icon: CheckCircle2, chip: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { label: 'Profile Only', statuses: ['Aproved-Profile Only', 'Approved-Profile Only'], Icon: UserCheck, chip: 'bg-pink-500/10 text-pink-500 dark:bg-pink-500/20 dark:text-pink-400' },
  { label: 'Rejected', statuses: ['Reject', 'reject'], Icon: XCircle, chip: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400' },
];

export default function ProductionOverview({ tasks, selectedMonths }: Props) {
  const monthDisplayLabel = useMemo(() => {
    if (!selectedMonths || selectedMonths.length === 0) return 'Semua Bulan';
    if (selectedMonths.length === 1) return formatPeriodKeyToLabel(selectedMonths[0]);
    return `${selectedMonths.length} Bulan`;
  }, [selectedMonths]);

  const filteredTasks = useMemo(() => {
    if (!selectedMonths || selectedMonths.length === 0) return tasks;
    return tasks.filter((t) => isTaskInPeriods(t.taskMonth, selectedMonths));
  }, [tasks, selectedMonths]);

  const statusCounts = useMemo(() => {
    return STATUS_CARDS.map((card) => ({
      ...card,
      count: filteredTasks.filter((t) => {
        const key = t.designStatus?.notionKey ?? '';
        return card.statuses.includes(key);
      }).length,
    }));
  }, [filteredTasks]);

  const doctypeStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of filteredTasks) {
      const name = t.doctype?.displayName;
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    const max = sorted[0]?.count ?? 0;
    return sorted.map((row) => ({ ...row, pct: max > 0 ? Math.round((row.count / max) * 100) : 0 }));
  }, [filteredTasks]);

  return (
    <div className="flex flex-col divide-y divide-[#f0f0f0] dark:divide-[#272a34] w-full">
      {/* 8 Status Summary KPI Cards (4 Column Grid with 1px dividers) */}
      <div className="flex flex-col">
        <div className="px-6 pt-5 pb-3 bg-white dark:bg-[#0d0e12] border-b border-[#f0f0f0] dark:border-[#272a34]">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            STATUS SUMMARY OVERVIEW ({monthDisplayLabel})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
          {statusCounts.map(({ label, count, Icon, chip }, idx) => (
            <div
              key={label}
              className={`p-5 flex flex-col justify-between hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors ${
                idx % 4 !== 3 ? 'sm:border-r border-[#f0f0f0] dark:border-[#272a34]' : ''
              } ${idx < 4 ? 'border-b border-[#f0f0f0] dark:border-[#272a34]' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${chip}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-sans font-bold text-3xl text-gray-900 dark:text-white">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Doctype Distribution Stats Widget */}
      <div className="flex flex-col bg-white dark:bg-[#0d0e12]">
        <div className="p-6 pb-3 flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#272a34]">
          <div>
            <h3 className="font-sans font-bold text-sm text-gray-900 dark:text-white">Top Doctypes</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              Doctype Terbanyak Dikerjakan ({monthDisplayLabel})
            </p>
          </div>
          <span className="text-[10px] font-bold font-sans px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {doctypeStats.length} DOCTYPE
          </span>
        </div>

        <div className="p-6">
          {doctypeStats.length > 0 ? (
            <div className="flex flex-col gap-4">
              {doctypeStats.map((row) => (
                <div key={row.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <span className="truncate capitalize">{row.name}</span>
                    <span className="font-sans font-bold text-indigo-600 dark:text-indigo-400">{row.count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.max(row.pct, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center font-medium">
              Tidak ada data doctype untuk bulan ini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
