'use client';

import { useState } from 'react';
import { Gavel, Calendar, Search } from 'lucide-react';
import RateCardRow from './RateCardRow';
import ContractRateEditor from './ContractRateEditor';
import AddDoctypeButton from './AddDoctypeButton';

interface Doctype {
  id: string;
  notionKey: string;
  displayName: string;
  poolRate: number;
  pages: number | null;
  updatedAt: Date;
}

interface Props {
  doctypes: Doctype[];
  contractRate: number;
}

export default function DoctypeTable({ doctypes, contractRate }: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDoctypes = doctypes.filter((d) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return d.displayName?.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col bg-white dark:bg-[#0d0e12] rounded-none">
      {/* Sticky Header Group: Row 1 (Banner) + Row 2 (Search Bar) + Row 3 (Table Header) */}
      <div className="sticky top-[56px] z-30 bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-sm">
        {/* Row 1: Contract Rules Banner Header (Full-Height Symmetrical Table Style) */}
        <div className="flex flex-col md:flex-row items-stretch justify-between bg-gray-50/50 dark:bg-[#0d0e12]">
          {/* Left Title Cell */}
          <div className="flex items-center gap-3 p-4 sm:p-5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 flex items-center justify-center shrink-0">
              <Gavel className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-sm text-gray-900 dark:text-white capitalize truncate">
                Ketentuan & Aturan Kontrak Freelance
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate">
                Kontrak dimulai sejak 26 Januari 2026
              </p>
            </div>
          </div>

          {/* Right Full-Height Table Cells */}
          <div className="flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-t md:border-t-0 md:border-l border-[#f0f0f0] dark:border-[#272a34] shrink-0 font-mono text-xs">
            {/* Cell 1: Kalender */}
            <div className="flex items-center gap-2.5 px-5 sm:px-6 py-4 bg-white dark:bg-[#0d0e12] text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4 text-[#ff5e1f] shrink-0" />
              <span className="whitespace-nowrap">Kalender: <strong className="font-bold text-gray-900 dark:text-white">25 Hari Kerja/Bulan</strong></span>
            </div>

            {/* Cell 2: Rate/Pool Editor Button */}
            <ContractRateEditor initialRate={contractRate ?? 15000} />

            {/* Cell 3: Add Doctype Button */}
            <AddDoctypeButton className="flex items-center gap-2 px-5 sm:px-6 py-4 bg-[#ff5e1f] hover:bg-[#ff7038] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap" />
          </div>
        </div>

        {/* Row 2: Search & Count Flat Toolbar */}
        <div className="h-10 px-3.5 flex items-center justify-between bg-white dark:bg-[#0d0e12]">
          <div className="relative flex-1 max-w-[280px] flex items-center">
            <Search className="absolute left-1 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctype..."
              className="w-full pl-7 pr-3 py-1 bg-transparent text-xs font-mono text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none border-none"
            />
          </div>
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {filteredDoctypes.length} Doctype Produced
          </span>
        </div>

        {/* Row 3: Table Header */}
        <div className="overflow-x-auto bg-gray-50/80 dark:bg-[#0d0e12]">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] text-[11px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <th className="pl-5 pr-4 py-3 font-semibold w-[260px]">DOCTYPE</th>
                <th className="px-4 py-3 text-center font-semibold w-[180px] whitespace-nowrap">RATE/POOL</th>
                <th className="px-4 py-3 text-center font-semibold w-[140px] whitespace-nowrap">POOL RATE</th>
                <th className="px-4 py-3 text-center font-semibold w-[120px] whitespace-nowrap">PAGES</th>
                <th className="px-4 py-3 text-center font-semibold w-[200px] whitespace-nowrap">LAST UPDATE</th>
                <th className="pr-5 pl-4 py-3 text-center font-semibold w-[180px] whitespace-nowrap">ACTION</th>
              </tr>
            </thead>
          </table>
        </div>
      </div>

      {/* Table Body (Scrolls smoothly under sticky header group) */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
            {filteredDoctypes.map((doctype) => (
              <RateCardRow key={doctype.id} doctype={doctype} contractRate={contractRate} />
            ))}
            {filteredDoctypes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs font-mono text-gray-400 dark:text-gray-500">
                  {searchQuery
                    ? 'Tidak ada doctype yang sesuai dengan pencarian.'
                    : 'Belum ada doctype yang tersedia. Silakan sync dengan Notion terlebih dahulu.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
