'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Calendar, Check, ChevronDown } from 'lucide-react';

interface PeriodPickerProps {
  periods: string[];
  currentPeriod: string; // Comma separated periods e.g. "2026-07,2026-06"
}

export default function PeriodPicker({ periods, currentPeriod }: PeriodPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // When currentPeriod is 'all', empty, or all periods are present, treat as all selected
  const rawList = currentPeriod ? currentPeriod.split(',').filter(Boolean) : [];
  const isAllSelected = !currentPeriod || currentPeriod === 'all' || (periods.length > 0 && rawList.length >= periods.length);
  const selectedPeriods = isAllSelected ? periods : rawList;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format YYYY-MM to indonesian label e.g. "Mei-2026"
  const formatPeriod = (p: string) => {
    if (!p) return '';
    const parts = p.split('-');
    if (parts.length !== 2) return p;
    const [year, month] = parts;
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum)) return p;
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    const mName = monthNames[monthNum - 1] || month;
    return `${mName}-${year}`;
  };

  // Auto-restore period from localStorage when moving between pages without URL param
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlPeriod = searchParams.get('period');

    if (urlPeriod) {
      if (urlPeriod === 'all' || (periods.length > 0 && urlPeriod.split(',').length >= periods.length)) {
        localStorage.setItem('can_freelance_active_period', 'all');
      } else {
        localStorage.setItem('can_freelance_active_period', urlPeriod);
      }
    } else {
      // URL has no ?period parameter (e.g. freshly navigated to a new page)
      const saved = localStorage.getItem('can_freelance_active_period');
      if (saved && saved !== 'all' && saved.trim()) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('period', saved);
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  }, [pathname, router, searchParams, periods.length]);

  // Quick Action: Select All (clean URL)
  const handleSelectAll = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('can_freelance_active_period', 'all');
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('period'); // Clean URL without ?period=
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);
  };

  // Quick Action: Select Current Month (short clean URL)
  const handleSelectCurrentMonth = () => {
    const currentKey = new Date().toISOString().substring(0, 7);
    const target = periods.includes(currentKey) ? currentKey : (periods[0] || currentKey);
    if (typeof window !== 'undefined') {
      localStorage.setItem('can_freelance_active_period', target);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', target);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Toggle single selection
  const handleToggle = (period: string) => {
    let updated: string[];
    if (isAllSelected) {
      // Unchecking one from all
      updated = periods.filter((p) => p !== period);
    } else if (selectedPeriods.includes(period)) {
      // Keep at least one selected
      if (selectedPeriods.length <= 1) return;
      updated = selectedPeriods.filter((p) => p !== period);
    } else {
      updated = [...selectedPeriods, period];
    }

    // If all periods are now selected, clean the URL
    if (updated.length >= periods.length) {
      handleSelectAll();
      return;
    }

    // Sort to keep chronological order
    updated.sort((a, b) => b.localeCompare(a));
    const nextPeriodStr = updated.join(',');

    if (typeof window !== 'undefined') {
      localStorage.setItem('can_freelance_active_period', nextPeriodStr);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('period', nextPeriodStr);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Get display text for the main picker button
  const getButtonLabel = () => {
    if (isAllSelected) return 'Semua Bulan';
    if (selectedPeriods.length === 1) return formatPeriod(selectedPeriods[0]);
    if (selectedPeriods.length > 2) return `${selectedPeriods.length} Bulan`;
    return selectedPeriods.map(formatPeriod).join(', ');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button (Cloudflare Style) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative pl-9 pr-8 py-2 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-xs font-sans font-medium text-gray-900 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700 focus:outline-none transition-colors shadow-none cursor-pointer flex items-center gap-1.5 select-none"
      >
        <Calendar className="absolute left-3 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <span>{getButtonLabel()}</span>
        <div className="absolute right-3 w-2 h-2 border-r-2 border-b-2 border-gray-400 dark:border-gray-500 transform rotate-45 pointer-events-none mt-[-2px]" />
      </button>

      {/* Checkbox Dropdown Overlay (Cloudflare Style) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl z-50 py-2.5 max-h-80 overflow-y-auto font-sans text-xs">
          {/* Header with Quick Action Buttons */}
          <div className="px-3 pb-2 mb-1.5 border-b border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between">
            <span className="text-[10px] font-sans font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              PERIODE BULAN
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  isAllSelected
                    ? 'bg-[#ff5e1f]/10 border-[#ff5e1f]/30 text-[#ff5e1f] font-bold'
                    : 'bg-gray-100 dark:bg-[#20232b] border-gray-200 dark:border-[#272a34] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#272a34]'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={handleSelectCurrentMonth}
                className="text-[10px] font-sans font-medium px-2 py-0.5 rounded border border-gray-200 dark:border-[#272a34] bg-gray-100 dark:bg-[#20232b] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#272a34] transition-colors cursor-pointer"
              >
                Bulan Ini
              </button>
            </div>
          </div>

          {/* Month Checkbox List */}
          <div className="space-y-0.5 px-1.5">
            {periods.map((p) => {
              const isChecked = selectedPeriods.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleToggle(p)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-sans transition-colors cursor-pointer ${
                    isChecked
                      ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] dark:hover:text-white'
                  }`}
                >
                  <span className="dark:text-gray-200">{formatPeriod(p)}</span>
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
  );
}
