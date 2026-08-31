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
        top: openUp ? rect.top : rect.bottom + 6,
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

  const getBadgeStyle = (st: string) => {
    switch (st) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'Resign':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 line-through';
      case 'Inactive':
      default:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
    }
  };

  const statuses = ['Active', 'Inactive', 'Resign'];

  return (
    <div className="inline-block">
      {/* Trigger Button styled as a badge */}
      <button
        ref={buttonRef}
        type="button"
        disabled={isPending}
        onClick={toggleDropdown}
        className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-full border cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5e1f]/20 ${getBadgeStyle(
          status
        )} ${isPending ? 'opacity-50 cursor-wait' : ''}`}
      >
        {status}
        <div className="w-1.5 h-1.5 border-r border-b transform rotate-45 pointer-events-none mt-[-2px] border-current opacity-70" />
      </button>

      {/* Fixed Position Dropdown Overlay (No clipping, in front of table) */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: `${menuPos.left}px`,
            top: menuPos.openUp ? 'auto' : `${menuPos.top}px`,
            bottom: menuPos.openUp ? `${window.innerHeight - menuPos.top + 6}px` : 'auto',
          }}
          className="w-44 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-xl z-[9999] py-2 font-mono backdrop-blur-md"
        >
          <div className="px-3 pb-1.5 mb-1 border-b border-[#f0f0f0] dark:border-[#272a34] text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
            PILIH STATUS
          </div>
          <div className="space-y-0.5 px-1">
            {statuses.map((opt) => {
              const isChecked = status === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChange(opt)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#20242f] transition-colors cursor-pointer"
                >
                  <span className={opt === 'Resign' ? 'line-through text-rose-500 dark:text-rose-400' : ''}>{opt}</span>
                  <div
                    className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                        : 'border-gray-300 dark:border-[#272a34] bg-white dark:bg-[#16181d]'
                    }`}
                  >
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
