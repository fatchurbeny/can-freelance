'use client';

import { useState } from 'react';
import { Gavel, Calendar, Search } from 'lucide-react';
import RateCardRow from './RateCardRow';
import ContractRateEditor from './ContractRateEditor';

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
    <div className="flex flex-col bg-white dark:bg-[#0d0e12] rounded-xl">
      {/* Sticky Header Group: Row 1 (Banner) + Row 2 (Search Bar) + Table Header */}
      <div className="sticky top-[56px] z-30 bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] rounded-t-xl shadow-xs">
        {/* Row 1: Contract Rules Banner Header */}
        <div className="p-6 bg-white dark:bg-[#0d0e12] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ff5e1f]/10 text-[#ff5e1f] flex items-center justify-center shrink-0">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-gray-900 dark:text-white capitalize">
                Ketentuan & Aturan Kontrak Freelance
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                Kontrak dimulai sejak 26 Januari 2026
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-600 dark:text-gray-300">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>Kalender: <strong className="font-bold text-gray-900 dark:text-white">25 Hari Kerja/Bulan</strong></span>
            </div>
            <ContractRateEditor initialRate={contractRate ?? 15000} />
          </div>
        </div>

        {/* Row 2: Search & Count Bar */}
        <div className="p-4 flex items-center justify-between bg-white dark:bg-[#0d0e12]">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctype..."
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-xs font-mono text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#ff5e1f] transition-colors"
            />
          </div>
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {filteredDoctypes.length} Doctype Produced
          </span>
        </div>

        {/* Row 3: Table Header */}
        <div className="bg-gray-50/80 dark:bg-[#0d0e12] border-t border-b border-[#f0f0f0] dark:border-[#272a34]">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead>
              <tr className="text-[11px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <th className="pl-5 pr-4 py-3 font-semibold">DOCTYPE</th>
                <th className="px-4 py-3 text-center font-semibold">RATE/POOL</th>
                <th className="px-4 py-3 text-center font-semibold">POOL RATE</th>
                <th className="px-4 py-3 text-center font-semibold">PAGES</th>
                <th className="px-4 py-3 text-center font-semibold">LAST UPDATE</th>
                <th className="pr-5 pl-4 py-3 text-center font-semibold">ACTION</th>
              </tr>
            </thead>
          </table>
        </div>
      </div>

      {/* Table Body (Scrolls smoothly under sticky header group) */}
      <div className="overflow-x-auto rounded-b-xl">
        <table className="w-full border-collapse text-left font-mono text-xs rounded-b-xl">
          <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12] rounded-b-xl">
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
