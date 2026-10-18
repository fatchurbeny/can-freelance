'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import SortControl, { SortKey } from './SortControl';

export type DoctypeFilters = Record<string, string[]>;

export const EMPTY_DOCTYPE_FILTERS: DoctypeFilters = {};

export interface FilterGroup {
  key: string;
  label: string;
  options: string[];
}

export const DOCTYPE_SORT_OPTIONS = [
  { value: 'lastEdited', label: 'Last Edited' },
  { value: 'nameAsc', label: 'A-Z' },
  { value: 'nameDesc', label: 'Z-A' },
] as const;

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  filters: DoctypeFilters;
  onFiltersChange: (f: DoctypeFilters) => void;
  groups: FilterGroup[];
  total: number;
  placeholder?: string;
  totalLabel?: string;
  /** CTA tab ini, tampil rata kanan setinggi toolbar. */
  action?: React.ReactNode;
}

export default function DoctypeToolbar({ query, onQueryChange, sortKey, onSortChange, filters, onFiltersChange, groups, total, action, placeholder = 'Search doctype...', totalLabel = 'Doctype' }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (searchOpen) inputRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selectedCount = groups.reduce((n, g) => n + (filters[g.key]?.length ?? 0), 0);

  const toggle = (key: string, v: string) => {
    const cur = filters[key] ?? [];
    onFiltersChange({ ...filters, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  return (
    <div className="w-full h-11 flex items-stretch justify-between bg-white dark:bg-[#0d0e12] select-none text-xs relative z-30">
      <div className="flex items-stretch min-w-0 overflow-visible flex-1">
        {!searchOpen ? (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="h-full px-3 sm:px-3.5 border-r border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center text-gray-500 hover:text-[#ff5e1f] hover:bg-gray-50 dark:hover:bg-[#16181d] transition-colors cursor-pointer outline-none shrink-0"
            title="Search doctype..."
            aria-label="Open search input"
          >
            <Search className="w-4 h-4" />
            {query && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-[#ff5e1f]" />}
          </button>
        ) : (
          <div className="relative w-44 sm:w-60 flex items-center h-full px-3 border-r border-[#f0f0f0] dark:border-[#272a34] gap-2 shrink-0">
            <Search className="w-4 h-4 text-[#ff5e1f] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false); }}
              placeholder={placeholder}
              aria-label="Search doctype"
              className="w-full h-full bg-transparent text-xs font-sans text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none border-none min-w-0"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')} className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
            )}
            <button type="button" onClick={() => setSearchOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0 cursor-pointer" aria-label="Close search">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <SortControl value={sortKey} onChange={onSortChange} options={DOCTYPE_SORT_OPTIONS} />

        <div className="relative h-full flex items-stretch shrink-0" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={filterOpen}
            className={`h-full px-2.5 sm:px-3.5 flex items-center gap-1 sm:gap-1.5 text-xs font-sans border-r border-[#f0f0f0] dark:border-[#272a34] transition-colors cursor-pointer whitespace-nowrap ${
              selectedCount > 0
                ? 'bg-gray-100 dark:bg-[#1f222b] text-gray-900 dark:text-white font-bold'
                : 'bg-white dark:bg-[#0d0e12] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#16181d]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
            {selectedCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-[4px] bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold">{selectedCount}</span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className="absolute left-0 top-full z-50 mt-0 min-w-[220px] max-h-80 overflow-y-auto rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-2xl font-sans text-xs">
              {groups.map((g, gi) => (
                <div key={g.key}>
                  {gi > 0 && <div className="my-1 border-t border-[#f0f0f0] dark:border-[#272a34]" />}
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{g.label}</div>
                  {g.options.map((opt) => {
                    const checked = (filters[g.key] ?? []).includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="option"
                        aria-selected={checked}
                        onClick={() => toggle(g.key, opt)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] cursor-pointer"
                      >
                        <span className="truncate">{opt}</span>
                        <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 ml-2 ${
                          checked
                            ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                            : 'border-gray-300 dark:border-[#343846] bg-white dark:bg-[#16181d]'
                        }`}>
                          {checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => onFiltersChange(EMPTY_DOCTYPE_FILTERS)}
                  className="mt-1 w-full border-t border-[#f0f0f0] dark:border-[#272a34] px-2.5 py-1.5 text-left font-bold text-[#ff5e1f] hover:bg-[#ff5e1f]/10 cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <span className="self-center px-3.5 text-xs font-sans text-gray-400 dark:text-gray-500 whitespace-nowrap">{total} {totalLabel}</span>
      {action}
    </div>
  );
}
