'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  buttonClassName?: string;
}

export default function SelectDropdown({ label, options, value, onChange, disabled, buttonClassName }: DropdownProps) {
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

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-11 flex items-center justify-between px-3.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-xs font-mono font-bold text-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-700 focus:outline-none transition-colors shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'border-gray-400 dark:border-gray-600' : ''
        } ${buttonClassName || ''}`}
      >
        <span>{selectedOption?.label || label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-150 ${isOpen ? 'rotate-180 text-gray-900 dark:text-white' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl z-50 max-h-72 overflow-y-auto font-mono text-xs">
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] dark:hover:text-white'
                  }`}
                >
                  <span>{option.label}</span>
                  <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ${
                    isSelected
                      ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                      : 'border-gray-300 dark:border-[#343846] bg-white dark:bg-[#16181d]'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
