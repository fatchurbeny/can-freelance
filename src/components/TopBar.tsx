'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Search, 
  Sun, 
  Moon, 
  LayoutDashboard, 
  Files, 
  Users, 
  CreditCard, 
  FileText, 
  Network, 
  Settings,
  Plus
} from 'lucide-react';
import PeriodPicker from './PeriodPicker';
import AccountSwitcher from './AccountSwitcher';

interface TopBarProps {
  badgeLabel?: string;
  activeNav?: string;
  periods?: string[];
  currentPeriod?: string;
  actionButton?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  createTaskAction?: {
    label: string;
    onClick: () => void;
  };
  rightAction?: React.ReactNode;
}

export default function TopBar({
  badgeLabel = 'DASHBOARD',
  periods,
  currentPeriod,
  actionButton,
  rightAction,
}: TopBarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#f0f0f0] dark:border-[#272a34] bg-white/95 dark:bg-[#0d0e12]/95 backdrop-blur-md transition-colors">
      <div className="w-full flex h-14 items-center">
        {/* Left Section: Brand Logo aligned with fixed w-56 Sidebar & 1px Vertical Divider */}
        <div className="w-56 h-full shrink-0 flex items-center px-5 border-r border-[#f0f0f0] dark:border-[#272a34]">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Orange IS Badge Icon */}
            <div className="w-7 h-7 shrink-0 rounded-lg bg-[#ff5e1f] flex items-center justify-center text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-transform group-hover:scale-105">
              IS
            </div>
            <span className="font-sans text-sm font-bold tracking-tight text-[#262626] dark:text-white">
              impro.std
            </span>
          </Link>
        </div>

        {/* Right Section: Page Section Title (next to divider) + Tools & Actions */}
        <div className="flex-1 h-full flex items-center justify-between px-4 md:px-6">
          {/* Page Section Label next to vertical divider (Matching Sidebar Icon) */}
          <div className="flex items-center gap-2">
            {pathname === '/' ? <LayoutDashboard className="w-4 h-4 text-[#ff5e1f]" /> : null}
            {pathname === '/production' ? <Files className="w-4 h-4 text-[#ff5e1f]" /> : null}
            {pathname === '/account-team' ? <Users className="w-4 h-4 text-[#ff5e1f]" /> : null}
            {pathname === '/rate-card' ? <CreditCard className="w-4 h-4 text-[#ff5e1f]" /> : null}
            {pathname === '/billing-statement' ? <FileText className="w-4 h-4 text-[#ff5e1f]" /> : null}
            {pathname === '/knowledge-graph' ? <Network className="w-4 h-4 text-[#ff5e1f]" /> : null}
            {pathname === '/notion-config' ? <Settings className="w-4 h-4 text-[#ff5e1f]" /> : null}
            {!['/', '/production', '/account-team', '/rate-card', '/billing-statement', '/knowledge-graph', '/notion-config'].includes(pathname) ? (
              <LayoutDashboard className="w-4 h-4 text-[#ff5e1f]" />
            ) : null}
            <span className="font-sans text-sm font-semibold tracking-wide text-[#262626] dark:text-white">
              {badgeLabel}
            </span>
          </div>

          {/* Tools & Actions (Search, Theme Toggle, PeriodPicker Dropdown) */}
          <div className="flex items-center gap-3">
            {/* Search Trigger Input */}
            <button className="hidden sm:flex items-center gap-3 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-3 py-1.5 text-xs text-gray-400 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer">
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d0e12] px-1.5 py-0.5 font-sans font-semibold text-[10px] text-gray-500 dark:text-gray-400">
                ⌘ K
              </kbd>
            </button>

            {/* Quick Theme Toggle Icon Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center p-2 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 dark:text-gray-400 hover:text-[#ff5e1f] dark:hover:text-[#ff5e1f] transition-colors cursor-pointer"
              aria-label="Toggle Theme"
            >
              {mounted ? (
                isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
              ) : (
                <div className="h-4 w-4" />
              )}
            </button>

            {/* Period Picker Dropdown, Custom Right Action, or Custom Action Button */}
            {periods && periods.length > 0 ? (
              <Suspense fallback={<div className="w-[120px] h-[34px] bg-gray-100 dark:bg-[#16181d] rounded-lg animate-pulse" />}>
                <PeriodPicker periods={periods} currentPeriod={currentPeriod || ''} />
              </Suspense>
            ) : rightAction ? (
              rightAction
            ) : actionButton ? (
              actionButton.href ? (
                <Link
                  href={actionButton.href}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5e1f] hover:bg-[#ff7038] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{actionButton.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={actionButton.onClick}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5e1f] hover:bg-[#ff7038] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{actionButton.label}</span>
                </button>
              )
            ) : null}

            {/* Vertical Separator Divider */}
            <div className="w-px h-4 bg-[#f0f0f0] dark:bg-[#272a34] shrink-0 mx-0.5" />

            {/* User Login & Account Management Switcher (Position: Far Right) */}
            <AccountSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}

// Backward compatibility alias
export const CloudflareTopBar = TopBar;
