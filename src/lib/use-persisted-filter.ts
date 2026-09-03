'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const PERIOD_STORAGE_KEY = 'can_freelance_active_period';
const BOARD_FILTERS_KEY = 'can_freelance_board_filters';

/**
 * Hook to persist & synchronize active month period and filters across all application pages.
 * - Reads `?period=...` from URL search params.
 * - Saves selected period to `localStorage`.
 * - Restores period from `localStorage` if URL search param is absent on initial mount.
 */
export function usePersistedPeriod() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlPeriod = searchParams.get('period');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (urlPeriod) {
      // Save active period to localStorage
      localStorage.setItem(PERIOD_STORAGE_KEY, urlPeriod);
    } else {
      // Restore active period from localStorage if absent in URL
      const savedPeriod = localStorage.getItem(PERIOD_STORAGE_KEY);
      if (savedPeriod && savedPeriod.trim()) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('period', savedPeriod);
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  }, [urlPeriod, pathname, router, searchParams]);
}

/**
 * Helper to build navigation URLs retaining the active `period` query parameter.
 */
export function buildPersistedHref(targetHref: string, currentPeriod?: string): string {
  if (!currentPeriod || typeof window === 'undefined') return targetHref;

  const [basePath, existingQuery] = targetHref.split('?');
  const params = new URLSearchParams(existingQuery || '');
  if (!params.has('period')) {
    params.set('period', currentPeriod);
  }
  return `${basePath}?${params.toString()}`;
}

export function saveBoardFiltersToStorage(filters: Record<string, any>) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BOARD_FILTERS_KEY, JSON.stringify(filters));
    } catch {
      // ignore
    }
  }
}

export function getSavedBoardFiltersFromStorage(): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BOARD_FILTERS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
