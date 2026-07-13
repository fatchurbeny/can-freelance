'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Check } from 'lucide-react';

export default function MonthFilter({ 
  availableMonths, 
  selectedMonth 
}: { 
  availableMonths: string[], 
  selectedMonth: string 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthChange = (newMonth: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('paymentMonth', newMonth);
    router.push(`?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pl-10 pr-9 py-2 rounded-xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-[#F5F0EB] dark:hover:bg-gray-800 focus:outline-none transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 select-none"
      >
        <Calendar className="absolute left-3.5 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <span>{selectedMonth || 'Pilih Bulan'}</span>
        <div className="absolute right-3.5 w-2 h-2 border-r-2 border-b-2 border-gray-400 dark:border-gray-500 transform rotate-45 pointer-events-none mt-[-2px]" />
      </button>

      {/* Checkbox Dropdown Overlay */}
      {isOpen && (
        <div className="absolute left-0 lg:right-0 lg:left-auto mt-2 w-56 rounded-2xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl z-50 py-2.5 max-h-72 overflow-y-auto backdrop-blur-md">
          <div className="px-3 pb-2 mb-1.5 border-b border-[#E8E0D8]/60 dark:border-gray-900 text-[10px] font-bold text-gray-400 dark:text-gray-600 tracking-wider uppercase">
            PILIH PERIODE BULAN
          </div>
          <div className="space-y-0.5 px-1.5">
            {availableMonths.map((month) => {
              const isChecked = selectedMonth === month;
              return (
                <button
                  key={month}
                  onClick={() => handleMonthChange(month)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-[#F5F0EB] dark:hover:bg-gray-850 transition-colors cursor-pointer"
                >
                  <span>{month}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    isChecked
                      ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 text-white'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
            {availableMonths.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500 text-center">
                Tidak ada data
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
