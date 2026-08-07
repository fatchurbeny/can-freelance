'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Loader2, Check, ChevronDown, Search } from 'lucide-react';
import {
  assignPayrollMonthAction,
  batchAssignPayrollMonthAction,
} from '@/app/actions/approval-payroll';
import { useRouter } from 'next/navigation';

interface TaskItem {
  id: string;
  name: string | null;
  qtySubmit: string | null;
  pages: string | null;
  lastEditedTime: string;
  designer: { id: string; displayName: string } | null;
  doctype: { id: string; displayName: string } | null;
  taskAccounts: Array<{
    account: { id: string; displayName: string };
  }>;
}

interface Props {
  tasks: TaskItem[];
  allMonthOptions: string[];
}

interface FilterSelectProps {
  id: string;
  value: string;
  placeholder: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}

function FilterSelect({ id, value, placeholder, options, onChange }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1];

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`h-9 w-[145px] flex items-center justify-between gap-2 rounded-xl border bg-white dark:bg-gray-900 px-3 text-xs font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
          open
            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
            : 'border-[#E8E0D8] dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:bg-[#F5F0EB] dark:hover:bg-gray-800'
        }`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 top-full z-50 mt-2 w-[190px] max-h-64 overflow-y-auto rounded-2xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-gray-950 p-1.5 shadow-xl"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-[#F5F0EB] dark:hover:bg-gray-800 transition-colors"
          >
            {placeholder}
            {!value && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
          </button>
          {options.map(([optionValue, label]) => (
            <button
              key={optionValue}
              type="button"
              role="option"
              aria-selected={value === optionValue}
              onClick={() => { onChange(optionValue); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                value === optionValue
                  ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-[#F5F0EB] dark:hover:bg-gray-800'
              }`}
            >
              <span className="truncate">{label}</span>
              {value === optionValue && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApprovalPayrollTable({ tasks, allMonthOptions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMonth, setBatchMonth] = useState('');
  const [monthSelections, setMonthSelections] = useState<Record<string, string>>({});
  const [batchOpen, setBatchOpen] = useState(false);
  const [rowDropdown, setRowDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('last-edited');
  const [doctypeFilter, setDoctypeFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [designerFilter, setDesignerFilter] = useState('');
  const batchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (batchRef.current && !batchRef.current.contains(e.target as Node)) {
        setBatchOpen(false);
      }
      // Row dropdown: close if click outside its panel
      if (rowDropdown) {
        const panel = document.querySelector(`[data-dropdown-id="${rowDropdown}"]`);
        if (panel && !panel.contains(e.target as Node)) {
          const trigger = document.querySelector(`[data-trigger-id="${rowDropdown}"]`);
          if (trigger && !trigger.contains(e.target as Node)) {
            setRowDropdown(null);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [rowDropdown]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const handleAssign = (taskId: string) => {
    const month = monthSelections[taskId];
    if (!month) return;
    startTransition(async () => {
      await assignPayrollMonthAction(taskId, month);
      router.refresh();
    });
  };

  const handleBatchAssign = () => {
    if (selectedIds.size === 0 || !batchMonth) return;
    startTransition(async () => {
      await batchAssignPayrollMonthAction(Array.from(selectedIds), batchMonth);
      setSelectedIds(new Set());
      setBatchMonth('');
      router.refresh();
    });
  };

  const optionNames = (values: Array<string | undefined>) =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));
  const doctypeOptions = optionNames(tasks.map((task) => task.doctype?.displayName));
  const brandOptions = optionNames(tasks.map((task) => task.taskAccounts[0]?.account?.displayName));
  const designerOptions = optionNames(tasks.map((task) => task.designer?.displayName));

  const filteredTasks = tasks
    .filter((task) => {
      const q = searchQuery.toLowerCase();
      const brand = task.taskAccounts[0]?.account?.displayName || '';
      return (
        (!q ||
          (task.name?.toLowerCase() || '').includes(q) ||
          (task.designer?.displayName?.toLowerCase() || '').includes(q) ||
          (task.doctype?.displayName?.toLowerCase() || '').includes(q) ||
          brand.toLowerCase().includes(q)) &&
        (!doctypeFilter || task.doctype?.displayName === doctypeFilter) &&
        (!brandFilter || brand === brandFilter) &&
        (!designerFilter || task.designer?.displayName === designerFilter)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'az') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'za') return (b.name || '').localeCompare(a.name || '');
      return new Date(b.lastEditedTime).getTime() - new Date(a.lastEditedTime).getTime();
    });

  return (
    <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[950px]">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            {/* Batch Actions Row */}
            <tr className="border-b border-[#E8E0D8] dark:border-gray-800">
              <th colSpan={8} className="p-4 font-normal">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[240px] max-w-[340px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      id="approval-payroll-search"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors font-sans"
                    />
                  </div>
                  {[
                    { id: 'approval-sort', placeholder: 'Sort by', value: sortBy, set: setSortBy, options: [['last-edited', 'Last edited'], ['az', 'A–Z'], ['za', 'Z–A']] as Array<[string, string]> },
                    { id: 'doctype-filter', placeholder: 'All doctypes', value: doctypeFilter, set: setDoctypeFilter, options: doctypeOptions.map((item) => [item, item] as [string, string]) },
                    { id: 'brand-filter', placeholder: 'All brands', value: brandFilter, set: setBrandFilter, options: brandOptions.map((item) => [item, item] as [string, string]) },
                    { id: 'designer-filter', placeholder: 'All designers', value: designerFilter, set: setDesignerFilter, options: designerOptions.map((item) => [item, item] as [string, string]) },
                  ].map((control) => (
                    <FilterSelect
                      key={control.id}
                      id={control.id}
                      value={control.value}
                      placeholder={control.placeholder}
                      options={control.options}
                      onChange={control.set}
                    />
                  ))}
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap font-sans">
                    {selectedIds.size} of {filteredTasks.length} selected
                  </span>
                </div>
              </th>
              <th className="p-4 text-center font-normal">
                <div className="relative flex justify-center" ref={batchRef}>
                  <button
                    onClick={() => setBatchOpen(!batchOpen)}
                    className="w-[130px] flex items-center justify-between px-3 py-1.5 rounded-xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-[#F5F0EB] dark:hover:bg-gray-800 focus:outline-none transition-colors shadow-sm cursor-pointer select-none whitespace-nowrap font-sans"
                  >
                    <span className="truncate">{batchMonth || 'Pilih bulan...'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                  </button>
                  {batchOpen && (
                    <div className="absolute right-1/2 translate-x-1/2 mt-9 w-48 rounded-2xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl z-50 py-2.5 max-h-60 overflow-y-auto backdrop-blur-md">
                      <div className="space-y-0.5 px-1.5">
                        {allMonthOptions.map((month) => {
                          const isChecked = batchMonth === month;
                          return (
                            <button
                              key={month}
                              onClick={() => { setBatchMonth(month); setBatchOpen(false); }}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-[#F5F0EB] dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer font-sans"
                            >
                              <span className="dark:text-gray-200">{month}</span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 text-white'
                                  : 'border-gray-300 dark:border-gray-600'
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
              </th>
              <th className="p-4 text-center font-normal">
                <div className="flex justify-center">
                  <button
                    onClick={handleBatchAssign}
                    disabled={selectedIds.size === 0 || !batchMonth || isPending}
                    className="min-w-[110px] px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap font-sans"
                  >
                    {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Assign Selected
                  </button>
                </div>
              </th>
            </tr>
            <tr className="text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredTasks.length && filteredTasks.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="py-3 px-2 w-full">Task</th>
              <th className="py-3 px-2">Designer</th>
              <th className="py-3 px-2 whitespace-nowrap">Doctype</th>
              <th className="py-3 px-2 whitespace-nowrap">Brand</th>
              <th className="py-3 px-2 text-center whitespace-nowrap">QTY</th>
              <th className="py-3 px-2 text-center whitespace-nowrap">Pages</th>
              <th className="py-3 px-2 text-center whitespace-nowrap">QTY Pages</th>
              <th className="py-3 px-1 w-[140px] text-center">Payroll Month</th>
              <th className="py-3 px-1 w-[120px] text-center">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-[#E8E0D8] dark:divide-gray-800/50">
            {filteredTasks.map((task) => {
              const qty = Number(task.qtySubmit || 0);
              const pages = Number(task.pages || 0);
              const qtyPages = qty * pages;
              const accountName =
                task.taskAccounts[0]?.account?.displayName || '-';

              return (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors"
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={() => toggleSelect(task.id)}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td
                    className="py-3 px-2 text-gray-900 dark:text-white font-medium truncate max-w-[160px]"
                    title={task.name || 'Untitled'}
                  >
                    {task.name || 'Untitled'}
                  </td>
                  <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                    {task.designer?.displayName || '-'}
                  </td>
                  <td className="py-3 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {task.doctype?.displayName || '-'}
                  </td>
                  <td className="py-3 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {accountName}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-900 dark:text-white font-medium whitespace-nowrap">
                    {qty}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {pages}
                  </td>
                  <td className="py-3 px-2 text-center text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                    {qtyPages}
                  </td>
                  <td className="py-3 px-1 relative text-center">
                    {/* Per-row month custom dropdown */}
                    <div className="relative flex justify-center">
                      <div className="relative w-full max-w-[130px]">
                        <button
                          data-trigger-id={task.id}
                          onClick={() => setRowDropdown(rowDropdown === task.id ? null : task.id)}
                          className="w-[130px] flex items-center justify-between px-3 py-1.5 rounded-xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-[#F5F0EB] dark:hover:bg-gray-800 focus:outline-none transition-colors shadow-sm cursor-pointer select-none whitespace-nowrap font-sans"
                        >
                          <span className="truncate">{monthSelections[task.id] || 'Pilih...'}</span>
                          <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
                        </button>
                        {rowDropdown === task.id && (
                          <div
                            data-dropdown-id={task.id}
                            className="absolute right-1/2 translate-x-1/2 mt-2 w-48 rounded-2xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl z-50 py-2.5 max-h-60 overflow-y-auto backdrop-blur-md"
                          >
                          <div className="space-y-0.5 px-1.5">
                            {allMonthOptions.map((month) => {
                              const isChecked = monthSelections[task.id] === month;
                              return (
                                <button
                                  key={month}
                                  onClick={() => {
                                    setMonthSelections((prev) => ({ ...prev, [task.id]: month }));
                                    setRowDropdown(null);
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-[#F5F0EB] dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
                                >
                                  <span className="dark:text-gray-200">{month}</span>
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                    isChecked
                                      ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 text-white'
                                      : 'border-gray-300 dark:border-gray-600'
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
                    </div>
                  </td>
                  <td className="py-3 px-1 text-center">
                    <button
                      onClick={() => handleAssign(task.id)}
                      disabled={!monthSelections[task.id] || isPending}
                      className="min-w-[90px] px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      {isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : null}
                      Assign
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
