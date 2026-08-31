'use client';

import React, { useState } from 'react';
import { ArrowRight, Copy, Check, Sparkles } from 'lucide-react';

interface CloudflareHeroHeaderProps {
  title?: string;
  subtitle?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  onPrimaryCtaClick?: () => void;
  sectionTitle?: string;
}

export default function CloudflareHeroHeader({
  title = 'Cloudflare Developer Docs',
  subtitle = 'Explore guides and tutorials to start building on Cloudflare\'s platform',
  primaryCtaText = 'Get started',
  secondaryCtaText = 'Copy prompt',
  onPrimaryCtaClick,
  sectionTitle = 'Powerful primitives, seamlessly integrated',
}: CloudflareHeroHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText('npx wrangler d1 create my-database');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full pt-4 pb-6 space-y-6">
      {/* Big Hero Title & Description */}
      <div className="space-y-3 max-w-4xl">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#262626] dark:text-white leading-tight">
          {title}
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 font-normal max-w-2xl leading-relaxed">
          {subtitle}
        </p>

        {/* Hero Pill Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-3">
          {/* Orange Primary Pill CTA */}
          <button
            onClick={onPrimaryCtaClick}
            className="inline-flex items-center gap-2 rounded-full bg-[#ff5e1f] hover:bg-[#ff7038] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 cursor-pointer"
          >
            <span>{primaryCtaText}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Dark Secondary Pill CTA */}
          <button
            onClick={handleCopyPrompt}
            className="inline-flex items-center gap-2 rounded-full border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] px-4 py-2.5 text-sm font-medium text-[#262626] dark:text-gray-200 hover:border-[#ff5e1f] dark:hover:border-[#ff5e1f] transition-all duration-150 cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-1 text-orange-500">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span>{copied ? 'Copied prompt!' : secondaryCtaText}</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Section Sub-Headline (matching screenshot) */}
      {sectionTitle && (
        <div className="pt-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#262626] dark:text-white tracking-tight">
            {sectionTitle}
          </h2>
        </div>
      )}
    </div>
  );
}
