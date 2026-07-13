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
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import SyncButton from './SyncButton';

interface SidebarProps {
  currentSyncLog: any;
}

export default function Sidebar({ currentSyncLog }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/', active: pathname === '/' },
    { name: 'Production', icon: Files, href: '#', active: false },
    { name: 'Account & Team', icon: Users, href: '/account-team', active: pathname === '/account-team' },
    { name: 'Rate Card', icon: CreditCard, href: '/rate-card', active: pathname === '/rate-card' },
    { name: 'Billing Statement', icon: FileText, href: '/billing-statement', active: pathname === '/billing-statement' },
    { name: 'Analytics & Reports', icon: BarChart3, href: '#', active: false },
    { name: 'Notion Config', icon: Settings, href: '/notion-config', active: pathname === '/notion-config' },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-[72px] px-3' : 'w-64 px-6'} sticky top-0 h-screen bg-white dark:bg-[#111827] border-r border-[#E8E0D8] dark:border-gray-800 py-6 flex flex-col justify-between shrink-0 transition-all duration-300 relative group z-50`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 w-6 h-6 bg-white dark:bg-gray-800 border border-[#E8E0D8] dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-50"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
      
      <div className="space-y-8">
        {/* Brand Header */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/20 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
            CF
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-display font-bold text-base leading-none text-gray-900 dark:text-white whitespace-nowrap">
                CAN-Freelance
              </h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                Report and Payroll
              </p>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="space-y-6 flex-1 pb-4">
          <nav className="space-y-1.5">
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              const isSeparator = item.name === 'Production';

              let content;
              if (item.active) {
                content = (
                  <Link
                    href={item.href}
                    className={`relative flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-semibold text-sm transition-all border border-indigo-100 dark:border-indigo-900/30 group/item`}
                  >
                    <Icon className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-4 py-2.5 bg-white dark:bg-[#1f2937] text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all whitespace-nowrap z-[100] shadow-xl border border-gray-100 dark:border-gray-800 pointer-events-none flex items-center">
                        {item.name}
                      </div>
                    )}
                  </Link>
                );
              } else if (item.href === '#') {
                content = (
                  <div
                    className={`relative flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl text-gray-400 dark:text-gray-500 font-medium text-sm transition-all opacity-60 cursor-not-allowed group/item`}
                  >
                    <Icon className="w-5 h-5 shrink-0 text-gray-400 dark:text-gray-500 group-hover/item:text-gray-500 dark:group-hover/item:text-gray-400 transition-colors" />
                    {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-4 py-2.5 bg-white dark:bg-[#1f2937] text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all whitespace-nowrap z-[100] shadow-xl border border-gray-100 dark:border-gray-800 pointer-events-none flex items-center">
                        {item.name}
                      </div>
                    )}
                  </div>
                );
              } else {
                content = (
                  <Link
                    href={item.href}
                    className={`relative flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-gray-800/50 font-medium text-sm transition-all group/item`}
                  >
                    <Icon className="w-5 h-5 shrink-0 text-gray-400 group-hover/item:text-indigo-600 dark:text-gray-500 dark:group-hover/item:text-indigo-400 transition-colors" />
                    {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-4 py-2.5 bg-white dark:bg-[#1f2937] text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all whitespace-nowrap z-[100] shadow-xl border border-gray-100 dark:border-gray-800 pointer-events-none flex items-center">
                        {item.name}
                      </div>
                    )}
                  </Link>
                );
              }

              return (
                <div key={idx}>
                  {isSeparator && (
                    <div className="pt-4 pb-2 px-1 flex justify-center">
                      {isCollapsed ? (
                        <span className="text-gray-300 dark:text-gray-700 font-bold">---</span>
                      ) : (
                        <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-600 uppercase w-full">
                          BISNIS SAYA
                        </span>
                      )}
                    </div>
                  )}
                  {content}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sync Button & Status Info */}
      <SyncButton initialSyncLog={currentSyncLog} isCollapsed={isCollapsed} />
    </aside>
  );
}
