'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface GridCardItem {
  id: string;
  date?: string;
  category?: string;
  title: string;
  description?: string;
  linkText?: string;
  onLinkClick?: () => void;
  isFeatured?: boolean;
  value?: string | number;
  subValue?: string;
}

interface CloudflareGridCardsProps {
  cards: GridCardItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export default function CloudflareGridCards({
  cards,
  columns = 3,
  className = '',
}: CloudflareGridCardsProps) {
  if (!cards || cards.length === 0) return null;

  const colClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] shadow-sm ${className}`}
    >
      <div className={`grid ${colClasses} gap-px bg-[#f0f0f0] dark:bg-[#272a34]`}>
        {cards.map((card) => (
          <div
            key={card.id}
            className={`flex flex-col justify-between p-6 transition-all duration-150 ${
              card.isFeatured
                ? 'bg-gradient-to-br from-orange-500/5 via-white to-white dark:from-orange-500/10 dark:via-[#16181d] dark:to-[#16181d] md:col-span-2'
                : 'bg-white dark:bg-[#16181d] hover:bg-gray-50/80 dark:hover:bg-[#1e2028]/80'
            }`}
          >
            <div>
              {/* Header Meta Row (Image 2 style) */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  {card.isFeatured && (
                    <span className="w-2 h-2 rounded-full bg-[#ff5e1f] animate-pulse" />
                  )}
                  {card.date && (
                    <span className="font-sans text-[11px] text-gray-500 dark:text-gray-400">
                      {card.date}
                    </span>
                  )}
                </div>

                {card.category && (
                  <span className="font-sans text-[11px] font-semibold text-[#ff5e1f] tracking-wider uppercase">
                    {card.category}
                  </span>
                )}
              </div>

              {/* Metric Value if present */}
              {card.value !== undefined && (
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="font-sans text-3xl font-bold text-[#262626] dark:text-white">
                    {card.value}
                  </span>
                  {card.subValue && (
                    <span className="text-xs font-sans text-gray-500 dark:text-gray-400">
                      {card.subValue}
                    </span>
                  )}
                </div>
              )}

              {/* Title */}
              <h3
                className={`font-medium text-[#262626] dark:text-white leading-snug mb-2 ${
                  card.isFeatured ? 'text-lg md:text-xl font-semibold' : 'text-base'
                }`}
              >
                {card.title}
              </h3>

              {/* Description */}
              {card.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                  {card.description}
                </p>
              )}
            </div>

            {/* Footer Link / Action */}
            {card.linkText && (
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-[#272a34]/60">
                <button
                  onClick={card.onLinkClick}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-[#ff5e1f] dark:hover:text-[#ff5e1f] transition-colors cursor-pointer group"
                >
                  <span>{card.linkText}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
