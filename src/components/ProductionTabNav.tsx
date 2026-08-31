'use client';

import { LayoutDashboard, Kanban, AlertCircle } from 'lucide-react';

export type ProductionTab = 'overview' | 'kanban' | 'parameterIssue';

interface Props {
  activeTab: ProductionTab;
  onTabChange: (tab: ProductionTab) => void;
  issueCount: number;
}

export default function ProductionTabNav({ activeTab, onTabChange, issueCount }: Props) {
  const tabs: {
    id: ProductionTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'kanban', label: 'Kanban Board', icon: Kanban },
    { id: 'parameterIssue', label: 'Parameter Issue', icon: AlertCircle, count: issueCount },
  ];

  return (
    <div className="sticky top-[56px] z-40 flex items-stretch overflow-x-auto border-b border-[#f0f0f0] dark:border-[#272a34] bg-[#f8f9fa] dark:bg-[#0d0e12] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm transition-all duration-150 cursor-pointer whitespace-nowrap border-r border-[#f0f0f0] dark:border-[#272a34] ${
              isActive
                ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold'
                : 'bg-[#f8f9fa] dark:bg-[#0d0e12] text-gray-600 dark:text-gray-400 font-medium hover:bg-[#f0f1f3] dark:hover:bg-[#16181d]/50 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#ff5e1f]' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>{t.label}</span>
            {t.count !== undefined && t.count > 0 && (
              <span
                className={`ml-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-mono font-bold ${
                  isActive
                    ? 'bg-[#ff5e1f]/10 text-[#ff5e1f]'
                    : 'bg-gray-200/60 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {t.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
