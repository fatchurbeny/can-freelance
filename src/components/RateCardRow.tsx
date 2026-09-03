'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import DoctypeSlideModal, { DoctypeItem } from './DoctypeSlideModal';

interface RateCardRowProps {
  doctype: DoctypeItem;
  contractRate: number;
}

export default function RateCardRow({ doctype, contractRate }: RateCardRowProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const poolRate = doctype.poolRate ?? 1.0;
  const pages = doctype.pages ?? 1.0;
  const estPayout = poolRate * pages * contractRate;
  const isActive = doctype.isActive ?? true;

  return (
    <>
      <tr
        onClick={() => setIsDetailOpen(true)}
        className="hover:bg-gray-50/80 dark:hover:bg-[#16181d] transition-colors font-sans text-xs border-b border-[#f0f0f0] dark:border-[#272a34] cursor-pointer group select-none"
      >
        {/* Column 1: Doctype Name & Notion Key */}
        <td className="pl-5 pr-4 py-3 font-sans w-[240px]">
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-gray-900 dark:text-white truncate group-hover:text-[#ff5e1f] transition-colors">
              {doctype.displayName || doctype.notionKey}
            </span>
            <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 truncate">
              {doctype.notionKey}
            </span>
          </div>
        </td>

        {/* Column 2: Kategori */}
        <td className="px-4 py-3 text-center w-[130px] whitespace-nowrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-sans font-medium bg-gray-100 dark:bg-[#20232b] text-gray-700 dark:text-gray-300">
            {doctype.category || 'Infografis'}
          </span>
        </td>

        {/* Column 3: Canvas & Aspect Ratio */}
        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 w-[140px] whitespace-nowrap">
          <div className="flex flex-col items-center">
            <span className="font-sans font-semibold text-gray-800 dark:text-gray-200">
              {doctype.dimensions || '1920×1080 px'}
            </span>
            <span className="text-[10px] font-sans text-gray-400">
              {doctype.aspectRatio || '16:9'}
            </span>
          </div>
        </td>

        {/* Column 4: Pool Score */}
        <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400 w-[110px] whitespace-nowrap">
          {poolRate}x
        </td>

        {/* Column 5: Default Pages */}
        <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100 w-[110px] whitespace-nowrap">
          {pages} hal
        </td>

        {/* Column 6: Est. Payout */}
        <td className="px-4 py-3 text-center font-bold font-sans text-emerald-600 dark:text-emerald-400 w-[140px] whitespace-nowrap">
          Rp {estPayout.toLocaleString('id-ID')}
        </td>

        {/* Column 7: Status */}
        <td className="px-4 py-3 text-center w-[110px] whitespace-nowrap">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
            }`}
          >
            {isActive ? 'Aktif' : 'Non-aktif'}
          </span>
        </td>

        {/* Column 8: Dedicated Action Trigger (Opens Slide-over Drawer Modal) */}
        <td className="p-0 text-center whitespace-nowrap w-[120px] h-full align-stretch border-l border-[#f0f0f0] dark:border-[#272a34]">
          <div className="w-full h-full min-h-[44px] bg-gray-50/30 dark:bg-[#16181d]/30 group-hover:bg-[#ff5e1f] text-gray-500 group-hover:text-white transition-colors flex items-center justify-center gap-1 font-sans text-xs font-bold uppercase tracking-wider">
            <span>EDIT</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </td>
      </tr>

      {/* Slide-over Detail & Edit Modal */}
      <DoctypeSlideModal
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        doctypeToEdit={doctype}
        contractRate={contractRate}
      />
    </>
  );
}
