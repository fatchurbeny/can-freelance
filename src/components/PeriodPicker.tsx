'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Calendar, ChevronDown } from 'lucide-react';
import MonthCalendarPicker, { normalizeDisplayMonth } from '@/components/MonthCalendarPicker';
import { parseTaskMonthToKey, INDONESIAN_FULL_MONTHS } from '@/lib/period-utils';

interface PeriodPickerProps {
  periods: string[];
  currentPeriod: string; // Comma separated periods e.g. "2026-07,2026-06"
}

function formatPeriodFull(p: string) {
  if (!p) return '';
  const key = parseTaskMonthToKey(p);
  if (!key) return p;
  const [year, month] = key.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${INDONESIAN_FULL_MONTHS[monthIdx]}-${year}`;
  }
  return p;
}

export default function PeriodPicker({ periods, currentPeriod }: PeriodPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [allSelected, setAllSelected] = useState(!currentPeriod || currentPeriod === 'all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const rawList = currentPeriod ? currentPeriod.split(',').filter(Boolean) : [];
  const isAllSelected = allSelected || !currentPeriod || currentPeriod === 'all';
  const selectedPeriods = isAllSelected ? [] : rawList;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlPeriod = searchParams.get('period');
    if (urlPeriod) {
      if (urlPeriod === 'all') {
        localStorage.setItem('can_freelance_active_period', 'all');
        setAllSelected(true);
      } else {
        localStorage.setItem('can_freelance_active_period', urlPeriod);
        setAllSelected(false);
      }
    } else {
      const saved = localStorage.getItem('can_freelance_active_period');
      if (saved && saved !== 'all' && saved.trim()) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('period', saved);
        router.replace(`${pathname}?${params.toString()}`);
        setAllSelected(false);
      }
    }
  }, [pathname, router, searchParams]);

  const pushPeriod = (period: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (period) params.set('period', period);
    else params.delete('period');
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  const handleSelectAll = () => {
    if (typeof window !== 'undefined') localStorage.setItem('can_freelance_active_period', 'all');
    setAllSelected(true);
    pushPeriod(null);
  };

  const handleSelectCurrentMonth = () => {
    const currentKey = new Date().toISOString().substring(0, 7);
    const target = periods.includes(currentKey) ? currentKey : (periods[0] || currentKey);
    if (typeof window !== 'undefined') localStorage.setItem('can_freelance_active_period', target);
    setAllSelected(false);
    pushPeriod(target);
  };

  const handleMonthChange = (monthStrs: string) => {
    if (!monthStrs) {
      handleSelectAll();
      return;
    }
    if (typeof window !== 'undefined') localStorage.setItem('can_freelance_active_period', monthStrs);
    setAllSelected(false);
    pushPeriod(monthStrs);
  };

  const getButtonLabel = () => {
    if (isAllSelected || selectedPeriods.length === 0) return 'Semua Bulan';
    if (selectedPeriods.length === 1) return formatPeriodFull(selectedPeriods[0]);
    if (selectedPeriods.length > 2) return `${selectedPeriods.length} Bulan`;
    return selectedPeriods.map(formatPeriodFull).join(', ');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative pl-9 pr-8 py-2 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-xs font-sans font-medium text-gray-900 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700 focus:outline-none transition-colors shadow-none cursor-pointer flex items-center gap-1.5 select-none"
      >
        <Calendar className="absolute left-3 w-3.5 h-3.5 text-[#ff5e1f]" />
        <span className="truncate max-w-[200px]">{getButtonLabel()}</span>
        <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 z-50 w-56 sm:w-60 min-w-[220px]">
          <MonthCalendarPicker
            inline={true}
            rangeSelect={true}
            selectedValues={selectedPeriods}
            availableMonths={periods}
            mode="filter"
            onChange={handleMonthChange}
            placeholder={getButtonLabel()}
          />
        </div>
      )}
    </div>
  );
}
