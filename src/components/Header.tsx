'use client';

import { Suspense } from 'react';
import PeriodPicker from './PeriodPicker';

interface HeaderProps {
  periods: string[];
  currentPeriod: string;
}

export default function Header({ periods, currentPeriod }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#f0f0f0] dark:border-[#272a34] transition-colors">
      <div>
        <h2 className="font-sans font-bold text-2xl tracking-tight text-[#262626] dark:text-white">
          Dashboard
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-normal">
          Laporan Komprehensif Distribusi Template Dan Statistik Performa Antar Brand.
        </p>
      </div>

      <div className="flex items-center gap-3 self-end md:self-center">
        {/* Period Picker */}
        <Suspense fallback={<div className="w-[120px] h-[38px] bg-gray-100 dark:bg-[#16181d] rounded-lg animate-pulse" />}>
          <PeriodPicker periods={periods} currentPeriod={currentPeriod} />
        </Suspense>
      </div>
    </header>
  );
}
