'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import {
  Loader2, Check, ChevronDown, Search, SlidersHorizontal, ChevronLeft, X,
  User, FileText, Building2, ArrowDown, ArrowUp,
} from 'lucide-react';
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

type SortKey = 'last-edited' | 'az' | 'za';

const SORT_LABELS: Record<SortKey, { label: string; icon: React.ReactNode }> = {
  'last-edited': { label: 'Last edited', icon: <ArrowDown className="w-3.5 h-3.5 text-gray-400" /> },
  'az': { label: 'A–Z', icon: <ArrowDown className="w-3.5 h-3.5 text-gray-400" /> },
  'za': { label: 'Z–A', icon: <ArrowUp className="w-3.5 h-3.5 text-gray-400" /> },
};

type FilterCategory = 'designers' | 'doctypes' | 'brands';

export default function ApprovalPayrollTable({ tasks, allMonthOptions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMonth, setBatchMonth] = useState('');
  const [monthSelections, setMonthSelections] = useState<Record<string, string>>({});
  const [batchOpen, setBatchOpen] = useState(false);
  const [rowDropdown, setRowDropdown] = useState<string | null>(null);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('last-edited');
  const [sortOpen, setSortOpen] = useState(false);
  const [doctypeFilter, setDoctypeFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [designerFilter, setDesignerFilter] = useState('');

  // Filter Popover state
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory | null>(null);

  const batchRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (batchRef.current && !batchRef.current.contains(e.target as Node)) {
        setBatchOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
        setActiveCategory(null);
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

  const activeFilterCount = (designerFilter ? 1 : 0) + (doctypeFilter ? 1 : 0) + (brandFilter ? 1 : 0);

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
      if (sortKey === 'az') return (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'za') return (b.name || '').localeCompare(a.name || '');
      return new Date(b.lastEditedTime).getTime() - new Date(a.lastEditedTime).getTime();
    });

  return (
    <div className="flex flex-col bg-white dark:bg-[#0d0e12] rounded-xl border border-[#f0f0f0] dark:border-[#272a34]">
      {/* Production-Style Unified Toolbar */}
      <div className="w-full min-h-11 p-2.5 border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] flex flex-wrap items-center justify-between gap-3 font-mono text-xs select-none">
        
        {/* Left Side: Search Bar + Sort Dropdown + Filter Popover + Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Integrated Left-Aligned Search Input */}
          <div className="relative w-48 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              id="approval-payroll-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 pl-9 pr-3 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-xs font-mono text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-[#ff5e1f] transition-colors"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="h-8 px-3 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-700 dark:text-gray-300 hover:border-[#ff5e1f] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {SORT_LABELS[sortKey].icon}
              <span className="font-medium text-xs">{SORT_LABELS[sortKey].label}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl">
                {(['last-edited', 'az', 'za'] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setSortKey(key); setSortOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      sortKey === key ? 'bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span>{SORT_LABELS[key].label}</span>
                    {sortKey === key && <Check className="w-3.5 h-3.5 text-[#ff5e1f]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Popover Button */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => { setFilterOpen(!filterOpen); setActiveCategory(null); }}
              className={`h-8 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer ${
                activeFilterCount > 0
                  ? 'border-[#ff5e1f] bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold'
                  : 'border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-700 dark:text-gray-300 hover:border-[#ff5e1f]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff5e1f] text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Filter Popover Menu */}
            {filterOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] max-h-72 overflow-y-auto rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl font-mono text-xs">
                {!activeCategory ? (
                  // Stage 1: Categories
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveCategory('designers')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" /> Designer
                      </span>
                      {designerFilter && <span className="px-1.5 py-0.5 rounded bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold text-[10px]">1</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCategory('doctypes')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" /> Doctype
                      </span>
                      {doctypeFilter && <span className="px-1.5 py-0.5 rounded bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold text-[10px]">1</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCategory('brands')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" /> Brand
                      </span>
                      {brandFilter && <span className="px-1.5 py-0.5 rounded bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold text-[10px]">1</span>}
                    </button>
                  </div>
                ) : (
                  // Stage 2: Options
                  <div>
                    <div className="flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#272a34] pb-1.5 mb-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => setActiveCategory(null)}
                        className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeCategory === 'designers') setDesignerFilter('');
                          if (activeCategory === 'doctypes') setDoctypeFilter('');
                          if (activeCategory === 'brands') setBrandFilter('');
                        }}
                        className="text-[10px] text-gray-400 hover:text-[#ff5e1f] transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="space-y-0.5 max-h-52 overflow-y-auto">
                      {activeCategory === 'designers' && designerOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setDesignerFilter(designerFilter === opt ? '' : opt); }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            designerFilter === opt ? 'bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span className="truncate">{opt}</span>
                          {designerFilter === opt && <Check className="w-3.5 h-3.5 text-[#ff5e1f]" />}
                        </button>
                      ))}

                      {activeCategory === 'doctypes' && doctypeOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setDoctypeFilter(doctypeFilter === opt ? '' : opt); }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            doctypeFilter === opt ? 'bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span className="truncate">{opt}</span>
                          {doctypeFilter === opt && <Check className="w-3.5 h-3.5 text-[#ff5e1f]" />}
                        </button>
                      ))}

                      {activeCategory === 'brands' && brandOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setBrandFilter(brandFilter === opt ? '' : opt); }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            brandFilter === opt ? 'bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span className="truncate">{opt}</span>
                          {brandFilter === opt && <Check className="w-3.5 h-3.5 text-[#ff5e1f]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Filter Chips */}
          {designerFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#ff5e1f]/20 bg-[#ff5e1f]/10 text-[#ff5e1f] text-xs font-mono font-bold">
              Designer: {designerFilter}
              <button type="button" onClick={() => setDesignerFilter('')} className="hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {doctypeFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#ff5e1f]/20 bg-[#ff5e1f]/10 text-[#ff5e1f] text-xs font-mono font-bold">
              Doctype: {doctypeFilter}
              <button type="button" onClick={() => setDoctypeFilter('')} className="hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {brandFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#ff5e1f]/20 bg-[#ff5e1f]/10 text-[#ff5e1f] text-xs font-mono font-bold">
              Brand: {brandFilter}
              <button type="button" onClick={() => setBrandFilter('')} className="hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {/* Right Side: Selection Status + Batch Actions + Search */}
        <div className="flex flex-wrap items-center gap-3">
          
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {selectedIds.size} of {filteredTasks.length} selected
          </span>

          {/* Batch Month Assign Dropdown & Action Button */}
          <div className="flex items-center gap-2">
            <div className="relative" ref={batchRef}>
              <button
                type="button"
                onClick={() => setBatchOpen(!batchOpen)}
                className="w-[130px] h-8 flex items-center justify-between px-3 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-xs font-mono font-medium text-gray-700 dark:text-gray-200 hover:border-[#ff5e1f] focus:outline-none transition-colors cursor-pointer select-none whitespace-nowrap"
              >
                <span className="truncate">{batchMonth || 'Pilih bulan...'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
              </button>
              {batchOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl max-h-60 overflow-y-auto font-mono text-xs">
                  <div className="space-y-0.5 px-1">
                    {allMonthOptions.map((month) => {
                      const isChecked = batchMonth === month;
                      return (
                        <button
                          key={month}
                          type="button"
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
              type="button"
              onClick={handleBatchAssign}
              disabled={selectedIds.size === 0 || !batchMonth || isPending}
              className="h-8 px-4 rounded-full bg-[#ff5e1f] hover:bg-[#ff7038] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shadow-none"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Assign Selected
            </button>
          </div>

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
