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
        className="relative pl-8 pr-7 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-xs font-mono font-bold text-gray-900 dark:text-gray-100 hover:border-[#ff5e1f] focus:outline-none transition-colors cursor-pointer flex items-center gap-1.5 select-none"
      >
        <Calendar className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <span>{selectedMonth || 'Pilih Bulan'}</span>
        <div className="absolute right-2.5 w-1.5 h-1.5 border-r-2 border-b-2 border-gray-400 dark:border-gray-500 transform rotate-45 pointer-events-none mt-[-2px]" />
      </button>

      {/* Checkbox Dropdown Overlay */}
      {isOpen && (
        <div className="absolute left-0 lg:right-0 lg:left-auto mt-1.5 w-52 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl z-50 py-2 max-h-72 overflow-y-auto font-mono text-xs">
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
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-[#F5F0EB] dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span className="dark:text-gray-200">{month}</span>
                  <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${
                    isChecked
                      ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                      : 'border-gray-300 dark:border-[#272a34] bg-white dark:bg-[#16181d]'
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
