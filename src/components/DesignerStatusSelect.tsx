'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { updateDesignerStatusAction } from '@/app/actions/designer';
import { Check } from 'lucide-react';

interface Props {
  designerId: string;
  initialStatus: string;
}

export default function DesignerStatusSelect({ designerId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus || 'Active');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
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

  const handleChange = (newStatus: string) => {
    const prevStatus = status;
    setStatus(newStatus);
    setIsOpen(false);
    startTransition(async () => {
      const res = await updateDesignerStatusAction(designerId, newStatus);
      if (!res.success) {
        setStatus(prevStatus);
        alert(res.error || 'Failed to update status');
      }
    });
  };

  const getBadgeStyle = (st: string) => {
    switch (st) {
      case 'Active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'Resign':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
      case 'Inactive':
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
    }
  };

  const statuses = ['Active', 'Inactive', 'Resign'];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button styled as a badge */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${getBadgeStyle(
          status
        )} ${isPending ? 'opacity-50 cursor-wait' : ''}`}
      >
        {status}
        <div className="w-1.5 h-1.5 border-r border-b transform rotate-45 pointer-events-none mt-[-2px] border-current opacity-70" />
      </button>

      {/* Checkbox Dropdown Overlay */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 rounded-2xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl z-50 py-2.5 max-h-72 overflow-y-auto backdrop-blur-md">
          <div className="px-3 pb-2 mb-1.5 border-b border-[#E8E0D8]/60 dark:border-gray-900 text-[10px] font-bold text-gray-400 dark:text-gray-600 tracking-wider uppercase">
            PILIH STATUS
          </div>
          <div className="space-y-0.5 px-1.5">
            {statuses.map((opt) => {
              const isChecked = status === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChange(opt)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-[#F5F0EB] dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span className="dark:text-gray-200">{opt}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    isChecked
                      ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 text-white'
                      : 'border-gray-300 dark:border-gray-600'
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
