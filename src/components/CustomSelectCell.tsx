'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  id: string;
  label?: string;
  displayName?: string;
}

export default function CustomSelectCell({
  value,
  placeholder = 'Select...',
  options,
  onChange,
  showSearch: explicitShowSearch,
}: {
  value: string;
  placeholder?: string;
  options: SelectOption[];
  onChange: (selectedId: string) => void;
  showSearch?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = options.find((o) => o.id === value);
  const getOptionLabel = (opt?: SelectOption) => opt ? (opt.label || opt.displayName || opt.id) : placeholder;

  const showSearch = explicitShowSearch ?? (options.length > 5);

  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) => getOptionLabel(opt).toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : options;

  return (
    <div className="relative w-full h-full min-h-[44px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setSearchQuery('');
        }}
        className="w-full h-full min-h-[44px] flex items-center justify-between px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-sans font-bold text-gray-900 dark:text-white transition-colors cursor-pointer select-none"
      >
        <span className="truncate">{getOptionLabel(selectedOption)}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-0 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl max-h-64 overflow-hidden font-sans text-xs flex flex-col">
          {showSearch && (
            <div className="p-1.5 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d] shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] font-sans text-xs text-gray-900 dark:text-white outline-none focus:border-[#ff5e1f] transition-colors"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1 max-h-48">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isChecked = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-sans transition-colors cursor-pointer ${
                      isChecked
                        ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                    }`}
                  >
                    <span className="truncate">{getOptionLabel(opt)}</span>
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
              })
            ) : (
              <div className="px-3 py-3 text-center text-xs text-gray-400 font-sans">
                Option not found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
