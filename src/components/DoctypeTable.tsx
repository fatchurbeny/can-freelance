'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import RateCardRow from './RateCardRow';
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white">
          Doctype list
        </h3>
        <AddDoctypeButton />
      </div>

      <div className="glass overflow-hidden rounded-xl border border-[#E8E0D8] shadow-sm dark:border-gray-800 dark:bg-[#111827]">
        {/* Search + Count bar */}
        <div className="flex items-center gap-3 p-4 border-b border-[#E8E0D8] dark:border-gray-800">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctype..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {filteredDoctypes.length} Doctype Produced
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full border-collapse text-left">
            <thead className="bg-gray-50 text-sm font-medium text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Doctype</th>
                <th className="whitespace-nowrap px-4 py-3 text-center">rate/pool</th>
                <th className="whitespace-nowrap px-4 py-3 text-center">Pool Rate</th>
                <th className="whitespace-nowrap px-4 py-3 text-center">Pages</th>
                <th className="whitespace-nowrap px-4 py-3 text-center">Last Update</th>
                <th className="whitespace-nowrap px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D8] dark:divide-gray-800">
              {filteredDoctypes.map((doctype) => (
                <RateCardRow key={doctype.id} doctype={doctype} contractRate={contractRate} />
              ))}
              {filteredDoctypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
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
    </div>
  );
}
