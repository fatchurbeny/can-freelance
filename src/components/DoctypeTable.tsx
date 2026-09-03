'use client';

import { useState } from 'react';
import { Layers, FileText, Search, ShieldCheck, Sparkles, Calendar, DollarSign } from 'lucide-react';
import RateCardRow from './RateCardRow';
import AddDoctypeButton from './AddDoctypeButton';
import ContractRateEditor from './ContractRateEditor';
import { DoctypeItem } from './DoctypeSlideModal';

interface Props {
  doctypes: DoctypeItem[];
  contractRate: number;
}

export default function DoctypeTable({ doctypes, contractRate }: Props) {
  const [activeTab, setActiveTab] = useState<'doctype' | 'kontrak'>('doctype');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDoctypes = doctypes.filter((d) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      d.displayName?.toLowerCase().includes(q) ||
      d.notionKey?.toLowerCase().includes(q) ||
      d.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col bg-white dark:bg-[#0d0e12] rounded-none">
      {/* Sticky Container: Row 1 (Tab Nav Bar) + Row 2 (Search Bar) + Row 3 (Table Header) */}
      <div className="sticky top-[56px] z-30 bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-sm">
        {/* Row 1: Tab Navigation Bar (Image 1 Style with Far-Right Action Button) */}
        <div className="flex items-center justify-between bg-gray-50/50 dark:bg-[#0d0e12] font-sans text-xs">
          {/* Left Tabs */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('doctype')}
              className={`relative px-5 py-3 text-xs font-sans font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'doctype'
                  ? 'text-[#ff5e1f] bg-white dark:bg-[#0d0e12]'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Doctype ({doctypes.length})</span>
              {activeTab === 'doctype' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kontrak')}
              className={`relative px-5 py-3 text-xs font-sans font-bold transition-colors flex items-center gap-2 border-l border-[#f0f0f0] dark:border-[#272a34] cursor-pointer ${
                activeTab === 'kontrak'
                  ? 'text-[#ff5e1f] bg-white dark:bg-[#0d0e12]'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Kontrak</span>
              {activeTab === 'kontrak' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
              )}
            </button>
          </div>

          {/* Far-Right Action Button (Image 1 Far-Right Placement) */}
          <AddDoctypeButton
            contractRate={contractRate}
            className="ml-auto flex items-center gap-1.5 px-5 py-3 text-xs font-sans font-bold uppercase tracking-wider bg-[#ff5e1f] hover:bg-[#ff7038] text-white transition-colors cursor-pointer border-l border-[#f0f0f0] dark:border-[#272a34]"
          />
        </div>

        {/* Render Tab 1 Controls & Table Header */}
        {activeTab === 'doctype' ? (
          <>
            {/* Row 2: Search & Count Flat Toolbar */}
            <div className="h-10 px-3.5 flex items-center justify-between bg-white dark:bg-[#0d0e12]">
              <div className="relative flex-1 max-w-[320px] flex items-center">
                <Search className="absolute left-1 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by doctype or identifier..."
                  className="w-full pl-7 pr-3 py-1 bg-transparent text-xs font-sans text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none border-none"
                />
              </div>
              <span className="text-xs font-sans text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {filteredDoctypes.length} Doctype Produced
              </span>
            </div>

            {/* Row 3: Table Header (Structure matching Image 2 attributes) */}
            <div className="overflow-x-auto bg-gray-50/80 dark:bg-[#0d0e12]">
              <table className="w-full border-collapse text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] text-[11px] font-sans font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    <th className="pl-5 pr-4 py-3 font-semibold w-[240px]">DOCTYPE FORMAT</th>
                    <th className="px-4 py-3 text-center font-semibold w-[130px] whitespace-nowrap">KATEGORI</th>
                    <th className="px-4 py-3 text-center font-semibold w-[140px] whitespace-nowrap">CANVAS & RASIO</th>
                    <th className="px-4 py-3 text-center font-semibold w-[110px] whitespace-nowrap">POOL SCORE</th>
                    <th className="px-4 py-3 text-center font-semibold w-[110px] whitespace-nowrap">DEFAULT PAGES</th>
                    <th className="px-4 py-3 text-center font-semibold w-[140px] whitespace-nowrap">EST. PAYOUT</th>
                    <th className="px-4 py-3 text-center font-semibold w-[110px] whitespace-nowrap">STATUS</th>
                    <th className="px-4 py-3 text-center font-semibold w-[120px] whitespace-nowrap border-l border-[#f0f0f0] dark:border-[#272a34]">ACTION</th>
                  </tr>
                </thead>
              </table>
            </div>
          </>
        ) : null}
      </div>

      {/* Tab Contents */}
      {activeTab === 'doctype' ? (
        /* Table Body (Scrolls smoothly under sticky header container) */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-sans text-xs">
            <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
              {filteredDoctypes.map((doctype) => (
                <RateCardRow key={doctype.id} doctype={doctype} contractRate={contractRate} />
              ))}
              {filteredDoctypes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs font-sans text-gray-400 dark:text-gray-500">
                    {searchQuery
                      ? 'Tidak ada doctype yang sesuai dengan pencarian.'
                      : 'Belum ada doctype yang tersedia. Silakan sync dengan Notion atau tambah doctype baru.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        /* Tab 2: Kontrak Detailed View */
        <div className="p-6 md:p-8 space-y-6 bg-white dark:bg-[#0d0e12]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]">
            <div className="space-y-1">
              <h3 className="text-sm font-sans font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#ff5e1f]" />
                Ketentuan & Skema Kontrak Freelance
              </h3>
              <p className="text-xs font-sans text-gray-500 dark:text-gray-400">
                Kontrak berlaku mulai 26 Januari 2026 dengan skema bobot Pool Score & Payout per halaman template.
              </p>
            </div>
            <ContractRateEditor
              initialRate={contractRate}
              className="px-4 py-2 bg-[#ff5e1f] hover:bg-[#ff7038] text-white font-sans text-xs font-bold rounded-lg transition-colors cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] space-y-2">
              <div className="flex items-center gap-2 text-xs font-sans font-bold text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4 text-[#ff5e1f]" />
                <span>Standard Hari Kerja</span>
              </div>
              <p className="text-lg font-bold font-sans text-gray-900 dark:text-white">
                25 Hari Kerja / Bulan
              </p>
              <p className="text-[11px] font-sans text-gray-400">
                Dihitung dari hari operasional tim desainer freelance.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] space-y-2">
              <div className="flex items-center gap-2 text-xs font-sans font-bold text-gray-700 dark:text-gray-300">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Base Rate / Halaman</span>
              </div>
              <p className="text-lg font-bold font-sans text-emerald-600 dark:text-emerald-400">
                Rp {contractRate.toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] font-sans text-gray-400">
                Tarif dasar per slide/halaman sesuai konfigurasi kontrak.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] space-y-2">
              <div className="flex items-center gap-2 text-xs font-sans font-bold text-gray-700 dark:text-gray-300">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Rumus Payout Template</span>
              </div>
              <p className="text-xs font-sans font-bold text-blue-600 dark:text-blue-400">
                (PoolRate × Pages × Rate/Page)
              </p>
              <p className="text-[11px] font-sans text-gray-400">
                Contoh: 1.5x × 1 hal × Rp 15.000 = Rp 22.500 per template.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
