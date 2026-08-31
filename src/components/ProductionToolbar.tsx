'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Search, ChevronDown, SlidersHorizontal, Plus, X, ChevronLeft, Check,
  User, FileText, Building2, Languages, Flag, Calendar,
} from 'lucide-react';
import SortControl, { SortKey } from './SortControl';
import { BoardFilters, EMPTY_FILTERS, FilterFacets } from './board-filters';

interface Props {
  facets: FilterFacets;
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
  query: string;
  onQueryChange: (query: string) => void;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
}

interface Group {
  key: keyof BoardFilters;
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string; color?: string | null }[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  designers: <User className="size-4" />,
  doctypes: <FileText className="size-4" />,
  brands: <Building2 className="size-4" />,
  languages: <Languages className="size-4" />,
  priorities: <Flag className="size-4" />,
};

function optionColor(groupKey: keyof BoardFilters, opt: { color?: string | null }): string | undefined {
  return groupKey === 'designers' || groupKey === 'brands' ? opt.color ?? undefined : undefined;
}

export default function ProductionToolbar({
  facets,
  filters,
  onFiltersChange,
  query,
  onQueryChange,
  sortKey,
  onSortChange,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<keyof BoardFilters | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
        setActiveGroup(null);
      }
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) {
        setMonthOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const groups: Group[] = [
    { key: 'designers', label: 'Designer', icon: CATEGORY_ICONS.designers, options: facets.designers.map((d) => ({ value: d.id, label: d.label, color: d.color })) },
    { key: 'doctypes', label: 'Doctype', icon: CATEGORY_ICONS.doctypes, options: facets.doctypes.map((d) => ({ value: d.id, label: d.label })) },
    { key: 'brands', label: 'Brand', icon: CATEGORY_ICONS.brands, options: facets.brands.map((b) => ({ value: b.id, label: b.label, color: b.color })) },
    { key: 'languages', label: 'Language', icon: CATEGORY_ICONS.languages, options: facets.languages.map((l) => ({ value: l, label: l })) },
    { key: 'priorities', label: 'Priority', icon: CATEGORY_ICONS.priorities, options: facets.priorities.map((p) => ({ value: p, label: p })) },
  ];

  const groupMap = Object.fromEntries(groups.map((g) => [g.key, g])) as Record<keyof BoardFilters, Group>;

  const toggleMonth = (month: string) => {
    const current = filters.taskMonths;
    const next = current.includes(month) ? current.filter((m) => m !== month) : [...current, month];
    onFiltersChange({ ...filters, taskMonths: next });
  };

  const clearMonths = () => {
    onFiltersChange({ ...filters, taskMonths: [] });
  };

  const monthLabel =
    filters.taskMonths.length === 0
      ? 'Semua Bulan'
      : filters.taskMonths.length === 1
        ? filters.taskMonths[0]
        : `${filters.taskMonths.length} Bulan`;

  /** Multi-select toggle: adds/removes value; panel stays open until closed explicitly. */
  const toggleValue = (group: keyof BoardFilters, value: string) => {
    const current = filters[group];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFiltersChange({ ...filters, [group]: next });
  };

  const clearGroup = (group: keyof BoardFilters) => {
    onFiltersChange({ ...filters, [group]: [] });
  };

  const selectedCount = groups.reduce((n, g) => n + filters[g.key].length, 0);
  const hasFilters = selectedCount > 0;

  return (
    <div className="w-full h-10 flex items-stretch justify-between border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] select-none text-xs shrink-0">
      {/* Left side: SortControl + Filter Button + Active Filter Chips */}
      <div className="flex items-stretch">
        <SortControl value={sortKey} onChange={onSortChange} />

        {/* Filter Dropdown Button */}
        <div className="relative h-full flex items-stretch" ref={filterRef}>
          <button
            type="button"
            onClick={() => { setFilterOpen((o) => !o); setActiveGroup(null); }}
            aria-haspopup="dialog"
            aria-expanded={filterOpen}
            className={`h-full px-3.5 flex items-center gap-1.5 text-xs font-mono border-r border-[#f0f0f0] dark:border-[#272a34] transition-colors cursor-pointer whitespace-nowrap ${
              hasFilters
                ? 'bg-gray-100 dark:bg-[#1f222b] text-gray-900 dark:text-white font-bold'
                : 'bg-white dark:bg-[#0d0e12] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#16181d]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
            {hasFilters && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-[4px] bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold">
                {selectedCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Filter Popover Dropdown */}
          {filterOpen && (
            <div className="absolute left-0 top-full z-50 mt-0 min-w-[220px] overflow-hidden rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl font-mono text-xs">
              {!activeGroup ? (
                /* Stage 1: Category List */
                groups.map((g) => {
                  const selectedIn = filters[g.key].length > 0;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setActiveGroup(g.key)}
                      className={`flex w-full items-center justify-between gap-2 rounded-none px-2.5 py-1.5 text-left text-xs font-mono font-medium transition-colors cursor-pointer ${
                        selectedIn
                          ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#20232b]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="grid size-4 place-items-center">{g.icon}</span>
                        <span>{g.label}</span>
                      </span>
                      {selectedIn && (
                        <span className="px-1.5 py-0.5 rounded-[4px] bg-black dark:bg-white text-white dark:text-black font-bold text-[10px]">
                          {filters[g.key].length}
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                /* Stage 2: Drill-down Multi-select */
                (() => {
                  const active = groupMap[activeGroup];
                  return (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#272a34] pb-1.5 mb-1.5 px-1">
                        <div className="flex items-center gap-1 text-xs font-mono">
                          <button type="button" onClick={() => setActiveGroup(null)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-0.5 cursor-pointer">
                            <ChevronLeft className="size-3.5" /> Back
                          </button>
                        </div>
                        <button type="button" onClick={() => clearGroup(active.key)} className="text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer">
                          Reset
                        </button>
                      </div>
                      <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
                        {active.options.map((opt) => {
                          const on = filters[active.key].includes(opt.value);
                          const dotColor = optionColor(active.key, opt);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => toggleValue(active.key, opt.value)}
                              className={`flex w-full items-center justify-between gap-2 rounded-none px-2.5 py-1.5 text-left text-xs font-mono transition-colors cursor-pointer ${
                                on ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                {dotColor && (
                                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                                )}
                                <span className="truncate">{opt.label}</span>
                              </span>
                              <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ${
                                on
                                  ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                                  : 'border-gray-300 dark:border-[#343846] bg-white dark:bg-[#16181d]'
                              }`}>
                                {on && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>

        {/* Active Filter Chips as Flat Table Cells */}
        {hasFilters && (
          <div className="flex items-stretch">
            {Object.keys(filters).map((k) => {
              const key = k as keyof BoardFilters;
              if (!filters[key].length || key === 'taskMonths') return null;
              const g = groupMap[key];
              if (!g) return null;
              return (
                <div
                  key={g.key}
                  className="h-full px-4 border-r border-[#f0f0f0] dark:border-[#272a34] flex items-center gap-2 text-xs font-mono font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-[#16181d]/50"
                >
                  <span>{g.label}: {filters[g.key].length}</span>
                  <button
                    type="button"
                    onClick={() => clearGroup(g.key)}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[#ff5e1f] transition-colors cursor-pointer"
                    aria-label={`Clear ${g.label} filter`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right side: Integrated Search Input */}
      <div className="flex items-stretch">
        <div className="relative h-full flex items-center border-l border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] px-3">
          <Search className="pointer-events-none w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search"
            aria-label="Search tasks"
            className="w-[140px] sm:w-[180px] bg-transparent pl-2 pr-6 py-1 text-xs font-mono text-gray-700 dark:text-gray-200 outline-none placeholder:text-gray-400"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange('')}
              className="absolute right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
