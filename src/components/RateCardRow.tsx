'use client';

import { useMemo, useState, useTransition } from 'react';
import { Edit3, Save, X, Clock3 } from 'lucide-react';
import { updateDoctypeRateCardAction } from '@/app/actions/rate-card';
import toast from 'react-hot-toast';

interface RateCardRowProps {
  doctype: {
    id: string;
    notionKey: string;
    poolRate: number;
    pages: number | null;
    updatedAt: string | Date | null;
  };
  contractRate: number;
}

function formatDate(value: string | Date | null) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function RateCardRow({ doctype, contractRate }: RateCardRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [poolRate, setPoolRate] = useState(String(doctype.poolRate));
  const [pages, setPages] = useState(String(doctype.pages ?? 1));
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const lastUpdate = useMemo(() => formatDate(doctype.updatedAt), [doctype.updatedAt]);

  const handleCancel = () => {
    setPoolRate(String(doctype.poolRate));
    setPages(String(doctype.pages ?? 1));
    setError('');
    setIsEditing(false);
  };

  const handleSave = () => {
    const nextPoolRate = Number(poolRate);
    const nextPages = Number(pages);

    if (!Number.isFinite(nextPoolRate) || !Number.isFinite(nextPages)) {
      setError('Pool Rate and Pages must be numbers.');
      toast.error('Pool Rate and Pages must be numbers.');
      return;
    }

    setError('');
    startTransition(async () => {
      const res = await updateDoctypeRateCardAction(doctype.id, {
        poolRate: nextPoolRate,
        pages: nextPages,
      });

      if (!res.success) {
        setError(res.error || 'Failed to save rate card.');
        toast.error(res.error || 'Failed to save rate card.');
        return;
      }

      toast.success(`Rate card "${doctype.notionKey}" updated!`);
      setIsEditing(false);
    });
  };

  return (
    <tr className="hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors font-mono text-xs">
      <td className="pl-5 pr-4 py-3 font-bold text-gray-900 dark:text-white w-[260px] truncate">{doctype.notionKey}</td>
      <td className="px-4 py-3 text-center font-bold text-indigo-600 dark:text-[#ff5e1f] w-[180px] whitespace-nowrap">
        IDR {new Intl.NumberFormat('id-ID').format(contractRate)}
      </td>
      <td className="p-0 text-center font-bold text-emerald-600 dark:text-emerald-400 w-[140px] whitespace-nowrap h-full align-stretch">
        {isEditing ? (
          <input
            id={`pool-rate-${doctype.id}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={poolRate}
            onChange={(e) => setPoolRate(e.target.value)}
            className="w-full h-full min-h-[44px] rounded-none border-x border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-2 text-center text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:border-[#ff5e1f] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <div className="py-3 px-4">{String(doctype.poolRate)}</div>
        )}
      </td>
      <td className="p-0 text-center font-bold text-blue-600 dark:text-blue-400 w-[120px] whitespace-nowrap h-full align-stretch">
        {isEditing ? (
          <input
            id={`pages-${doctype.id}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            className="w-full h-full min-h-[44px] rounded-none border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-2 text-center text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:border-[#ff5e1f] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <div className="py-3 px-4">{doctype.pages ?? 1}</div>
        )}
      </td>
      <td className="px-4 py-3 text-center text-gray-400 dark:text-gray-500 text-xs w-[200px] whitespace-nowrap">
        <div className="inline-flex items-center justify-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 text-gray-400" />
          <span>{lastUpdate}</span>
        </div>
      </td>
      <td className="p-0 text-center whitespace-nowrap w-[180px] h-full align-stretch">
        {isEditing ? (
          <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-l border-[#f0f0f0] dark:border-[#272a34] h-full min-h-[44px] items-stretch font-mono text-xs">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="h-full min-h-[44px] py-3 px-2 bg-[#ff5e1f] hover:bg-[#ff7038] font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1 uppercase tracking-wider disabled:opacity-60"
              id={`save-rate-card-${doctype.id}`}
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="h-full min-h-[44px] py-3 px-2 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] font-bold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer flex items-center justify-center gap-1 uppercase tracking-wider disabled:opacity-60"
              id={`cancel-rate-card-${doctype.id}`}
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="w-full h-full min-h-[44px] border-l border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 hover:bg-[#ff5e1f] dark:hover:bg-[#ff5e1f] text-gray-700 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider"
            id={`edit-rate-card-${doctype.id}`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
        )}
      </td>
    </tr>
  );
}
