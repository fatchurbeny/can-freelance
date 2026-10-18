'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface Props {
  value: string;
  options: { slug: string; name: string }[];
  onChange: (slug: string) => void;
  placeholder?: string;
  showSearch?: boolean;
}

/** Dropdown platform bergaya Cloudflare (sama dengan CategorySelectCell). */
export default function PlatformSelectCell({ value, options, onChange, placeholder = 'Pilih Platform...', showSearch: explicitShowSearch }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setIsOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => { if (isOpen) searchRef.current?.focus(); }, [isOpen]);

  const showSearch = explicitShowSearch ?? options.length > 5;
  const filtered = query.trim() ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase())) : options;
  const selected = options.find((o) => o.slug === value);

  return (
    <div className="relative w-full h-full min-h-[44px]" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full min-h-[44px] flex items-center justify-between px-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-sans font-bold text-gray-900 dark:text-white transition-colors cursor-pointer select-none"
      >
        <span className="truncate">{selected?.name || placeholder}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-0 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl font-sans text-xs flex flex-col">
          {showSearch && (
            <div className="p-1.5 border-b border-[#f0f0f0] dark:border-[#272a34] shrink-0">
              <div className="flex items-center gap-2 border border-[#ff5e1f] bg-white dark:bg-[#0d0e12] px-2.5 h-9">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari..." className="w-full bg-transparent outline-none text-xs font-sans text-gray-900 dark:text-white placeholder:text-gray-400" />
              </div>
            </div>
          )}
          <div className="p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
          {filtered.length === 0 && <div className="px-3 py-2 text-gray-400">Tidak ada hasil</div>}
          {filtered.map((opt) => {
            const isChecked = value === opt.slug;
            return (
              <button
                key={opt.slug}
                type="button"
                onClick={() => { onChange(opt.slug); setIsOpen(false); setQuery(''); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left font-sans transition-colors cursor-pointer ${
                  isChecked
                    ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                }`}
              >
                <span className="truncate">{opt.name}</span>
                <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ml-2 ${
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
        </div>
      )}
    </div>
  );
}
