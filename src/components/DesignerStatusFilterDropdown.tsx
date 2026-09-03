'use client';

import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, ChevronDown, Check } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'ALL Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Resign', label: 'Resign' },
] as const;

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function DesignerStatusFilterDropdown({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = STATUS_OPTIONS.find((o) => o.value === value) || STATUS_OPTIONS[0];

  return (
    <div className="relative h-full min-h-[44px] flex items-stretch" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="h-full min-h-[44px] px-4 border-r border-[#f0f0f0] dark:border-[#272a34] flex items-center gap-2 text-xs font-sans font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#16181d]/50 transition-colors cursor-pointer select-none whitespace-nowrap outline-none focus:outline-none focus-visible:outline-none"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        <span>{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-0 min-w-[170px] rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl font-sans text-xs"
        >
          {STATUS_OPTIONS.map((opt) => {
            const isChecked = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isChecked}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left transition-colors cursor-pointer ${
                  isChecked
                    ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                }`}
              >
                <span>{opt.label}</span>
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
  );
}
