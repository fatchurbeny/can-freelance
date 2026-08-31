'use client';

import { useState, useRef, useEffect } from 'react';
import { UserCheck, Check, ChevronDown, Plus, ShieldCheck } from 'lucide-react';

export interface AccountOption {
  id: string;
  name: string;
  role: string;
  badge?: string;
  isPrimary?: boolean;
}

const DEFAULT_ACCOUNTS: AccountOption[] = [
  { id: 'all', name: 'All Account Managers', role: 'Global View', badge: 'ALL' },
  { id: 'am-1', name: 'Primary Account Manager', role: 'Lead Manager', badge: 'AM-1', isPrimary: true },
  { id: 'am-2', name: 'Studio Manager A', role: 'Creative Lead', badge: 'AM-2' },
  { id: 'am-3', name: 'Studio Manager B', role: 'Operations', badge: 'AM-3' },
];

export default function AccountSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved account from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selected_account_manager');
    if (saved) {
      setSelectedAccountId(saved);
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id);
    localStorage.setItem('selected_account_manager', id);
    setIsOpen(false);
  };

  const currentAccount = DEFAULT_ACCOUNTS.find(a => a.id === selectedAccountId) || DEFAULT_ACCOUNTS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button (Cloudflare Style) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-[34px] px-3 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-xs font-mono font-medium text-gray-900 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700 focus:outline-none transition-colors shadow-none cursor-pointer flex items-center gap-2 select-none"
        title="Switch Account Manager"
      >
        <UserCheck className="w-3.5 h-3.5 text-[#ff5e1f] shrink-0" />
        <span className="max-w-[130px] truncate">{currentAccount.name}</span>
        {currentAccount.badge && (
          <span className="px-1.5 py-0.5 rounded-[4px] bg-gray-100 dark:bg-[#272a34] text-[9px] font-mono font-bold text-gray-600 dark:text-gray-300">
            {currentAccount.badge}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180 text-gray-900 dark:text-white' : ''}`} />
      </button>

      {/* Account Dropdown Overlay (Cloudflare Style) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl z-50 font-mono text-xs">
          {/* Header */}
          <div className="px-2.5 py-1.5 mb-1 border-b border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
            <span>PILIH AKUN MANAGER</span>
            <ShieldCheck className="w-3 h-3 text-[#ff5e1f]" />
          </div>

          {/* Account Options List */}
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {DEFAULT_ACCOUNTS.map((account) => {
              const isSelected = selectedAccountId === account.id;
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleSelectAccount(account.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] dark:hover:text-white'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate text-xs">{account.name}</span>
                    <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500">{account.role}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {account.badge && (
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-bold ${
                        isSelected
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-gray-100 dark:bg-[#272a34] text-gray-600 dark:text-gray-400'
                      }`}>
                        {account.badge}
                      </span>
                    )}
                    <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                        : 'border-gray-300 dark:border-[#343846] bg-white dark:bg-[#16181d]'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Action */}
          <div className="mt-1 pt-1 border-t border-[#f0f0f0] dark:border-[#272a34]">
            <button
              type="button"
              onClick={() => {
                alert('Fitur tambah Multiple Manager Account akan segera tersedia!');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-[#ff5e1f] hover:bg-orange-500/10 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Kelola Akun Manager</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
