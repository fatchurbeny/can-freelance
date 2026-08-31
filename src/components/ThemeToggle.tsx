'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

type ThemeMode = 'light' | 'dark';

export default function ThemeToggle({ isCollapsed = false }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  const applyTimeTheme = () => {
    if (localStorage.getItem('theme')) return;
    const hour = new Date().getHours();
    const shouldBeDark = hour >= 19 || hour < 7;
    setTheme(shouldBeDark ? 'dark' : 'light');
  };

  useEffect(() => {
    const isDarkClass = document.documentElement.classList.contains('dark');
    setIsDark(isDarkClass);

    // Check every minute to auto-switch at hour boundary
    const interval = setInterval(applyTimeTheme, 60_000);
    return () => clearInterval(interval);
  }, []);

  const setTheme = (mode: ThemeMode) => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    }
  };

  // Collapsed: icon-only, shows the ACTIVE theme
  if (isCollapsed) {
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="w-full flex items-center justify-center p-2.5 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 dark:text-gray-400 hover:text-[#ff5e1f] dark:hover:text-[#ff5e1f] hover:bg-gray-50 dark:hover:bg-[#1e2028] transition-colors shadow-sm cursor-pointer"
        aria-label="Toggle Theme"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }

  // Expanded: segmented Light / Dark control, active highlighted
  const option = (mode: ThemeMode) => {
    const active = (mode === 'dark') === isDark;
    const Icon = mode === 'dark' ? Moon : Sun;
    return (
      <button
        key={mode}
        onClick={() => setTheme(mode)}
        aria-pressed={active}
        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
          active
            ? 'bg-[#ff5e1f] text-white shadow-sm font-semibold'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="whitespace-nowrap">{mode === 'dark' ? 'Dark' : 'Light'}</span>
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label="Toggle Theme"
      className="w-full flex items-center gap-1 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1 shadow-sm"
    >
      {option('light')}
      {option('dark')}
    </div>
  );
}
