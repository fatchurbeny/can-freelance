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
    <tr className="align-top text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{doctype.notionKey}</td>
      <td className="px-4 py-3 text-center font-semibold text-indigo-600 dark:text-indigo-400">IDR {new Intl.NumberFormat('id-ID').format(contractRate)}</td>
      <td className="px-4 py-3 text-center font-semibold text-green-600 dark:text-green-400">
        {isEditing ? (
          <input
            id={`pool-rate-${doctype.id}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={poolRate}
            onChange={(e) => setPoolRate(e.target.value)}
            className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        ) : (
          String(doctype.poolRate)
        )}
      </td>
      <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
        {isEditing ? (
          <input
            id={`pages-${doctype.id}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        ) : (
          doctype.pages ?? 1
        )}
      </td>
      <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
        <div className="inline-flex items-center justify-center gap-2">
          <Clock3 className="h-3.5 w-3.5 text-gray-400" />
          <span>{lastUpdate}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        {isEditing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                id={`save-rate-card-${doctype.id}`}
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                id={`cancel-rate-card-${doctype.id}`}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
            {error ? <p className="max-w-[180px] text-xs text-red-500">{error}</p> : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
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
