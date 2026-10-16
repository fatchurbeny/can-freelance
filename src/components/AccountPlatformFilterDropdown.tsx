'use client';

import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, ChevronDown, Check } from 'lucide-react';

interface Props {
  options: string[];
  /** Platform terpilih. Kosong = semua platform. */
  value: string[];
  onChange: (value: string[]) => void;
}

/** Filter multi-select platform untuk tab Canva Accounts / Brands. */
export default function AccountPlatformFilterDropdown({ options, value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const label = value.length === 0 ? 'Semua Platform' : value.length === 1 ? value[0] : `${value.length} Platform`;

  const toggle = (option: string) => {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };

  return (
    <div className="relative h-full min-h-[44px] flex items-stretch" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="h-full min-h-[44px] px-4 border-r border-[#f0f0f0] dark:border-[#272a34] flex items-center gap-2 text-xs font-sans font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#16181d]/50 transition-colors cursor-pointer select-none whitespace-nowrap outline-none focus:outline-none"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        <span>Platform: {label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-full z-50 mt-0 min-w-[200px] rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl font-sans text-xs"
        >
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-left font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#20232b] cursor-pointer"
          >
            <span>Semua Platform</span>
            {value.length === 0 && <Check className="w-3.5 h-3.5" />}
          </button>
          <div className="my-1 border-t border-[#f0f0f0] dark:border-[#272a34]" />
          {options.map((option) => {
            const checked = value.includes(option);
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(option)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] cursor-pointer"
              >
                <span>{option}</span>
                <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center ${
                  checked
                    ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                    : 'border-gray-300 dark:border-[#343846] bg-white dark:bg-[#16181d]'
                }`}>
                  {checked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
