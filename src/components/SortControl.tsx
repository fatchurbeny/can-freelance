'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'lastEdited', label: 'Last Edited' },
  { value: 'dateCreated', label: 'Date Created' },
  { value: 'nameAsc', label: 'A-Z' },
  { value: 'nameDesc', label: 'Z-A' },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]['value'];

interface Props {
  value: SortKey;
  onChange: (value: SortKey) => void;
  disabled?: boolean;
}

/** A-Z / Z-A carry their own direction, so the arrow only reflects the date sorts. */
const ASCENDING: SortKey[] = ['nameAsc'];

export default function SortControl({ value, onChange, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = SORT_OPTIONS.find((o) => o.value === value);
  const Arrow = ASCENDING.includes(value) ? ArrowUp : ArrowDown;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 rounded-full border border-[#E8E0D8] px-4 py-1.5 text-[13px] font-medium text-indigo-600 transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:border-gray-800 dark:text-indigo-400 dark:hover:bg-white/5"
      >
        <Arrow className="size-3.5" />
        {selected?.label}
        <ChevronDown className={`size-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 z-50 mt-1.5 min-w-[160px] rounded-xl border border-[#E8E0D8] bg-white py-1.5 shadow-xl dark:border-gray-800 dark:bg-[#111827]"
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left text-[13px] font-medium transition-colors ${
                value === opt.value
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { SORT_OPTIONS };
