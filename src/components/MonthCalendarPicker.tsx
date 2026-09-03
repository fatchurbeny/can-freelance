'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import {
  INDONESIAN_FULL_MONTHS,
  INDONESIAN_SHORT_MONTHS,
  currentTaskMonth,
  parseTaskMonthToKey,
  formatDateStringToTaskMonth,
} from '@/lib/period-utils';

interface Props {
  value?: string | null;
  onChange: (monthStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MonthCalendarPicker({
  value,
  onChange,
  placeholder = 'Pilih Bulan...',
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  const parsedKey = parseTaskMonthToKey(value); // e.g. "2026-08"
  let initialYear = currentYear;
  let selectedMonthIdx: number | null = null;

  if (parsedKey) {
    const [yStr, mStr] = parsedKey.split('-');
    const parsedYear = parseInt(yStr, 10);
    const parsedM = parseInt(mStr, 10) - 1;
    if (!isNaN(parsedYear)) initialYear = parsedYear;
    if (!isNaN(parsedM) && parsedM >= 0 && parsedM < 12) selectedMonthIdx = parsedM;
  }

  const [viewYear, setViewYear] = useState(initialYear);

  useEffect(() => {
    if (parsedKey) {
      const [yStr] = parsedKey.split('-');
      const py = parseInt(yStr, 10);
      if (!isNaN(py)) setViewYear(py);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMonth = (monthIdx: number) => {
    const fullMonth = INDONESIAN_FULL_MONTHS[monthIdx];
    const formatted = `${fullMonth}-${viewYear}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectCurrentMonth = () => {
    onChange(currentTaskMonth());
    setViewYear(currentYear);
    setIsOpen(false);
  };

  const displayLabel = value ? (formatDateStringToTaskMonth(value) || value) : placeholder;

  return (
    <div className="relative w-full h-full min-h-[44px]" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full min-h-[44px] flex items-center justify-between px-3.5 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-sans font-bold text-gray-900 dark:text-white transition-colors cursor-pointer select-none disabled:opacity-50"
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className="w-3.5 h-3.5 text-[#ff5e1f] shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-0 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-3 shadow-2xl font-sans text-xs w-64">
          {/* Header Year Navigation */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#f0f0f0] dark:border-[#272a34]">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#20232b] text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs font-bold text-gray-900 dark:text-white tracking-wider">
              {viewYear}
            </span>

            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#20232b] text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 12 Months Grid (3x4) */}
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {INDONESIAN_SHORT_MONTHS.map((mShort, idx) => {
              const isSelected = selectedMonthIdx === idx && viewYear === initialYear;
              const isCurrentCalendarMonth = idx === currentMonthIdx && viewYear === currentYear;

              return (
                <button
                  key={mShort}
                  type="button"
                  onClick={() => handleSelectMonth(idx)}
                  className={`py-2 px-1 rounded-none border text-center font-sans text-xs transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#ff5e1f] border-[#ff5e1f] text-white font-bold shadow-sm'
                      : isCurrentCalendarMonth
                        ? 'border-[#ff5e1f]/50 bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold'
                        : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                  }`}
                >
                  {mShort}
                  {isCurrentCalendarMonth && !isSelected && (
                    <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#ff5e1f]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Select Current Month */}
          <div className="pt-2.5 mt-2 border-t border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between">
            <button
              type="button"
              onClick={handleSelectCurrentMonth}
              className="w-full py-1.5 px-2 bg-gray-50 dark:bg-[#0d0e12] hover:bg-gray-100 dark:hover:bg-[#20232b] border border-[#f0f0f0] dark:border-[#272a34] font-mono text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-center transition-colors"
            >
              Bulan Ini ({INDONESIAN_SHORT_MONTHS[currentMonthIdx]}-{currentYear})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
