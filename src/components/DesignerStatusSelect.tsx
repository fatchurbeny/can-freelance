'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { updateDesignerStatusAction } from '@/app/actions/designer';
import { Check, ChevronDown } from 'lucide-react';

interface Props {
  designerId: string;
  initialStatus: string;
}

export default function DesignerStatusSelect({ designerId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus || 'Active');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false,
  });

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 180;
      setMenuPos({
        top: openUp ? rect.top : rect.bottom + 4,
        left: rect.left,
        openUp,
      });
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      if (isOpen) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

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

  const getStatusTextStyle = (st: string) => {
    switch (st) {
      case 'Active':
        return 'text-emerald-600 dark:text-emerald-400 font-bold';
      case 'Resign':
        return 'text-rose-600 dark:text-rose-400 line-through font-bold';
      case 'Inactive':
      default:
        return 'text-amber-600 dark:text-amber-400 font-bold';
    }
  };

  const statuses = ['Active', 'Inactive', 'Resign'];

  return (
    <div className="w-full h-full min-h-[44px] flex items-stretch relative">
      {/* Symmetrical Table Cell Button Trigger */}
      <button
        ref={buttonRef}
        type="button"
        disabled={isPending}
        onClick={toggleDropdown}
        className={`w-full h-full min-h-[44px] px-3.5 border-l border-r border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#16181d]/50 transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none select-none ${
          isPending ? 'opacity-50 cursor-wait' : ''
        }`}
      >
        <span className={`text-xs font-sans uppercase tracking-wider ${getStatusTextStyle(status)}`}>
          {status}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Cloudflare Style Dropdown Overlay */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: `${menuPos.left}px`,
            top: menuPos.openUp ? 'auto' : `${menuPos.top}px`,
            bottom: menuPos.openUp ? `${window.innerHeight - menuPos.top + 4}px` : 'auto',
          }}
          className="w-40 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl z-[9999] font-sans text-xs space-y-0.5"
        >
          <div className="px-2 py-1 mb-1 border-b border-[#f0f0f0] dark:border-[#272a34] text-[9px] font-mono font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
            PILIH STATUS
          </div>
          {statuses.map((opt) => {
            const isChecked = status === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleChange(opt)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left transition-colors cursor-pointer ${
                  isChecked
                    ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                }`}
              >
                <span className={`text-xs ${opt === 'Resign' ? 'line-through text-rose-500 dark:text-rose-400 font-bold' : ''}`}>
                  {opt}
                </span>
                <div
                  className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ${
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
