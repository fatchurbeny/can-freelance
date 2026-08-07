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
    <div className="flex min-w-0 flex-col items-stretch gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: month + sort + applied-filter pills + filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" ref={monthRef}>
            <button
              type="button"
              onClick={() => setMonthOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={monthOpen}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
                filters.taskMonths.length > 0
                  ? 'border-[#615FFF] bg-[#615FFF]/10 text-[#615FFF] dark:bg-[#615FFF]/15'
                  : 'border-[#E8E0D8] text-gray-600 hover:bg-black/[0.03] dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5'
              }`}
            >
              <Calendar className="size-4" />
              <span className="whitespace-nowrap">{monthLabel}</span>
              <ChevronDown className={`size-4 transition-transform ${monthOpen ? 'rotate-180' : ''}`} />
            </button>

            {monthOpen && (
              <div className="absolute left-0 z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-[10px] border border-[#E8E0D8] bg-white p-1 shadow-xl dark:border-gray-800 dark:bg-[#111827]">
                <div className="flex flex-col gap-[2px]">
                  {facets.months.map((month) => {
                    const on = filters.taskMonths.includes(month);
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => toggleMonth(month)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-[6px] text-left text-[12px] font-medium transition-colors ${
                          on ? 'bg-[#615FFF]/10 text-[#615FFF] dark:bg-[#615FFF]/15' : 'text-gray-600 hover:bg-black/[0.03] hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white'
                        }`}
                      >
                        <span className={`grid size-4 place-items-center rounded border ${on ? 'border-[#615FFF] bg-[#615FFF]' : 'border-[#6b7280]'}`}>
                          {on && <Check className="size-3 text-white" />}
                        </span>
                        <span className="whitespace-nowrap">{month}</span>
                      </button>
                    );
                  })}
                  {facets.months.length === 0 && (
                    <span className="px-2 py-[6px] text-[12px] text-gray-500 dark:text-[#6b7280]">
                      No months available
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <SortControl value={sortKey} onChange={onSortChange} />

          {groups
            .filter((g) => filters[g.key].length > 0)
            .map((g) => {
              const labels = filters[g.key]
                .map((value) => g.options.find((o) => o.value === value)?.label)
                .filter(Boolean)
                .join(', ');
              return (
                <span
                  key={g.key}
                  title={`${g.label}: ${labels}`}
                  className="inline-flex max-w-[240px] items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-white px-[12px] py-[8px] text-[12px] font-medium text-gray-900 hover:bg-black/[0.03] dark:border-[#262936] dark:bg-[#0A0B0E] dark:text-white dark:hover:bg-white/[0.04]"
                >
                  <span className="grid size-4 shrink-0 place-items-center">{g.icon}</span>
                  <span className="truncate">
                    {g.label}: {labels}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${g.label} filter`}
                    onClick={() => clearGroup(g.key)}
                    className="flex size-4 shrink-0 items-center justify-center rounded text-white/80 hover:text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              );
            })}

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => { setFilterOpen((o) => !o); setActiveGroup(null); }}
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
                hasFilters
                  ? 'border-[#615FFF] bg-[#615FFF]/10 text-[#615FFF] dark:bg-[#615FFF]/15'
                  : 'border-[#E8E0D8] text-gray-600 hover:bg-black/[0.03] dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5'
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              Filter
              {hasFilters && (
                <span className="grid size-4 place-items-center rounded-full bg-[#615FFF] text-[10px] font-semibold text-white">
                  {selectedCount}
                </span>
              )}
              <ChevronDown className={`size-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>

            {filterOpen && (
              <div className="absolute left-0 z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-[10px] border border-[#E8E0D8] bg-white p-1 shadow-xl dark:border-[#262936] dark:bg-[#111827]">
                {!activeGroup ? (
                  /* Stage 1: category list */
                  groups.map((g) => {
                    const selectedIn = filters[g.key].length > 0;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setActiveGroup(g.key)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-[6px] text-left text-[12px] font-medium transition-colors ${
                          selectedIn
                            ? 'bg-gray-100 capitalize text-gray-900 dark:bg-[#12141a] dark:text-white'
                            : 'capitalize text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-[#6b7280] dark:hover:bg-[#12141a] dark:hover:text-white'
                        }`}
                      >
                        <span className="grid size-4 place-items-center">{g.icon}</span>
                        {g.label}
                      </button>
                    );
                  })
                ) : (
                  /* Stage 2: drill-down multi-select */
                  (() => {
                    const active = groupMap[activeGroup];
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between px-2 py-1">
                          <div className="flex items-center gap-1 text-[12px]">
                            <button type="button" onClick={() => setActiveGroup(null)} className="text-gray-500 hover:text-gray-900 dark:text-[#6b7280] dark:hover:text-white">
                              <ChevronLeft className="size-4" />
                            </button>
                            <span className="capitalize text-gray-500 dark:text-[#6b7280]">{active.label}</span>
                            <span className="font-medium text-gray-900 dark:text-white">is</span>
                            <ChevronDown className="size-4 text-gray-500 dark:text-[#6b7280]" />
                          </div>
                          <button type="button" onClick={() => clearGroup(active.key)} className="text-gray-500 hover:text-gray-900 dark:text-[#6b7280] dark:hover:text-white" aria-label="Clear all">
                            <X className="size-4" />
                          </button>
                        </div>
                        <div className="border-t border-[#E8E0D8] dark:border-[#262936]" />
                        <div className="flex flex-col gap-[2px] p-1">
                          {active.options.map((opt) => {
                            const on = filters[active.key].includes(opt.value);
                            const dotColor = optionColor(active.key, opt);
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => toggleValue(active.key, opt.value)}
                                className={`flex w-full items-center gap-2 rounded px-2 py-[6px] text-left text-[12px] font-medium transition-colors ${
                                  on ? 'bg-gray-100 text-gray-900 dark:bg-[#0a0b0e] dark:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-[#6b7280] dark:hover:bg-[#12141a] dark:hover:text-white'
                                }`}
                              >
                                <span className={`grid size-4 place-items-center rounded border ${on ? 'border-[#615FFF] bg-[#615FFF]' : 'border-[#6b7280]'}`}>
                                  {on && <Check className="size-3 text-white" />}
                                </span>
                                {dotColor && (
                                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                                )}
                                <span className="whitespace-nowrap">{opt.label}</span>
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
        </div>

        {/* Right: search + new task */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400 dark:text-white/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search"
              aria-label="Search tasks"
              className="w-[180px] rounded-full border border-[#E8E0D8] bg-white py-1.5 pl-8 pr-8 text-[13px] text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-[#615FFF] dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-200 dark:placeholder:text-white/40"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onQueryChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#615FFF] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[#5151e6]"
          >
            <Plus className="size-4" />
            Add New Task
          </button>
        </div>
      </div>
    </div>
  );
}
