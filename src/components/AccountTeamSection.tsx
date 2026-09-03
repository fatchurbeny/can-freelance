'use client';

import { useState, useRef, useEffect } from 'react';
import { Users, Building2, Search, Trophy, CircleDot, Award } from 'lucide-react';
import DesignerTableBody from './DesignerTableBody';
import AccountDetailSlideModal, { AccountItem } from './AccountDetailSlideModal';
import { DesignerItem } from './DesignerDetailSlideModal';
import AddTeamAccountButton from './AddTeamAccountButton';
import DesignerStatusFilterDropdown from './DesignerStatusFilterDropdown';
import DesignerSpecializationFilterDropdown from './DesignerSpecializationFilterDropdown';

interface Props {
  designers: DesignerItem[];
  accounts: AccountItem[];
}

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

function getBrandColor(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes('antler')) return 'text-[#fae48c]';
  if (normalized.includes('zahra')) return 'text-[#3ecf8e]';
  if (normalized.includes('chital')) return 'text-[#ec4899]';
  if (normalized.includes('ui creative') || normalized.includes('uicreative')) return 'text-[#6646b1]';
  if (normalized.includes('teman siswa') || normalized.includes('temansiswa')) return 'text-white';
  if (normalized.includes('improstd')) return 'text-[#f0a848]';
  return 'text-pink-500 dark:text-[#ec4899]';
}

export default function AccountTeamSection({ designers, accounts }: Props) {
  const [activeTab, setActiveTab] = useState<'designer' | 'account'>('designer');
  
  // Search & Filter state for Designers
  const [designerSearch, setDesignerSearch] = useState('');
  const [designerStatusFilter, setDesignerStatusFilter] = useState<string>('ALL');
  const [designerSpecializationFilter, setDesignerSpecializationFilter] = useState<string>('ALL');

  // Search state for Accounts
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<AccountItem | null>(null);

  // Dynamic width measurement to align search cell width with combined tabs width (Designer + Brand)
  const tabsWrapperRef = useRef<HTMLDivElement>(null);
  const [tabsCombinedWidth, setTabsCombinedWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!tabsWrapperRef.current) return;
    const updateWidth = () => {
      if (tabsWrapperRef.current) {
        setTabsCombinedWidth(tabsWrapperRef.current.getBoundingClientRect().width);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(tabsWrapperRef.current);
    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [designers.length, accounts.length]);

  // Extract all available specializations for filter dropdown options
  const allSpecializations = Array.from(
    new Set(designers.flatMap((d: any) => d.specializations || []))
  );

  // Filter Designers
  const filteredDesigners = designers.filter((d: any) => {
    const matchesSearch = d.displayName.toLowerCase().includes(designerSearch.toLowerCase()) ||
      (d.role || '').toLowerCase().includes(designerSearch.toLowerCase());
    const matchesStatus = designerStatusFilter === 'ALL' || d.status === designerStatusFilter;
    const matchesSpecialization = designerSpecializationFilter === 'ALL' ||
      (d.specializations && d.specializations.includes(designerSpecializationFilter));
    return matchesSearch && matchesStatus && matchesSpecialization;
  });

  // Filter Accounts
  const filteredAccounts = accounts.filter((a) =>
    a.displayName.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const topDesigner = designers.length > 0 ? designers[0] : null;

  return (
    <div className="flex flex-col divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">

      {/* Sub-Navigation Bar Terpisah (100% Persis Refrensi ProductionTabNav / Image 3) */}
      <div className="flex items-stretch overflow-x-auto border-b border-[#f0f0f0] dark:border-[#272a34] bg-[#f8f9fa] dark:bg-[#0d0e12] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Tabs Wrapper: Combined Width of Designer + Brand Tabs */}
        <div ref={tabsWrapperRef} className="flex items-stretch shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('designer')}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-sans transition-all duration-150 cursor-pointer whitespace-nowrap border-r border-[#f0f0f0] dark:border-[#272a34] ${
              activeTab === 'designer'
                ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold'
                : 'bg-[#f8f9fa] dark:bg-[#0d0e12] text-gray-600 dark:text-gray-400 font-medium hover:bg-[#f0f1f3] dark:hover:bg-[#16181d]/50 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Users className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'designer' ? 'text-[#ff5e1f]' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>Designer Team ({designers.length})</span>
            {activeTab === 'designer' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-sans transition-all duration-150 cursor-pointer whitespace-nowrap border-r border-[#f0f0f0] dark:border-[#272a34] ${
              activeTab === 'account'
                ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold'
                : 'bg-[#f8f9fa] dark:bg-[#0d0e12] text-gray-600 dark:text-gray-400 font-medium hover:bg-[#f0f1f3] dark:hover:bg-[#16181d]/50 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Building2 className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'account' ? 'text-[#ff5e1f]' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>Canva Accounts / Brands ({accounts.length})</span>
            {activeTab === 'account' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
            )}
          </button>
        </div>

        {/* Far Right Action Button (Persis Refrensi Image 3) */}
        <AddTeamAccountButton className="ml-auto flex items-center gap-1.5 px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer whitespace-nowrap border-l border-[#f0f0f0] dark:border-[#272a34] bg-[#ff5e1f] text-white hover:bg-[#ff7038]" />
      </div>

      {/* TAB 1: DESIGNER TEAM FULL-WIDTH */}
      {activeTab === 'designer' && (
        <div className="flex flex-col divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          {/* Continuous Flat Search & Sorting Toolbar Header Row */}
          <div className="flex flex-col sm:flex-row items-stretch justify-between border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] min-h-[44px]">
            {/* Left: Integrated Flat Search Input + Filter Sorting Chips */}
            <div className="flex flex-1 items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] min-w-0">
              {/* Flat Search Cell dynamically aligned with combined width of Tab 1 + Tab 2 */}
              <div
                style={tabsCombinedWidth ? { width: `${tabsCombinedWidth}px` } : undefined}
                className="relative w-full sm:w-auto shrink-0 flex items-center px-3.5 min-h-[44px]"
              >
                <Search className="w-4 h-4 text-gray-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  value={designerSearch}
                  onChange={(e) => setDesignerSearch(e.target.value)}
                  placeholder="Cari desainer atau jabatan..."
                  className="w-full bg-transparent font-sans text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                />
                {designerSearch && (
                  <button
                    type="button"
                    onClick={() => setDesignerSearch('')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Specialization Filter Dropdown */}
              <DesignerSpecializationFilterDropdown
                options={allSpecializations}
                value={designerSpecializationFilter}
                onChange={setDesignerSpecializationFilter}
              />

              {/* Status Filter Dropdown (Matches Cloudflare Sort/Filter Dropdown Style) */}
              <DesignerStatusFilterDropdown
                value={designerStatusFilter}
                onChange={setDesignerStatusFilter}
              />
            </div>

            {/* Right: Leaderboard Label Tag (Non-Table Label Tag as requested) */}
            {topDesigner && (
              <div className="px-4 flex items-center shrink-0 min-h-[44px]">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-sans font-bold border border-amber-500/20">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>LEADERBOARD #1: {topDesigner.displayName}</span>
                </span>
              </div>
            )}
          </div>

          {/* Full-Width Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12] text-[11px] font-sans font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  <th className="pl-5 pr-3 py-3 font-semibold">NAME / ROLE</th>
                  <th className="px-3 py-3 text-center font-semibold">CONTRACT</th>
                  <th className="px-3 py-3 text-left font-semibold w-[220px] min-w-[180px]">SPECIALIZATION</th>
                  <th className="px-3 py-3 text-center font-semibold w-[130px]">STATUS</th>
                  <th className="px-2 py-3 text-center font-semibold">APPROVED TASKS</th>
                  <th className="px-2 py-3 text-center font-semibold">TEMPLATES QTY</th>
                  <th className="px-2 py-3 text-center font-semibold">TOTAL PAGES</th>
                  <th className="p-0 text-center font-semibold w-[120px] h-full align-stretch">
                    <div className="w-full h-full min-h-[44px] border-l border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center">
                      ACTION
                    </div>
                  </th>
                </tr>
              </thead>
              <DesignerTableBody
                designers={filteredDesigners.map((d, i) => ({
                  ...d,
                  isLeaderboardWinner: i === 0 && d.status === 'Active',
                }))}
              />
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CANVA ACCOUNTS (BRANDS) FULL-WIDTH */}
      {activeTab === 'account' && (
        <div className="flex flex-col divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          {/* Continuous Flat Search Toolbar Header Row for Accounts */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] min-h-[44px]">
            <div className="relative flex-1 max-w-md flex items-center px-3.5 py-2">
              <Search className="w-4 h-4 text-gray-400 shrink-0 mr-2.5" />
              <input
                type="text"
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                placeholder="Cari nama Canva Account / Brand..."
                className="w-full bg-transparent font-sans text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
              />
              {accountSearch && (
                <button
                  type="button"
                  onClick={() => setAccountSearch('')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="px-4 py-2.5 flex items-center shrink-0 text-xs font-sans font-medium text-gray-500 dark:text-gray-400">
              Total <strong className="font-bold text-gray-900 dark:text-white mx-1">{filteredAccounts.length}</strong> Canva Accounts
            </div>
          </div>

          {/* Full-Width Accounts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12] text-[11px] font-sans font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  <th className="pl-5 pr-3 py-3 font-semibold">BRAND ACCOUNT</th>
                  <th className="px-3 py-3 text-center font-semibold">DOCTYPES HANDLED</th>
                  <th className="px-3 py-3 text-center font-semibold">TEMPLATES QTY</th>
                  <th className="pr-5 pl-3 py-3 text-center font-semibold">TOTAL PAGES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
                {filteredAccounts.map((a) => {
                  const initials = getInitials(a.displayName);
                  const colorClass = getBrandColor(a.displayName);

                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAccount(a)}
                      className="hover:bg-gray-50/80 dark:hover:bg-[#16181d] transition-colors cursor-pointer group"
                    >
                      <td className="pl-5 pr-3 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full border border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-sm"
                            style={{ backgroundColor: a.color || '#F97316' }}
                          >
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`font-bold truncate group-hover:text-[#ff5e1f] transition-colors ${colorClass}`}>
                              {a.displayName}
                            </span>
                            <span className="text-[10px] text-gray-400 font-sans truncate">
                              {a.notionKey || 'Canva Account'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-gray-900 dark:text-white">
                        {a.doctypes || 0}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-amber-600 dark:text-amber-400">
                        {a.templates || 0}
                      </td>
                      <td className="pr-5 pl-3 py-3 text-center font-bold text-blue-600 dark:text-blue-400">
                        {a.pages || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Detail Slide Drawer */}
      <AccountDetailSlideModal
        open={!!selectedAccount}
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
      />

    </div>
  );
}
