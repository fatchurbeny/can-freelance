'use client';

import {
  Search, SlidersHorizontal, ChevronDown, Check, User, FileText, Building2, ChevronLeft, X, Loader2,
} from 'lucide-react';

export type SortKey = 'last-edited' | 'az' | 'za';
export type FilterCategory = 'designers' | 'doctypes' | 'brands';

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
  designerOptions: string[];
  doctypeOptions: string[];
  brandOptions: string[];
  selectedIdsCount: number;
  totalFilteredCount: number;
  batchMonth: string;
  setBatchMonth: (m: string) => void;
  batchOpen: boolean;
  setBatchOpen: (open: boolean) => void;
  batchRef: React.RefObject<HTMLDivElement | null>;
  allMonthOptions: string[];
  handleBatchAssign: () => void;
  isPending: boolean;
}

export default function PayrollToolbar({
  searchQuery, setSearchQuery,
  sortKey, setSortKey, sortOpen, setSortOpen, sortRef, SORT_LABELS,
  filterOpen, setFilterOpen, filterRef, activeCategory, setActiveCategory, activeFilterCount,
  designerFilter, setDesignerFilter, doctypeFilter, setDoctypeFilter, brandFilter, setBrandFilter,
  designerOptions, doctypeOptions, brandOptions,
  selectedIdsCount, totalFilteredCount,
  batchMonth, setBatchMonth, batchOpen, setBatchOpen, batchRef, allMonthOptions, handleBatchAssign, isPending,
}: PayrollToolbarProps) {
  return (
    <div className="w-full h-10 border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] flex items-stretch justify-between divide-x divide-[#f0f0f0] dark:divide-[#272a34] font-mono text-xs select-none p-0 overflow-visible">
      {/* Left Tools Group: Search + Sort + Filter */}
      <div className="flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] min-w-0">
        {/* Search Cell */}
        <div className="relative w-44 sm:w-56 flex items-center h-full">
          <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            id="approval-payroll-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full h-full pl-8 pr-3 bg-transparent text-xs font-mono text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none border-none"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="relative h-full" ref={sortRef}>
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
            <div className="absolute left-0 top-full z-50 mt-0 w-40 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl">
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
        <div className="relative h-full" ref={filterRef}>
          <button
            type="button"
            onClick={() => { setFilterOpen(!filterOpen); setActiveCategory(null); }}
            className={`h-full px-3.5 flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
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
            <div className="absolute left-0 top-full z-50 mt-0 min-w-[220px] max-h-72 overflow-y-auto rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl font-mono text-xs">
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
                      }}
                      className="text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="space-y-0.5 max-h-52 overflow-y-auto">
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
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {designerFilter && (
          <div className="flex items-center px-3.5 h-full bg-gray-100 dark:bg-[#1f222b] text-gray-900 dark:text-white text-xs font-mono font-bold gap-1.5">
            <span>Designer: {designerFilter}</span>
            <button type="button" onClick={() => setDesignerFilter('')} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        {doctypeFilter && (
          <div className="flex items-center px-3.5 h-full bg-gray-100 dark:bg-[#1f222b] text-gray-900 dark:text-white text-xs font-mono font-bold gap-1.5">
            <span>Doctype: {doctypeFilter}</span>
            <button type="button" onClick={() => setDoctypeFilter('')} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        {brandFilter && (
          <div className="flex items-center px-3.5 h-full bg-gray-100 dark:bg-[#1f222b] text-gray-900 dark:text-white text-xs font-mono font-bold gap-1.5">
            <span>Brand: {brandFilter}</span>
            <button type="button" onClick={() => setBrandFilter('')} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Right Tools Group: Count + Batch Month Picker + Assign Selected Button */}
      <div className="flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
        <div className="flex items-center px-3.5 text-xs font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap">
          <span>{selectedIdsCount} of {totalFilteredCount} selected</span>
        </div>

        {/* Batch Month Picker Cell */}
        <div className="relative h-full" ref={batchRef}>
          <button
            type="button"
            onClick={() => setBatchOpen(!batchOpen)}
            className="w-[140px] h-full flex items-center justify-between px-3.5 bg-white dark:bg-[#0d0e12] hover:bg-gray-50 dark:hover:bg-[#16181d] text-xs font-mono font-medium text-gray-700 dark:text-gray-200 focus:outline-none transition-colors cursor-pointer select-none whitespace-nowrap"
          >
            <span className="truncate">{batchMonth || 'Pilih bulan...'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
          </button>
          {batchOpen && (
            <div className="absolute right-0 top-full z-50 mt-0 w-44 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl max-h-60 overflow-y-auto font-mono text-xs">
              <div className="space-y-0.5 px-1">
                {allMonthOptions.map((month) => {
                  const isChecked = batchMonth === month;
                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => { setBatchMonth(batchMonth === month ? '' : month); setBatchOpen(false); }}
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

        {/* Assign Selected Cell */}
        <button
          type="button"
          onClick={handleBatchAssign}
          disabled={selectedIdsCount === 0 || !batchMonth || isPending}
          className="h-full px-4 bg-[#ff5e1f] hover:bg-[#ff7038] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shadow-none"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Assign Selected</span>
        </button>
      </div>
    </div>
  );
}
