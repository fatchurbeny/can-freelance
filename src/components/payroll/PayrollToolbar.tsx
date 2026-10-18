'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Search, SlidersHorizontal, ChevronDown, Check, User, FileText, Building2, Calendar, ChevronLeft, X, Loader2,
} from 'lucide-react';
import MonthCalendarPicker from '../MonthCalendarPicker';

export type SortKey = 'last-edited' | 'az' | 'za';
export type FilterCategory = 'designers' | 'doctypes' | 'brands' | 'taskMonths';

interface PayrollToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  sortOpen: boolean;
  setSortOpen: (open: boolean) => void;
  sortRef: React.RefObject<HTMLDivElement | null>;
  SORT_LABELS: Record<SortKey, { label: string; icon: React.ReactNode }>;
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  filterRef: React.RefObject<HTMLDivElement | null>;
  activeCategory: FilterCategory | null;
  setActiveCategory: (cat: FilterCategory | null) => void;
  activeFilterCount: number;
  designerFilter: string;
  setDesignerFilter: (v: string) => void;
  doctypeFilter: string;
  setDoctypeFilter: (v: string) => void;
  brandFilter: string;
  setBrandFilter: (v: string) => void;
  taskMonthFilter: string;
  setTaskMonthFilter: (v: string) => void;
  designerOptions: string[];
  doctypeOptions: string[];
  brandOptions: string[];
  taskMonthOptions: string[];
  selectedIdsCount: number;
  totalFilteredCount: number;
  batchMonth: string;
  setBatchMonth: (m: string) => void;
  batchOpen?: boolean;
  setBatchOpen?: (open: boolean) => void;
  batchRef?: React.RefObject<HTMLDivElement | null>;
  allMonthOptions: string[];
  handleBatchAssign: () => void;
  isPending: boolean;
}

export default function PayrollToolbar({
  searchQuery, setSearchQuery,
  sortKey, setSortKey, sortOpen, setSortOpen, sortRef, SORT_LABELS,
  filterOpen, setFilterOpen, filterRef, activeCategory, setActiveCategory, activeFilterCount,
  designerFilter, setDesignerFilter, doctypeFilter, setDoctypeFilter, brandFilter, setBrandFilter,
  taskMonthFilter, setTaskMonthFilter,
  designerOptions, doctypeOptions, brandOptions, taskMonthOptions,
  selectedIdsCount, totalFilteredCount,
  batchMonth, setBatchMonth, batchOpen, setBatchOpen, batchRef, allMonthOptions, handleBatchAssign, isPending,
}: PayrollToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);
  return (
    <div className="w-full flex flex-col divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12] font-sans text-xs select-none p-0 relative z-50 overflow-visible">
      {/* ROW 2: Search, Sort, Filter */}
      <div className="w-full h-11 flex items-stretch justify-between divide-x divide-[#f0f0f0] dark:divide-[#272a34] min-w-0 relative z-50 overflow-visible">
        {/* Left Tools Group: Search + Sort + Filter (STRICTLY OVERFLOW-VISIBLE) */}
        <div className="flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] shrink-0 overflow-visible">
          {/* Search Cell: Mobile-Responsive Expandable */}
          {!searchOpen ? (
            /* Collapsed: Icon Search Only */
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="h-full px-3.5 flex items-center justify-center gap-1.5 text-gray-500 hover:text-[#ff5e1f] hover:bg-gray-50 dark:hover:bg-[#16181d] transition-colors cursor-pointer outline-none shrink-0"
              title="Search tasks..."
              aria-label="Open search input"
            >
              <Search className="w-4 h-4" />
              {searchQuery && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e1f]" />
              )}
            </button>
          ) : (
            /* Expanded: Search input with autofocus & close button */
            <div className="relative w-44 sm:w-60 flex items-center h-full px-3 bg-white dark:bg-[#0d0e12] gap-2 shrink-0 animate-[fadeIn_120ms_ease-in]">
              <Search className="w-4 h-4 text-[#ff5e1f] shrink-0" />
              <input
                ref={searchInputRef}
                id="approval-payroll-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
                placeholder="Search tasks..."
                className="w-full h-full bg-transparent text-xs font-sans text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none border-none min-w-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1"
                  title="Clear text"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs shrink-0 cursor-pointer"
                title="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

        {/* Sort Dropdown */}
        <div className={`relative h-full ${sortOpen ? 'z-60' : 'z-40'}`} ref={sortRef}>
          <button
            type="button"
            onClick={() => setSortOpen(!sortOpen)}
            className="h-full px-3.5 bg-white dark:bg-[#0d0e12] hover:bg-gray-50 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            {SORT_LABELS[sortKey].icon}
            <span className="font-medium text-xs">{SORT_LABELS[sortKey].label}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <div className="absolute left-0 top-full z-60 mt-0 w-40 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-2xl">
              {(['last-edited', 'az', 'za'] as SortKey[]).map((key) => {
                const isChecked = sortKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setSortKey(key); setSortOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left text-xs transition-colors cursor-pointer ${
                      isChecked
                        ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                    }`}
                  >
                    <span>{SORT_LABELS[key].label}</span>
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
          )}
        </div>

        {/* Filter Popover */}
        <div className={`relative h-full ${filterOpen ? 'z-60' : 'z-40'}`} ref={filterRef}>
          <button
            type="button"
            onClick={() => { setFilterOpen(!filterOpen); setActiveCategory(null); }}
            className={`h-full px-3.5 flex items-center gap-1.5 text-xs font-sans transition-colors cursor-pointer whitespace-nowrap ${
              activeFilterCount > 0
                ? 'bg-gray-100 dark:bg-[#1f222b] text-gray-900 dark:text-white font-bold'
                : 'bg-white dark:bg-[#0d0e12] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#16181d]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-[4px] bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className={`absolute left-0 sm:left-0 z-60 mt-0 ${
              !activeCategory 
                ? 'w-40' 
                : activeCategory === 'taskMonths' 
                  ? 'w-56 sm:w-60' 
                  : 'w-48 sm:w-52'
            } max-w-[calc(100vw-32px)] max-h-72 overflow-y-auto rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-2xl font-sans text-xs`}>
              {!activeCategory ? (
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('designers')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#20232b] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" /> Designer
                    </span>
                    {designerFilter && (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-black dark:bg-white text-white dark:text-black font-bold text-[10px]">1</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory('doctypes')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#20232b] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" /> Doctype
                    </span>
                    {doctypeFilter && (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-black dark:bg-white text-white dark:text-black font-bold text-[10px]">1</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory('brands')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#20232b] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" /> Brand
                    </span>
                    {brandFilter && (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-black dark:bg-white text-white dark:text-black font-bold text-[10px]">1</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory('taskMonths')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#20232b] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" /> Task Month
                    </span>
                    {taskMonthFilter && (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-black dark:bg-white text-white dark:text-black font-bold text-[10px]">1</span>
                    )}
                  </button>
                </div>
              ) : (
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
                        if (activeCategory === 'taskMonths') setTaskMonthFilter('');
                      }}
                      className="text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="space-y-0.5 max-h-64 overflow-y-auto">
                    {activeCategory === 'designers' && designerOptions.map((opt) => {
                      const isChecked = designerFilter === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setDesignerFilter(isChecked ? '' : opt)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                          }`}
                        >
                          <span className="truncate">{opt}</span>
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

                    {activeCategory === 'doctypes' && doctypeOptions.map((opt) => {
                      const isChecked = doctypeFilter === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setDoctypeFilter(isChecked ? '' : opt)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                          }`}
                        >
                          <span className="truncate">{opt}</span>
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

                    {activeCategory === 'brands' && brandOptions.map((opt) => {
                      const isChecked = brandFilter === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setBrandFilter(isChecked ? '' : opt)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                          }`}
                        >
                          <span className="truncate">{opt}</span>
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

                    {activeCategory === 'taskMonths' && (
                      <div className="w-full">
                        <MonthCalendarPicker
                          inline
                          value={taskMonthFilter}
                          availableMonths={taskMonthOptions}
                          mode="filter"
                          onChange={(m) => {
                            setTaskMonthFilter(m === 'all' ? '' : m);
                            setFilterOpen(false);
                            setActiveCategory(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Active Filter Chips (Scrollable without clipping dropdowns) */}
        {(designerFilter || doctypeFilter || brandFilter || taskMonthFilter) && (
          <div className="flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] overflow-x-auto [&::-webkit-scrollbar]:hidden min-w-0">
            {designerFilter && (
              <div className="flex items-center px-3.5 h-full bg-gray-100 dark:bg-[#1f222b] text-gray-900 dark:text-white text-xs font-sans font-bold gap-1.5 shrink-0 whitespace-nowrap">
                <span>Designer: {designerFilter}</span>
                <button type="button" onClick={() => setDesignerFilter('')} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {doctypeFilter && (
              <div className="flex items-center px-3.5 h-full bg-gray-100 dark:bg-[#1f222b] text-gray-900 dark:text-white text-xs font-sans font-bold gap-1.5 shrink-0 whitespace-nowrap">
                <span>Doctype: {doctypeFilter}</span>
                <button type="button" onClick={() => setDoctypeFilter('')} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {brandFilter && (
              <div className="flex items-center px-3.5 h-full bg-gray-100 dark:bg-[#1f222b] text-gray-900 dark:text-white text-xs font-sans font-bold gap-1.5 shrink-0 whitespace-nowrap">
                <span>Brand: {brandFilter}</span>
                <button type="button" onClick={() => setBrandFilter('')} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {taskMonthFilter && (
              <div className="flex items-center px-3.5 h-full bg-gray-100 dark:bg-[#1f222b] text-gray-900 dark:text-white text-xs font-sans font-bold gap-1.5 shrink-0 whitespace-nowrap">
                <span>Task Month: {taskMonthFilter}</span>
                <button type="button" onClick={() => setTaskMonthFilter('')} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Right side of Row 2: Total Tasks overview */}
        <div className="hidden sm:flex items-center px-4 text-xs font-sans text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0">
          <span>Total <strong className="text-gray-800 dark:text-gray-200 font-bold">{totalFilteredCount}</strong> Tasks</span>
        </div>
      </div>

      {/* ROW 3: Total Data Viewes (0 of 7 selected), Date Picker & CTA Assign Selected */}
      <div className="w-full h-11 flex items-stretch justify-between divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12] relative z-20 overflow-visible">
        {/* Left: Total data / selected count */}
        <div className="flex items-center px-4 text-xs font-sans text-gray-700 dark:text-gray-300 min-w-0">
          <span className={selectedIdsCount > 0 ? "font-bold text-[#ff5e1f]" : "text-gray-500 dark:text-gray-400"}>
            {selectedIdsCount} of {totalFilteredCount} selected
          </span>
        </div>

        {/* Right: Date Picker & Assign Selected Button */}
        <div className="flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] shrink-0">
          {/* Batch Month Picker Cell */}
          <div className="w-[140px] sm:w-[160px] h-full align-stretch">
            <MonthCalendarPicker
              align="right"
              value={batchMonth}
              placeholder="Pilih Bulan..."
              availableMonths={allMonthOptions}
              mode="payroll"
              onChange={(m) => setBatchMonth(m)}
            />
          </div>

          {/* Assign Selected Cell */}
          <button
            type="button"
            onClick={handleBatchAssign}
            disabled={selectedIdsCount === 0 || !batchMonth || isPending}
            className="h-full px-4 bg-[#ff5e1f] hover:bg-[#ff7038] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shadow-none"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Assign Selected</span>
          </button>
        </div>
      </div>
    </div>
  );
}
