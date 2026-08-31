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
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        className={`h-8 w-[140px] flex items-center justify-between gap-1.5 rounded-lg border bg-gray-50 dark:bg-[#16181d] px-3 text-xs font-mono font-medium transition-colors focus:outline-none ${
          open
            ? 'border-[#ff5e1f] text-[#ff5e1f]'
            : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-700 dark:text-gray-300 hover:border-[#ff5e1f]'
        }`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 top-full z-50 mt-1.5 w-[180px] max-h-64 overflow-y-auto rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl font-mono text-xs"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-mono text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {placeholder}
            {!value && <Check className="h-3.5 w-3.5 text-[#ff5e1f]" />}
          </button>
          {options.map(([optionValue, label]) => (
            <button
              key={optionValue}
              type="button"
              role="option"
              aria-selected={value === optionValue}
              onClick={() => { onChange(optionValue); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-mono transition-colors ${
                value === optionValue
                  ? 'bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="truncate">{label}</span>
              {value === optionValue && <Check className="h-3.5 w-3.5 shrink-0 text-[#ff5e1f]" />}
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
    <div className="flex flex-col bg-white dark:bg-[#0d0e12] rounded-xl border border-[#f0f0f0] dark:border-[#272a34]">
      {/* Table Toolbar Bar */}
      <div className="p-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              id="approval-payroll-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-xs font-mono text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-[#ff5e1f] transition-colors"
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
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {selectedIds.size} of {filteredTasks.length} selected
          </span>
        </div>

        {/* Batch Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex justify-center" ref={batchRef}>
            <button
              onClick={() => setBatchOpen(!batchOpen)}
              className="w-[130px] flex items-center justify-between px-3 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-xs font-mono font-medium text-gray-700 dark:text-gray-200 hover:border-[#ff5e1f] focus:outline-none transition-colors cursor-pointer select-none whitespace-nowrap"
            >
              <span className="truncate">{batchMonth || 'Pilih bulan...'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
            </button>
            {batchOpen && (
              <div className="absolute right-0 mt-8 w-44 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto font-mono text-xs">
                <div className="space-y-0.5 px-1.5">
                  {allMonthOptions.map((month) => {
                    const isChecked = batchMonth === month;
                    return (
                      <button
                        key={month}
                        onClick={() => { setBatchMonth(month); setBatchOpen(false); }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-mono text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <span>{month}</span>
                        <div className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                            : 'border-gray-300 dark:border-[#272a34] bg-white dark:bg-[#16181d]'
                        }`}>
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleBatchAssign}
            disabled={selectedIds.size === 0 || !batchMonth || isPending}
            className="px-4 py-1.5 rounded-full bg-[#ff5e1f] hover:bg-[#ff7038] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Assign Selected
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-b-xl">
        <table className="w-full border-collapse text-left font-mono text-xs min-w-[950px] rounded-b-xl">
          <thead>
            <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12] text-[11px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              <th className="py-3 pl-5 pr-2 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredTasks.length && filteredTasks.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-700 text-[#ff5e1f] focus:ring-[#ff5e1f]"
                />
              </th>
              <th className="py-3 px-2 w-full font-semibold">TASK</th>
              <th className="py-3 px-2 font-semibold">DESIGNER</th>
              <th className="py-3 px-2 whitespace-nowrap font-semibold">DOCTYPE</th>
              <th className="py-3 px-2 whitespace-nowrap font-semibold">BRAND</th>
              <th className="py-3 px-2 whitespace-nowrap font-semibold">TASK MONTH</th>
              <th className="py-3 px-2 text-center whitespace-nowrap font-semibold">QTY</th>
              <th className="py-3 px-2 text-center whitespace-nowrap font-semibold">PAGES</th>
              <th className="py-3 px-2 text-center whitespace-nowrap font-semibold">QTY PAGES</th>
              <th className="py-3 px-1 w-[140px] text-center font-semibold">PAYROLL MONTH</th>
              <th className="py-3 pr-5 pl-1 w-[120px] text-center font-semibold">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
            {filteredTasks.map((task) => {
              const qty = Number(task.qtySubmit || 0);
              const pages = Number(task.pages || 0);
              const qtyPages = qty * pages;
              const accountName =
                task.taskAccounts[0]?.account?.displayName || '-';

              return (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors font-mono text-xs"
                >
                  <td className="py-3 pl-5 pr-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={() => toggleSelect(task.id)}
                      className="rounded border-gray-300 dark:border-gray-700 text-[#ff5e1f] focus:ring-[#ff5e1f]"
                    />
                  </td>
                  <td
                    className="py-3 px-2 font-bold text-gray-900 dark:text-white truncate max-w-[200px]"
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
                  <td className="py-3 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {task.taskMonth || '-'}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-900 dark:text-white font-bold whitespace-nowrap">
                    {qty}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {pages}
                  </td>
                  <td className="py-3 px-2 text-center text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap">
                    {qtyPages}
                  </td>
                  <td className="py-3 px-1 relative text-center">
                    <div className="relative flex justify-center">
                      <div className="relative w-full max-w-[130px]">
                        <button
                          data-trigger-id={task.id}
                          onClick={() => setRowDropdown(rowDropdown === task.id ? null : task.id)}
                          className="w-[130px] flex items-center justify-between px-3 py-1 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-xs font-mono font-medium text-gray-700 dark:text-gray-200 hover:border-[#ff5e1f] focus:outline-none transition-colors cursor-pointer select-none whitespace-nowrap"
                        >
                          <span className="truncate">{monthSelections[task.id] || 'Pilih...'}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                        </button>
                        {rowDropdown === task.id && (
                          <div
                            data-dropdown-id={task.id}
                            className="absolute right-0 mt-1.5 w-44 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto font-mono text-xs"
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
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-mono text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                  >
                                    <span>{month}</span>
                                    <div className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-all ${
                                      isChecked
                                        ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                                        : 'border-gray-300 dark:border-[#272a34] bg-white dark:bg-[#16181d]'
                                    }`}>
                                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
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
                  <td className="py-3 pr-5 pl-1 text-center">
                    <button
                      onClick={() => handleAssign(task.id)}
                      disabled={!monthSelections[task.id] || isPending}
                      className="px-3 py-1 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:text-[#ff5e1f] dark:hover:text-[#ff5e1f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs font-mono font-medium flex items-center justify-center gap-1 mx-auto"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
