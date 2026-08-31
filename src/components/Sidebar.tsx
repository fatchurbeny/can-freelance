"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Files, 
  Users, 
  CreditCard, 
  FileText, 
  Network,
  Settings,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import SyncButton from './SyncButton';

interface SidebarProps {
  currentSyncLog: any;
}

interface MenuItem {
  name: string;
  icon: any;
  href: string;
  active: boolean;
  group: string;
}

export default function Sidebar({ currentSyncLog }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems: MenuItem[] = [
    { name: 'Overview', icon: LayoutDashboard, href: '/', active: pathname === '/', group: 'GET STARTED' },
    { name: 'Production', icon: Files, href: '/production', active: pathname === '/production', group: 'GET STARTED' },
    { name: 'Account & Team', icon: Users, href: '/account-team', active: pathname === '/account-team', group: 'BUILD' },
    { name: 'Rate Card', icon: CreditCard, href: '/rate-card', active: pathname === '/rate-card', group: 'BUILD' },
    { name: 'Billing Statement', icon: FileText, href: '/billing-statement', active: pathname === '/billing-statement', group: 'BUILD' },
    { name: 'Knowledge Graph', icon: Network, href: '/knowledge-graph', active: pathname === '/knowledge-graph', group: 'MANAGE & OBSERVE' },
    { name: 'Notion Config', icon: Settings, href: '/notion-config', active: pathname === '/notion-config', group: 'MANAGE & OBSERVE' },
  ];

  // Group items by category
  const groups = Array.from(new Set(menuItems.map((i) => i.group)));

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-[#16181d] border-b border-[#f0f0f0] dark:border-[#272a34] sticky top-0 z-40 w-full shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-[#ff5e1f] hover:bg-gray-50 dark:hover:bg-[#1e2028] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-display font-bold text-base text-[#262626] dark:text-white">
            CAN-Freelance
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#ff5e1f] flex items-center justify-center text-white font-bold text-sm">
          CF
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer — Fixed w-56 on desktop below top bar */}
      <aside className={`
        fixed top-14 left-0 bottom-0 z-40 h-[calc(100vh-56px)] bg-white dark:bg-[#0d0e12] 
        border-r border-[#f0f0f0] dark:border-[#272a34] py-4 px-4 flex flex-col 
        justify-between transition-transform duration-300 w-56
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="space-y-4 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Mobile Header / Close Button */}
          <div className="flex md:hidden items-center justify-between px-2 pt-1 pb-1">
            <span className="font-display font-bold text-xs text-[#262626] dark:text-white uppercase tracking-wider">
              Navigation
            </span>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-[#ff5e1f] hover:bg-gray-100 dark:hover:bg-[#1e2028] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grouped Navigation Menu */}
          <nav className="space-y-5 pt-1">
            {groups.map((group) => {
              const groupItems = menuItems.filter((i) => i.group === group);
              if (groupItems.length === 0) return null;

              return (
                <div key={group} className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-mono font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                    {group}
                  </div>
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group cursor-pointer ${
                          item.active
                            ? 'bg-[#f0f0f0] dark:bg-[#16181d] text-[#262626] dark:text-white font-semibold border border-gray-200 dark:border-[#272a34]'
                            : 'text-gray-600 dark:text-gray-400 hover:text-[#262626] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#16181d]/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                            item.active ? 'text-[#ff5e1f]' : 'text-gray-400 dark:text-gray-500 group-hover:text-[#ff5e1f]'
                          }`} />
                          <span className="whitespace-nowrap">{item.name}</span>
                        </div>
                        {item.active && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e1f]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: Sync Button */}
        <div className="pt-3 border-t border-[#f0f0f0] dark:border-[#272a34]">
          <SyncButton initialSyncLog={currentSyncLog} isCollapsed={false} />
        </div>
      </aside>
    </>
  );
}
