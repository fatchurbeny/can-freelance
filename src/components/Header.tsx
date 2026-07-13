'use client';

import { Suspense } from 'react';
import PeriodPicker from './PeriodPicker';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  periods: string[];
  currentPeriod: string;
}

export default function Header({ periods, currentPeriod }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E8E0D8] dark:border-gray-800 transition-colors">
      <div>
        <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white">
          Dashboard
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
          Laporan Komprehensif Distribusi Template Dan Statistik Performa Antar Brand.
        </p>
      </div>

      <div className="flex items-center gap-3 self-end md:self-center">
        {/* Period Picker */}
        <Suspense fallback={<div className="w-[120px] h-[44px] bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />}>
          <PeriodPicker periods={periods} currentPeriod={currentPeriod} />
        </Suspense>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Badge */}
        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/10 border border-indigo-600/20 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm select-none shadow-sm" title="Manager Account">
          IS
        </div>
      </div>
    </header>
  );
}
