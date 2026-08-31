'use client';

import React, { useState } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  codeSnippet?: string;
  actions?: {
    label: string;
    isPrimary?: boolean;
    onClick?: () => void;
  }[];
  content?: React.ReactNode;
}

interface CloudflareTabPanelProps {
  tabs: TabItem[];
  defaultTabId?: string;
  className?: string;
}

export default function CloudflareTabPanel({
  tabs,
  defaultTabId,
  className = '',
}: CloudflareTabPanelProps) {
  const [activeTabId, setActiveTabId] = useState<string>(
    defaultTabId || (tabs[0]?.id ?? '')
  );
  const [copied, setCopied] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!tabs || tabs.length === 0) return null;

  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] shadow-sm ${className}`}
    >
      {/* Horizontal Tab Navigation Bar (Image 1 style) */}
      <div className="flex items-stretch overflow-x-auto border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all duration-150 cursor-pointer whitespace-nowrap border-r border-[#f0f0f0] dark:border-[#272a34] ${
                isActive
                  ? 'bg-white dark:bg-[#16181d] text-[#262626] dark:text-white font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-[#16181d]/50'
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-mono bg-orange-500/10 text-[#ff5e1f]">
                  {tab.badge}
                </span>
              )}
              {/* Bottom active orange line indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panel Content Box */}
      {activeTab && (
        <div className="p-6 bg-white dark:bg-[#16181d] transition-all duration-200">
          {activeTab.content ? (
            activeTab.content
          ) : (
            <div className="space-y-4">
              {/* Icon & Title */}
              {(activeTab.icon || activeTab.title) && (
                <div className="flex items-center gap-3">
                  {activeTab.icon && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
                      {activeTab.icon}
                    </div>
                  )}
                  {activeTab.title && (
                    <h3 className="text-base md:text-lg font-medium text-[#262626] dark:text-white">
                      {activeTab.title}
                    </h3>
                  )}
                </div>
              )}

              {/* Description */}
              {activeTab.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  {activeTab.description}
                </p>
              )}

              {/* Code Snippet Box */}
              {activeTab.codeSnippet && (
                <div className="relative flex items-center justify-between rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#0d0e12] px-4 py-3 font-mono text-sm text-gray-800 dark:text-gray-200">
                  <span className="overflow-x-auto pr-8">
                    {activeTab.codeSnippet}
                  </span>
                  <button
                    onClick={() => handleCopy(activeTab.codeSnippet!)}
                    className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              {activeTab.actions && activeTab.actions.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {activeTab.actions.map((act, i) => (
                    <button
                      key={i}
                      onClick={act.onClick}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                        act.isPrimary
                          ? 'rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0d0e12] px-4 py-2 text-gray-800 dark:text-gray-200 hover:border-[#ff5e1f] hover:text-[#ff5e1f] dark:hover:border-[#ff5e1f] dark:hover:text-[#ff5e1f] shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1'
                      }`}
                    >
                      {act.label}
                      {act.isPrimary && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
