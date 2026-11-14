'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { getTaskDesignOutputsAction, type DesignOutputItem } from '@/app/actions/design-outputs';

/** Daftar desain hasil Deck/Doc (write-back improstd). Tidak tampil bila kosong. */
export default function DesignOutputsList({ taskId }: { taskId: string }) {
  const [items, setItems] = useState<DesignOutputItem[]>([]);

  useEffect(() => {
    let alive = true;
    setItems([]);
    getTaskDesignOutputsAction(taskId).then((rows) => { if (alive) setItems(rows); }).catch(() => {});
    return () => { alive = false; };
  }, [taskId]);

  if (!items.length) return null;
  return (
    <div className="border border-[#f0f0f0] font-sans dark:border-[#272a34]">
      <div className="border-b border-[#f0f0f0] bg-gray-50/50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-400">
        Desain dari Deck/Doc
      </div>
      <ul className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
        {items.map((o) => (
          <li key={o.id} className="flex items-center gap-3 px-4 py-2 text-xs">
            <span className="shrink-0 border border-[#f0f0f0] px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:border-[#272a34]">{o.source}</span>
            <a href={o.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold text-gray-800 hover:text-[#ff5e1f] dark:text-gray-200">
              {o.title || o.url}
            </a>
            <span className="shrink-0 text-gray-400">
              {o.createdByCode ? `${o.createdByCode} · ` : ''}{new Date(o.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          </li>
        ))}
      </ul>
    </div>
  );
}
