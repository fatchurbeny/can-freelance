'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import {
  INDONESIAN_FULL_MONTHS,
  INDONESIAN_SHORT_MONTHS,
  currentTaskMonth,
  parseTaskMonthToKey,
} from '@/lib/period-utils';

interface Props {
  value?: string | null;
  selectedValues?: string[];
  onChange: (monthStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
  mode?: 'task' | 'payroll' | 'filter';
  availableMonths?: string[];
  inline?: boolean;
  multiSelect?: boolean;
  rangeSelect?: boolean;
}

export function normalizeDisplayMonth(value?: string | null) {
  if (!value) return null;
  const key = parseTaskMonthToKey(value);
  if (!key) return value;
  const [year, month] = key.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${INDONESIAN_FULL_MONTHS[monthIdx]}-${year}`;
  }
  return value;
}

function parseKeyToMonthIndex(key: string): number | null {
  if (!key) return null;
  const parts = key.split('-');
  if (parts.length !== 2) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  if (isNaN(y) || isNaN(m)) return null;
  return y * 12 + m;
}

function isKeyInRange(key: string, startKey: string | null, endKey: string | null): boolean {
  if (!startKey) return false;
  const keyVal = parseKeyToMonthIndex(key);
  const startVal = parseKeyToMonthIndex(startKey);
  if (keyVal === null || startVal === null) return false;

  if (!endKey) return keyVal === startVal;

  const endVal = parseKeyToMonthIndex(endKey);
  if (endVal === null) return keyVal === startVal;

  const minVal = Math.min(startVal, endVal);
  const maxVal = Math.max(startVal, endVal);
  return keyVal >= minVal && keyVal <= maxVal;
}

function getMonthKeysInRange(startKey: string, endKey: string): string[] {
  const startVal = parseKeyToMonthIndex(startKey);
  const endVal = parseKeyToMonthIndex(endKey);
  if (startVal === null || endVal === null) return [];

  const minVal = Math.min(startVal, endVal);
  const maxVal = Math.max(startVal, endVal);

  const result: string[] = [];
  for (let val = minVal; val <= maxVal; val++) {
    const y = Math.floor(val / 12);
    const m = (val % 12) + 1;
    result.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return result;
}

export default function MonthCalendarPicker({
  value,
  selectedValues = [],
  onChange,
  placeholder = 'Pilih Bulan...',
  disabled = false,
  mode = 'task',
  availableMonths = [],
  inline = false,
  multiSelect = false,
  rangeSelect = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  // Primary single value reference
  const primaryValue = multiSelect || rangeSelect ? (selectedValues[0] || value) : value;
  const parsedKey = parseTaskMonthToKey(primaryValue);
  let initialYear = currentYear;

  if (parsedKey) {
    const [yStr] = parsedKey.split('-');
    const parsedYear = parseInt(yStr, 10);
    if (!isNaN(parsedYear)) initialYear = parsedYear;
  }

  const [viewYear, setViewYear] = useState(initialYear);

  // Range Selection States (Start & End keys)
  const initialRangeKeys = useMemo(() => {
    const list = selectedValues.length ? selectedValues : (value ? [value] : []);
    const keys = list.map((val) => parseTaskMonthToKey(val)).filter((k): k is string => Boolean(k));
    if (keys.length === 0) return { start: null, end: null };
    const sorted = [...keys].sort((a, b) => (parseKeyToMonthIndex(a) || 0) - (parseKeyToMonthIndex(b) || 0));
    return { start: sorted[0], end: sorted.length > 1 ? sorted[sorted.length - 1] : null };
  }, [selectedValues, value]);

  const [rangeStartKey, setRangeStartKey] = useState<string | null>(initialRangeKeys.start);
  const [rangeEndKey, setRangeEndKey] = useState<string | null>(initialRangeKeys.end);

  useEffect(() => {
    setRangeStartKey(initialRangeKeys.start);
    setRangeEndKey(initialRangeKeys.end);
  }, [initialRangeKeys.start, initialRangeKeys.end]);

  useEffect(() => {
    if (parsedKey) {
      const [yStr] = parsedKey.split('-');
      const py = parseInt(yStr, 10);
      if (!isNaN(py)) setViewYear(py);
    }
  }, [parsedKey]);

  useEffect(() => {
    if (inline) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inline]);

  const availableMonthKeys = useMemo(
    () => new Set(availableMonths.map((month) => parseTaskMonthToKey(month)).filter((v): v is string => Boolean(v))),
    [availableMonths]
  );

  const selectedKeySet = useMemo(() => {
    const list = multiSelect || rangeSelect ? selectedValues : (value ? [value] : []);
    const keys = list.map((val) => parseTaskMonthToKey(val)).filter((k): k is string => Boolean(k));
    return new Set(keys);
  }, [multiSelect, rangeSelect, selectedValues, value]);

  const handleSelectMonth = (monthIdx: number) => {
    const fullMonth = INDONESIAN_FULL_MONTHS[monthIdx];
    const formatted = `${fullMonth}-${viewYear}`;
    const optionKey = `${viewYear}-${String(monthIdx + 1).padStart(2, '0')}`;

    if (rangeSelect) {
      if (!rangeStartKey || (rangeStartKey && rangeEndKey)) {
        // Start new range selection
        setRangeStartKey(optionKey);
        setRangeEndKey(null);
        onChange(formatted);
      } else {
        // Complete range selection (Bulan Akhir)
        const allKeys = getMonthKeysInRange(rangeStartKey, optionKey);
        setRangeStartKey(parseKeyToMonthIndex(rangeStartKey)! <= parseKeyToMonthIndex(optionKey)! ? rangeStartKey : optionKey);
        setRangeEndKey(parseKeyToMonthIndex(rangeStartKey)! <= parseKeyToMonthIndex(optionKey)! ? optionKey : rangeStartKey);

        const formattedList = allKeys.map((k) => {
          const [y, m] = k.split('-');
          const idx = parseInt(m, 10) - 1;
          return `${INDONESIAN_FULL_MONTHS[idx]}-${y}`;
        });
        onChange(formattedList.join(','));
        if (!inline) setIsOpen(false);
      }
    } else if (multiSelect) {
      let nextList: string[];
      if (selectedKeySet.has(optionKey)) {
        nextList = Array.from(selectedKeySet)
          .filter((k) => k !== optionKey)
          .map((k) => {
            const [y, m] = k.split('-');
            const idx = parseInt(m, 10) - 1;
            return `${INDONESIAN_FULL_MONTHS[idx]}-${y}`;
          });
      } else {
        const currentList = Array.from(selectedKeySet).map((k) => {
          const [y, m] = k.split('-');
          const idx = parseInt(m, 10) - 1;
          return `${INDONESIAN_FULL_MONTHS[idx]}-${y}`;
        });
        nextList = [...currentList, formatted];
      }
      onChange(nextList.join(','));
    } else {
      onChange(formatted);
      if (!inline) setIsOpen(false);
    }
  };

  const handleSelectAllMonths = () => {
    setRangeStartKey(null);
    setRangeEndKey(null);
    onChange('all');
    if (!inline) setIsOpen(false);
  };

  const handleSelectCurrentMonth = () => {
    const formatted = currentTaskMonth();
    setRangeStartKey(parseTaskMonthToKey(formatted));
    setRangeEndKey(null);

    if (multiSelect || rangeSelect) {
      onChange(formatted);
    } else {
      onChange(formatted);
      if (!inline) setIsOpen(false);
    }
    setViewYear(currentYear);
  };

  const displayLabel = normalizeDisplayMonth(value) || placeholder;

  const calendarGridContent = (
    <div className="rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] p-0 shadow-2xl font-sans text-xs w-full overflow-hidden">
      {/* Year Switcher Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 shrink-0">
        <button
          type="button"
          onClick={() => setViewYear((y) => y - 1)}
          className="w-6 h-6 flex items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] hover:bg-gray-50 dark:hover:bg-[#20232b] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="font-sans text-xs font-bold text-gray-900 dark:text-white tracking-wider">
          {viewYear}
        </span>

        <button
          type="button"
          onClick={() => setViewYear((y) => y + 1)}
          className="w-6 h-6 flex items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] hover:bg-gray-50 dark:hover:bg-[#20232b] transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Month Buttons Grid */}
      <div className="p-2 space-y-2 bg-white dark:bg-[#0d0e12]">
        <div className="grid grid-cols-3 gap-1.5">
          {INDONESIAN_SHORT_MONTHS.map((mShort, idx) => {
            const optionKey = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
            const optionFullString = `${INDONESIAN_FULL_MONTHS[idx]}-${viewYear}`;
            
            const isSelected = rangeSelect
              ? isKeyInRange(optionKey, rangeStartKey, rangeEndKey)
              : selectedKeySet.has(optionKey);

            const isCurrentCalendarMonth = idx === currentMonthIdx && viewYear === currentYear;
            const isAvailable = availableMonthKeys.size === 0 || availableMonthKeys.has(parseTaskMonthToKey(optionFullString) || '');

            return (
              <button
                key={mShort}
                type="button"
                onClick={() => handleSelectMonth(idx)}
                className={`h-8.5 px-1 rounded-none border text-center font-sans text-xs font-semibold transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#ff5e1f] border-[#ff5e1f] text-white font-bold shadow-sm'
                    : isCurrentCalendarMonth
                      ? 'border-[#ff5e1f]/50 bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold'
                      : isAvailable
                        ? 'border-[#f0f0f0] dark:border-[#272a34] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                        : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-300 dark:text-gray-600 opacity-70'
                }`}
              >
                {mShort}
                {isCurrentCalendarMonth && !isSelected && (
                  <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-[#ff5e1f]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Symmetrical 2-Column Footer */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={handleSelectAllMonths}
            className={`py-1.5 px-1 rounded-none border font-sans text-[10px] font-bold uppercase tracking-wider text-center transition-colors cursor-pointer ${
              selectedKeySet.size === 0 || (!rangeStartKey && !rangeEndKey)
                ? 'bg-[#ff5e1f] border-[#ff5e1f] text-white shadow-sm'
                : 'bg-gray-50 dark:bg-[#0d0e12] hover:bg-gray-100 dark:hover:bg-[#20232b] border-[#f0f0f0] dark:border-[#272a34] text-gray-700 dark:text-gray-300'
            }`}
          >
            SEMUA BULAN
          </button>
          <button
            type="button"
            onClick={handleSelectCurrentMonth}
            className="py-1.5 px-1 bg-gray-50 dark:bg-[#0d0e12] hover:bg-gray-100 dark:hover:bg-[#20232b] border border-[#f0f0f0] dark:border-[#272a34] font-sans text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-center transition-colors cursor-pointer truncate"
          >
            BULAN INI ({INDONESIAN_SHORT_MONTHS[currentMonthIdx]})
          </button>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return calendarGridContent;
  }

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
        <div className="absolute left-0 top-full z-50 mt-0 w-56 sm:w-60 min-w-[220px]">
          {calendarGridContent}
        </div>
      )}
    </div>
  );
}
