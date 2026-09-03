'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Edit3 } from 'lucide-react';

export const DESIGNER_ROLE_OPTIONS = [
  'Junior Designer',
  'Mid Designer',
  'Senior Designer',
  'Lead Designer',
  'Presentation Specialist',
  'Art Director',
];

interface Props {
  value: string;
  onChange: (newRole: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RoleSelectCell({
  value,
  onChange,
  placeholder = 'Pilih Role / Jabatan...',
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const isPreset = DESIGNER_ROLE_OPTIONS.includes(value);

  useEffect(() => {
    if (!isPreset && value) {
      setIsCustomMode(true);
      setCustomText(value);
    } else {
      setIsCustomMode(false);
    }
  }, [value, isPreset]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isCustomMode && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomMode]);

  const handleSelectOption = (opt: string) => {
    if (opt === 'CUSTOM_WRITE_IN') {
      setIsCustomMode(true);
      setIsOpen(false);
    } else {
      setIsCustomMode(false);
      onChange(opt);
      setIsOpen(false);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomText(val);
    onChange(val);
  };

  return (
    <div className="relative w-full h-full min-h-[44px]" ref={dropdownRef}>
      {isCustomMode ? (
        <div className="w-full h-full min-h-[44px] flex items-center bg-gray-50/50 dark:bg-[#16181d]/50">
          <input
            ref={customInputRef}
            type="text"
            value={customText}
            onChange={handleCustomChange}
            placeholder="Ketik Jabatan Kustom..."
            className="w-full h-full min-h-[44px] rounded-none border-0 bg-transparent px-4 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
          />
          <button
            type="button"
            onClick={() => setIsCustomMode(false)}
            title="Kembali ke Pilihan Dropdown"
            className="px-3 h-full flex items-center justify-center text-gray-400 hover:text-[#ff5e1f] transition-colors cursor-pointer shrink-0"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-full min-h-[44px] flex items-center justify-between px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-sans font-bold text-gray-900 dark:text-white transition-colors cursor-pointer select-none disabled:opacity-50"
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-2" />
        </button>
      )}

      {isOpen && !isCustomMode && (
        <div className="absolute left-0 right-0 top-full z-50 mt-0 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl font-sans text-xs flex flex-col p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
          {DESIGNER_ROLE_OPTIONS.map((opt) => {
            const isChecked = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left font-sans transition-colors cursor-pointer ${
                  isChecked
                    ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                }`}
              >
                <span className="truncate">{opt}</span>
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

          {/* Option for custom write-in */}
          <button
            type="button"
            onClick={() => handleSelectOption('CUSTOM_WRITE_IN')}
            className="w-full flex items-center gap-2 px-3 py-2 text-left font-sans transition-colors cursor-pointer text-[#ff5e1f] hover:bg-[#ff5e1f]/10 border-t border-[#f0f0f0] dark:border-[#272a34] font-bold"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Ketik Jabatan Kustom...</span>
          </button>
        </div>
      )}
    </div>
  );
}
