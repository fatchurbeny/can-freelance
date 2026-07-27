'use client';

import { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function SelectDropdown({ label, options, value, onChange, disabled }: DropdownProps) {
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
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#111827] text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-[#F5F0EB] dark:hover:bg-[#1b2436] focus:outline-none transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isOpen ? 'ring-2 ring-indigo-500' : ''}`}
      >
        <span>{selectedOption?.label || label}</span>
        <div className={`w-2 h-2 border-r-2 border-b-2 border-gray-400 dark:border-gray-500 transform transition-transform ${isOpen ? '-mt-1 rotate-[-135deg]' : 'mt-[-4px] rotate-45'}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#0b1020] shadow-xl z-50 py-2.5 max-h-72 overflow-y-auto backdrop-blur-md">
          <div className="space-y-0.5 px-1.5">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  value === option.value 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-[#F5F0EB] dark:hover:bg-[#1b2436] dark:hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
