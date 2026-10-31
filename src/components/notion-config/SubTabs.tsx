'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface SubTabItem<T extends string> {
  id: T;
  label: string;
  /** Angka/teks kecil di samping label (mis. jumlah, "1 belum", "2 gagal"). */
  badge?: string | number | null;
  /** `alert` = merah (perlu perhatian), selain itu netral. */
  tone?: 'neutral' | 'alert';
}

/** Sub-tab aktif disimpan di `?sub=` (di bawah `?tab=` Notion Config) agar bisa ditautkan langsung. */
export function useSubTab<T extends string>(ids: readonly T[], fallback: T): [T, (id: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get('sub') as T | null;
  const active = requested && ids.includes(requested) ? requested : fallback;

  const select = useCallback((id: T) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === fallback) params.delete('sub');
    else params.set('sub', id);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [fallback, pathname, router, searchParams]);

  return [active, select];
}

/** Baris sub-tab Notion Config: tombol kecil, aktif berwarna gelap (beda dari tab utama bergaris oranye). */
export default function SubTabs<T extends string>({ items, active, onChange, label }: {
  items: SubTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b border-[#f0f0f0] bg-gray-50/50 px-5 py-2.5 dark:border-[#272a34] dark:bg-[#16181d]/50">
      {items.map((item) => {
        const isActive = item.id === active;
        const alert = item.tone === 'alert';
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={`flex h-8 items-center gap-1.5 border px-3 text-xs transition-colors cursor-pointer ${
              isActive
                ? 'border-gray-900 bg-gray-900 font-bold text-white dark:border-white dark:bg-white dark:text-gray-900'
                : 'border-[#f0f0f0] bg-white font-semibold text-gray-600 hover:text-gray-900 dark:border-[#272a34] dark:bg-[#0d0e12] dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            {item.label}
            {item.badge != null && item.badge !== '' && (
              <span
                className={`px-1.5 py-px text-[10px] font-bold ${
                  alert
                    ? isActive ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                    : isActive ? 'bg-white/20 text-white dark:bg-gray-900/10 dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-[#20232b] dark:text-gray-300'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
