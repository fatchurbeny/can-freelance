'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Check, ChevronDown } from 'lucide-react';

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
    <div className="relative h-full w-full flex items-stretch" ref={dropdownRef}>
      {/* Trigger Button (Flat Table Style) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full py-3.5 px-4 flex items-center justify-between gap-2 bg-white dark:bg-[#0d0e12] hover:bg-gray-50 dark:hover:bg-[#16181d] text-xs font-mono font-bold text-gray-900 dark:text-gray-100 focus:outline-none transition-colors cursor-pointer select-none rounded-none whitespace-nowrap"
      >
        <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0 pointer-events-none" />
        <span>{selectedMonth || 'Pilih Bulan'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Checkbox Dropdown Overlay (Flat Table Style) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-0 w-56 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl z-50 max-h-72 overflow-y-auto font-mono text-xs">
          <div className="px-2.5 py-1.5 mb-1 border-b border-[#f0f0f0] dark:border-[#272a34] text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
            PILIH PERIODE BULAN
          </div>
          <div className="space-y-0.5">
            {availableMonths.map((month) => {
              const isChecked = selectedMonth === month;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthChange(month)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left text-xs font-mono transition-colors cursor-pointer ${
                    isChecked
                      ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] dark:hover:text-white'
                  }`}
                >
                  <span className="dark:text-gray-200">{month}</span>
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
