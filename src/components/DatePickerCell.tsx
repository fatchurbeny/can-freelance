'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  value?: string | null; // Format "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function DatePickerCell({
  value,
  onChange,
  placeholder = 'Pilih Tanggal...',
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = value ? new Date(value) : new Date();
  const validInitial = !isNaN(initialDate.getTime());
  
  const [viewYear, setViewYear] = useState(validInitial ? initialDate.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(validInitial ? initialDate.getMonth() : new Date().getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const m = (viewMonth + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const formatted = `${viewYear}-${m}-${d}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    const formatted = `${y}-${m}-${d}`;
    setViewYear(y);
    setViewMonth(today.getMonth());
    onChange(formatted);
    setIsOpen(false);
  };

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Format label
  let displayLabel = placeholder;
  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const dayStr = d.getDate().toString().padStart(2, '0');
      const monthStr = MONTH_NAMES[d.getMonth()].substring(0, 3);
      displayLabel = `${dayStr} ${monthStr} ${d.getFullYear()}`;
    }
  }

  return (
    <div className="relative w-full h-full min-h-[44px]" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full min-h-[44px] flex items-center justify-between px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-sans font-bold text-gray-900 dark:text-white transition-colors cursor-pointer select-none disabled:opacity-50"
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className="w-3.5 h-3.5 text-[#ff5e1f] shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-0 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-3 shadow-2xl font-sans text-xs w-64">
          {/* Header Month & Year Navigation */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#f0f0f0] dark:border-[#272a34]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#20232b] text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-sans text-xs font-bold text-gray-900 dark:text-white tracking-wider">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#20232b] text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Names Row */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-gray-400 dark:text-gray-500 mb-1">
            {DAY_NAMES.map((dn) => (
              <span key={dn}>{dn}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-7" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateIso = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
              const isSelected = value === dateIso;
              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === viewMonth &&
                new Date().getFullYear() === viewYear;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-7 rounded-none border text-center font-mono text-xs transition-all cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-[#ff5e1f] border-[#ff5e1f] text-white font-bold'
                      : isToday
                      ? 'border-[#ff5e1f]/50 bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold'
                      : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Today Button */}
          <div className="pt-2 mt-2 border-t border-[#f0f0f0] dark:border-[#272a34]">
            <button
              type="button"
              onClick={handleSelectToday}
              className="w-full py-1 px-2 bg-gray-50 dark:bg-[#0d0e12] hover:bg-gray-100 dark:hover:bg-[#20232b] border border-[#f0f0f0] dark:border-[#272a34] font-sans text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-center transition-colors"
            >
              Hari Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
