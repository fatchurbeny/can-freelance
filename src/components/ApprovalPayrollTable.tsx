'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { assignPayrollMonthAction, batchAssignPayrollMonthAction } from '@/app/actions/approval-payroll';
import { useRouter } from 'next/navigation';
import PayrollTableRow, { TaskItem } from './payroll/PayrollTableRow';
import PayrollToolbar, { SortKey, FilterCategory } from './payroll/PayrollToolbar';

interface Props {
  tasks: TaskItem[];
  allMonthOptions: string[];
}

const SORT_LABELS: Record<SortKey, { label: string; icon: React.ReactNode }> = {
  'last-edited': { label: 'Last edited', icon: <ArrowDown className="w-3.5 h-3.5 text-gray-400" /> },
  'az': { label: 'A–Z', icon: <ArrowDown className="w-3.5 h-3.5 text-gray-400" /> },
  'za': { label: 'Z–A', icon: <ArrowUp className="w-3.5 h-3.5 text-gray-400" /> },
};

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
    <div className="flex flex-col bg-white dark:bg-[#0d0e12]">
      {/* Sticky Header Group: Row 2 (Payroll Toolbar) + Row 3 (Table Header) */}
      <div className="sticky top-[101px] z-30 bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-sm">
        <PayrollToolbar
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          sortKey={sortKey} setSortKey={setSortKey} sortOpen={sortOpen} setSortOpen={setSortOpen} sortRef={sortRef} SORT_LABELS={SORT_LABELS}
          filterOpen={filterOpen} setFilterOpen={setFilterOpen} filterRef={filterRef} activeCategory={activeCategory} setActiveCategory={setActiveCategory} activeFilterCount={activeFilterCount}
          designerFilter={designerFilter} setDesignerFilter={setDesignerFilter} doctypeFilter={doctypeFilter} setDoctypeFilter={setDoctypeFilter} brandFilter={brandFilter} setBrandFilter={setBrandFilter}
          designerOptions={designerOptions} doctypeOptions={doctypeOptions} brandOptions={brandOptions}
          selectedIdsCount={selectedIds.size} totalFilteredCount={filteredTasks.length}
          batchMonth={batchMonth} setBatchMonth={setBatchMonth} batchOpen={batchOpen} setBatchOpen={setBatchOpen} batchRef={batchRef} allMonthOptions={allMonthOptions} handleBatchAssign={handleBatchAssign} isPending={isPending}
        />

        <div className="overflow-x-auto bg-gray-50/50 dark:bg-[#0d0e12]">
          <table className="w-full border-collapse text-left font-mono text-xs min-w-[950px]">
            <thead>
              <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12] text-[11px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <th className="py-3 pl-5 pr-2 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredTasks.length && filteredTasks.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2 w-[240px] max-w-[240px] font-semibold">TASK</th>
                <th className="py-3 px-2 w-[140px] font-semibold">DESIGNER</th>
                <th className="py-3 px-2 w-[160px] whitespace-nowrap font-semibold">DOCTYPE</th>
                <th className="py-3 px-2 w-[140px] whitespace-nowrap font-semibold">BRAND</th>
                <th className="py-3 px-2 w-[120px] whitespace-nowrap font-semibold">TASK MONTH</th>
                <th className="py-3 px-2 w-[80px] text-center whitespace-nowrap font-semibold">QTY</th>
                <th className="py-3 px-2 w-[80px] text-center whitespace-nowrap font-semibold">PAGES</th>
                <th className="py-3 px-2 w-[90px] text-center whitespace-nowrap font-semibold">QTY PAGES</th>
                <th className="py-3 px-2 w-[150px] text-center whitespace-nowrap font-semibold">PAYROLL MONTH</th>
                <th className="py-3 px-2 w-[120px] text-center whitespace-nowrap font-semibold">ACTION</th>
              </tr>
            </thead>
          </table>
        </div>
      </div>

      {/* Table Body (Scrolls smoothly under sticky header group) */}
      <div className="overflow-x-auto rounded-none">
        <table className="w-full border-collapse text-left font-mono text-xs min-w-[950px] rounded-none">
          <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
            {filteredTasks.map((task) => (
              <PayrollTableRow
                key={task.id}
                task={task}
                isSelected={selectedIds.has(task.id)}
                onToggleSelect={toggleSelect}
                selectedMonth={monthSelections[task.id] || ''}
                allMonthOptions={allMonthOptions}
                onSelectMonth={(taskId, month) =>
                  setMonthSelections((prev) => ({
                    ...prev,
                    [taskId]: prev[taskId] === month ? '' : month,
                  }))
                }
                onAssign={handleAssign}
                isPending={isPending}
                isDropdownOpen={rowDropdown === task.id}
                onToggleDropdown={(taskId) => setRowDropdown(rowDropdown === taskId ? null : taskId)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
