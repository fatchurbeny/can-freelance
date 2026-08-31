'use client';

import { Check, ChevronDown, Loader2 } from 'lucide-react';

export interface TaskItem {
  id: string;
  name: string | null;
  taskMonth?: string | null;
  qtySubmit: string | null;
  pages: string | null;
  lastEditedTime: string;
  designer: { id: string; displayName: string } | null;
  doctype: { id: string; displayName: string } | null;
  taskAccounts: Array<{
    account: { id: string; displayName: string };
  }>;
}

interface PayrollTableRowProps {
  task: TaskItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  selectedMonth: string;
  allMonthOptions: string[];
  onSelectMonth: (taskId: string, month: string) => void;
  onAssign: (taskId: string) => void;
  isPending: boolean;
  isDropdownOpen: boolean;
  onToggleDropdown: (taskId: string) => void;
}

export default function PayrollTableRow({
  task,
  isSelected,
  onToggleSelect,
  selectedMonth,
  allMonthOptions,
  onSelectMonth,
  onAssign,
  isPending,
  isDropdownOpen,
  onToggleDropdown,
}: PayrollTableRowProps) {
  const qty = Number(task.qtySubmit || 0);
  const pages = Number(task.pages || 0);
  const qtyPages = qty * pages;
  const accountName = task.taskAccounts[0]?.account?.displayName || '-';

  return (
    <tr className="hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors font-mono text-xs">
      <td className="py-3 pl-5 pr-2 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(task.id)}
          className="w-4 h-4 cursor-pointer"
        />
      </td>
      <td
        className="py-3 px-2 w-[240px] max-w-[240px] min-w-0 font-bold text-gray-900 dark:text-white truncate"
        title={task.name || 'Untitled'}
      >
        {task.name || 'Untitled'}
      </td>
      <td className="py-3 px-2 w-[140px] text-gray-600 dark:text-gray-400 truncate">
        {task.designer?.displayName || '-'}
      </td>
      <td className="py-3 px-2 w-[160px] text-gray-600 dark:text-gray-400 whitespace-nowrap truncate">
        {task.doctype?.displayName || '-'}
      </td>
      <td className="py-3 px-2 w-[140px] text-gray-600 dark:text-gray-400 whitespace-nowrap truncate">
        {accountName}
      </td>
      <td className="py-3 px-2 w-[120px] text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {task.taskMonth || '-'}
      </td>
      <td className="py-3 px-2 w-[80px] text-center text-gray-900 dark:text-white font-bold whitespace-nowrap">
        {qty}
      </td>
      <td className="py-3 px-2 w-[80px] text-center text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {pages}
      </td>
      <td className="py-3 px-2 w-[90px] text-center text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap">
        {qtyPages}
      </td>
      <td className="p-0 text-center whitespace-nowrap w-[150px] h-full align-stretch">
        <div className="relative w-full h-full min-h-[44px]">
          <button
            type="button"
            data-trigger-id={task.id}
            onClick={() => onToggleDropdown(task.id)}
            className="w-full h-full min-h-[44px] border-l border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 flex items-center justify-between text-xs font-mono font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#16181d] focus:outline-none transition-colors cursor-pointer select-none whitespace-nowrap"
          >
            <span className="truncate">{selectedMonth || 'Pilih...'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
          </button>
          {isDropdownOpen && (
            <div
              data-dropdown-id={task.id}
              className="absolute right-0 top-full mt-1.5 w-44 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto font-mono text-xs"
            >
              <div className="space-y-0.5 px-1.5">
                {allMonthOptions.map((month) => {
                  const isChecked = selectedMonth === month;
                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => onSelectMonth(task.id, month)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left text-xs font-mono text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <span>{month}</span>
                      <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${
                        isChecked
                          ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                          : 'border-gray-300 dark:border-[#343846] bg-white dark:bg-[#16181d]'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </td>
      <td className="p-0 text-center whitespace-nowrap w-[120px] h-full align-stretch">
        <button
          type="button"
          onClick={() => onAssign(task.id)}
          disabled={!selectedMonth || isPending}
          className="w-full h-full min-h-[44px] border-l border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 hover:bg-[#ff5e1f] dark:hover:bg-[#ff5e1f] text-gray-700 dark:text-gray-300 hover:text-white dark:hover:text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-50/30 disabled:hover:text-gray-700"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>ASSIGN</span>
        </button>
      </td>
    </tr>
  );
}
