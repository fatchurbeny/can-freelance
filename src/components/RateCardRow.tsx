'use client';

import { useMemo, useState, useTransition } from 'react';
import { Edit3, Save, X, Clock3 } from 'lucide-react';
import { updateDoctypeRateCardAction } from '@/app/actions/rate-card';

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
        return;
      }

      setIsEditing(false);
    });
  };

  return (
    <tr className="hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors font-mono text-xs">
      <td className="pl-5 pr-4 py-3 font-bold text-gray-900 dark:text-white">{doctype.notionKey}</td>
      <td className="px-4 py-3 text-center font-bold text-indigo-600 dark:text-[#ff5e1f]">
        IDR {new Intl.NumberFormat('id-ID').format(contractRate)}
      </td>
      <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
        {isEditing ? (
          <input
            id={`pool-rate-${doctype.id}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={poolRate}
            onChange={(e) => setPoolRate(e.target.value)}
            className="w-24 rounded-md border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-2 py-1 text-center text-xs font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#ff5e1f]"
          />
        ) : (
          String(doctype.poolRate)
        )}
      </td>
      <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">
        {isEditing ? (
          <input
            id={`pages-${doctype.id}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            className="w-20 rounded-md border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-2 py-1 text-center text-xs font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#ff5e1f]"
          />
        ) : (
          doctype.pages ?? 1
        )}
      </td>
      <td className="px-4 py-3 text-center text-gray-400 dark:text-gray-500 text-xs">
        <div className="inline-flex items-center justify-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 text-gray-400" />
          <span>{lastUpdate}</span>
        </div>
      </td>
      <td className="pr-5 pl-4 py-3 text-center whitespace-nowrap">
        {isEditing ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-md bg-[#ff5e1f] px-2.5 py-1 text-xs font-mono font-bold text-white transition-colors hover:bg-[#ff7038] disabled:opacity-60 cursor-pointer"
                id={`save-rate-card-${doctype.id}`}
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-md border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-2.5 py-1 text-xs font-mono font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60 cursor-pointer"
                id={`cancel-rate-card-${doctype.id}`}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
            {error ? <p className="max-w-[180px] text-[10px] text-rose-500">{error}</p> : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] px-3 py-1 text-xs font-mono font-medium text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:text-[#ff5e1f] dark:hover:text-[#ff5e1f] transition-colors cursor-pointer"
            id={`edit-rate-card-${doctype.id}`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Rate Card
          </button>
        )}
      </td>
    </tr>
  );
}
