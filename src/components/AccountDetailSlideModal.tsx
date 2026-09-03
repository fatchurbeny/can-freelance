'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Save, FileText, Layers, LayoutGrid, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { updateAccountAction } from '@/app/actions/designer';

export interface AccountItem {
  id: string;
  displayName: string;
  color?: string | null;
  notionKey?: string | null;
  doctypes?: number;
  templates?: number;
  pages?: number;
}

interface Props {
  open: boolean;
  account: AccountItem | null;
  onClose: () => void;
}

const BRAND_COLORS = [
  '#F97316', '#EF4444', '#10B981', '#EC4899', '#8B5CF6', '#3B82F6', '#6366F1', '#F59E0B'
];

export default function AccountDetailSlideModal({ open, account, onClose }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState('#F97316');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !account) return;
    setDisplayName(account.displayName || '');
    setColor(account.color || '#F97316');
    setSaving(false);
  }, [open, account]);

  if (!open || !account) return null;

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error('Brand account name is required.');
      return;
    }

    setSaving(true);
    const res = await updateAccountAction({
      accountId: account.id,
      displayName: trimmedName,
      color,
    });
    setSaving(false);

    if (res.success) {
      toast.success(`Brand Account "${trimmedName}" updated successfully!`);
      router.refresh();
      onClose();
    } else {
      toast.error(res.error || 'Failed to update Canva account.');
    }
  };

  const initials = account.displayName.substring(0, 2).toUpperCase();

  const modalContent = (
    <div className="fixed inset-0 z-70">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 cursor-pointer"
        aria-label="Close modal"
      />

      {/* Slide-over Container */}
      <div className="absolute right-0 top-0 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]">

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50">
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
            <div
              className="w-10 h-10 rounded-full border border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
              style={{ backgroundColor: color }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="font-sans text-base font-bold text-gray-900 dark:text-white tracking-wider truncate">
                {account.displayName}
              </h2>
              <p className="text-xs font-sans text-gray-500 dark:text-gray-400 truncate">
                Canva Account / Brand Profile
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick SaaS Performance KPI Row */}
        <div className="grid grid-cols-3 divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 text-center py-3 px-2 font-sans text-xs shrink-0">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Handled Doctypes</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-[#ff5e1f] mt-0.5 block">{account.doctypes || 0}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Templates QTY</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{account.templates || 0}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Pages</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">{account.pages || 0}</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#f0f0f0] dark:divide-[#272a34] p-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#272a34]">
          <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">

            {/* Row 1: Brand Name */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Brand Name</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nama Account / Brand"
                  className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                />
              </div>
            </div>

            {/* Row 2: Brand Color Selector */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span>Brand Color</span>
              </div>
              <div className="flex-1 px-5 py-3 flex items-center gap-2 bg-white dark:bg-[#0d0e12] flex-wrap">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                      color === c ? 'border-black dark:border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Action Footer */}
        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-12 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] font-sans text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!displayName.trim() || saving}
            className="h-12 bg-[#ff5e1f] hover:bg-[#ff7038] disabled:opacity-50 disabled:cursor-not-allowed font-sans text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{saving ? 'Saving...' : 'Save Account Details'}</span>
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
