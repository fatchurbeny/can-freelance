'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface EventTypeOption {
  value: 'PROMOTION' | 'ACHIEVEMENT' | 'CONTRACT_CHANGE' | 'STATUS_CHANGE';
  label: string;
}

export const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  { value: 'PROMOTION', label: 'Promosi Jabatan' },
  { value: 'ACHIEVEMENT', label: 'Achievement / Milestone' },
  { value: 'CONTRACT_CHANGE', label: 'Perubahan Kontrak' },
  { value: 'STATUS_CHANGE', label: 'Perubahan Status' },
];

interface Props {
  value: 'PROMOTION' | 'ACHIEVEMENT' | 'CONTRACT_CHANGE' | 'STATUS_CHANGE';
  onChange: (val: 'PROMOTION' | 'ACHIEVEMENT' | 'CONTRACT_CHANGE' | 'STATUS_CHANGE') => void;
  disabled?: boolean;
}

export default function EventTypeSelectCell({ value, onChange, disabled = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOpt = EVENT_TYPE_OPTIONS.find((o) => o.value === value) || EVENT_TYPE_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] px-3 font-sans text-xs font-bold text-gray-900 dark:text-white flex items-center justify-between outline-none hover:bg-gray-50 dark:hover:bg-[#16181d] transition-colors cursor-pointer disabled:opacity-50 select-none"
      >
        <span className="truncate">{selectedOpt.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl font-sans text-xs flex flex-col p-1.5 space-y-0.5">
          {EVENT_TYPE_OPTIONS.map((opt) => {
            const isChecked = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left font-sans transition-colors cursor-pointer ${
                  isChecked
                    ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                <div
                  className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ml-2 ${
                    isChecked
                      ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                      : 'border-gray-300 dark:border-[#343846] bg-white dark:bg-[#16181d]'
                  }`}
                >
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
