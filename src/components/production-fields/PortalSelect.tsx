'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface PortalSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  value: string;
  options: PortalSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
}

/** Dropdown sel tabel; panel dirender lewat portal `fixed` agar tidak terpotong container overflow drawer. */
export default function PortalSelect({ value, options, onChange, ariaLabel, placeholder = 'Pilih…', disabled }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!rect) return;
    const close = (e: Event) => {
      if (e.type === 'mousedown' && (panelRef.current?.contains(e.target as Node) || buttonRef.current?.contains(e.target as Node))) return;
      setRect(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      setRect(null);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [rect]);

  const selected = options.find((o) => o.value === value);
  const openUp = rect ? rect.bottom + 260 > window.innerHeight : false;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={!!rect}
        disabled={disabled}
        onClick={() => setRect(rect ? null : buttonRef.current!.getBoundingClientRect())}
        className="w-full h-full min-h-[44px] flex items-center justify-between gap-2 px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-sans font-bold text-gray-900 dark:text-white transition-colors cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={`truncate ${selected ? '' : 'text-gray-400'}`}>{selected?.label ?? (value || placeholder)}</span>
        <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
      </button>
      {rect && typeof window !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          aria-label={ariaLabel}
          style={{ position: 'fixed', left: rect.left, width: rect.width, ...(openUp ? { bottom: window.innerHeight - rect.top } : { top: rect.bottom }) }}
          className="z-[100] rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl font-sans text-xs flex flex-col p-1.5 space-y-0.5 max-h-60 overflow-y-auto"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(option.value); setRect(null); buttonRef.current?.focus(); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer ${isSelected ? 'bg-gray-100 dark:bg-[#20232b] font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.hint && <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400">{option.hint}</span>}
                </span>
                <span className={`w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 ${isSelected ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black' : 'border-gray-300 dark:border-[#343846]'}`}>
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
