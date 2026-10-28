'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ContractDrawer from './ContractDrawer';
import { workingDaysInRange } from './DateRangePicker';
import { Layers, FileText, Search, ShieldCheck, Sparkles, Calendar, DollarSign } from 'lucide-react';
import RateCardRow from './RateCardRow';
import AddDoctypeButton from './AddDoctypeButton';
import ContractRateEditor from './ContractRateEditor';
import { DoctypeItem } from './DoctypeSlideModal';
import DoctypeToolbar, { DoctypeFilters, EMPTY_DOCTYPE_FILTERS, FilterGroup } from './DoctypeToolbar';
import type { SortKey } from './SortControl';
import { Pencil, Package, Plus } from 'lucide-react';
import BundleSlideModal, { BundleView, BundleUnitOption, BundleDoctypeOption } from './BundleSlideModal';

interface Props {
  doctypes: DoctypeItem[];
  contractRate: number;
  bundles?: BundleView[];
  bundleUnits?: BundleUnitOption[];
  bundleDoctypes?: BundleDoctypeOption[];
  platforms?: { id: string; name: string; slug: string; outputType: string; createdAt: string | Date; baseRate?: number | null; contractStartDate?: string | Date | null; contractEndDate?: string | Date | null }[];
  /** Tab awal (`/rate-card?tab=kontrak`). */
  initialTab?: 'doctype' | 'bundle' | 'kontrak';
  /** Buka drawer Kontrak Baru saat halaman dimuat (`&new=1`). */
  openNewContract?: boolean;
  /** Dibuka dari wizard production: setelah kontrak dibuat, kembali ke wizard. */
  returnToWizard?: boolean;
}

export default function DoctypeTable({ doctypes, contractRate, platforms = [], bundles = [], bundleUnits = [], bundleDoctypes = [], initialTab = 'doctype', openNewContract = false, returnToWizard = false }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'doctype' | 'bundle' | 'kontrak'>(initialTab);
  // Drawer kontrak: 'new' = Kontrak Baru, id platform = Edit Kontrak
  const [contractDrawer, setContractDrawer] = useState<'new' | string | null>(null);
  // Drawer (portal) dibuka setelah mount agar HTML server dan client sama
  useEffect(() => {
    if (openNewContract) setContractDrawer('new');
  }, [openNewContract]);
  const [searchQuery, setSearchQuery] = useState('');

  const [sortKey, setSortKey] = useState<SortKey>('lastEdited');
  const [filters, setFilters] = useState<DoctypeFilters>(EMPTY_DOCTYPE_FILTERS);

  const doctypeGroups: FilterGroup[] = [
    { key: 'platforms', label: 'Platform', options: Array.from(new Set(doctypes.map((d) => d.platform?.name).filter(Boolean) as string[])).sort() },
    { key: 'categories', label: 'Kategori', options: Array.from(new Set(doctypes.map((d) => d.category).filter(Boolean) as string[])).sort() },
    { key: 'usages', label: 'Kegunaan', options: ['Kontrak', 'Bundle', 'Keduanya'] },
    { key: 'statuses', label: 'Status', options: ['Active', 'Inactive'] },
  ];

  const [bQuery, setBQuery] = useState('');
  const [bSort, setBSort] = useState<SortKey>('lastEdited');
  const [bFilters, setBFilters] = useState<DoctypeFilters>(EMPTY_DOCTYPE_FILTERS);
  const [bundleModal, setBundleModal] = useState<{ open: boolean; bundle: BundleView | null }>({ open: false, bundle: null });
  const bundleGroups: FilterGroup[] = [{ key: 'statuses', label: 'Status', options: ['Active', 'Inactive'] }];
  const bundleRows = bundles
    .filter((b) => {
      const q = bQuery.toLowerCase();
      if (q && !b.name.toLowerCase().includes(q)) return false;
      if (bFilters.statuses?.length && !bFilters.statuses.includes(b.isActive ? 'Active' : 'Inactive')) return false;
      return true;
    })
    .sort((x, y) => {
      if (bSort === 'nameAsc') return x.name.localeCompare(y.name);
      if (bSort === 'nameDesc') return y.name.localeCompare(x.name);
      return new Date(y.updatedAt).getTime() - new Date(x.updatedAt).getTime();
    });
  const platformRates: Record<string, number> = Object.fromEntries(platforms.map((p) => [p.slug, p.baseRate ?? contractRate]));

  // Kontrak = satu baris per platform (tarif dasar masih global sampai Platform.baseRate ada)
  const [kQuery, setKQuery] = useState('');
  const [kSort, setKSort] = useState<SortKey>('lastEdited');
  const [kFilters, setKFilters] = useState<DoctypeFilters>(EMPTY_DOCTYPE_FILTERS);
  const outputLabel = (t: string) => (t === 'dropbox_link' ? 'Dropbox' : 'Canva Link');
  const contractGroups: FilterGroup[] = [
    { key: 'outputs', label: 'Output', options: Array.from(new Set(platforms.map((p) => outputLabel(p.outputType)))).sort() },
  ];
  const contractRows = platforms
    .filter((p) => {
      const q = kQuery.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) return false;
      if (kFilters.outputs?.length && !kFilters.outputs.includes(outputLabel(p.outputType))) return false;
      return true;
    })
    .sort((x, y) => {
      if (kSort === 'nameAsc') return x.name.localeCompare(y.name);
      if (kSort === 'nameDesc') return y.name.localeCompare(x.name);
      return new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
    });

  const filteredDoctypes = doctypes
    .filter((d) => {
      const q = searchQuery.toLowerCase();
      if (q && !(
        d.displayName?.toLowerCase().includes(q) ||
        d.notionKey?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q)
      )) return false;
      if (filters.platforms?.length && !filters.platforms.includes(d.platform?.name ?? '')) return false;
      if (filters.categories?.length && !filters.categories.includes(d.category ?? '')) return false;
      if (filters.usages?.length && !filters.usages.includes((d as { usage?: string }).usage ?? 'Kontrak')) return false;
      if (filters.statuses?.length && !filters.statuses.includes((d.isActive ?? true) ? 'Active' : 'Inactive')) return false;
      return true;
    })
    .sort((x, y) => {
      if (sortKey === 'nameAsc') return (x.displayName || '').localeCompare(y.displayName || '');
      if (sortKey === 'nameDesc') return (y.displayName || '').localeCompare(x.displayName || '');
      return new Date(y.updatedAt).getTime() - new Date(x.updatedAt).getTime();
    });

  return (
    <div className="flex flex-col bg-white dark:bg-[#0d0e12] rounded-none">
      {/* Sticky Container: Row 1 (Tab Nav Bar) + Row 2 (Search Bar) + Row 3 (Table Header) */}
      <div className="sticky top-[56px] z-30 bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-sm">
        {/* Row 1: Tab Navigation Bar (Image 1 Style with Far-Right Action Button) */}
        <div className="flex items-center justify-between bg-gray-50/50 dark:bg-[#0d0e12] font-sans text-sm">
          {/* Left Tabs */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('doctype')}
              className={`relative px-5 py-3 text-sm font-sans font-bold transition-colors flex items-center gap-2 cursor-pointer ${
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
              onClick={() => setActiveTab('bundle')}
              className={`relative px-5 py-3 text-sm font-sans font-bold transition-colors flex items-center gap-2 border-l border-[#f0f0f0] dark:border-[#272a34] cursor-pointer ${
                activeTab === 'bundle'
                  ? 'text-[#ff5e1f] bg-white dark:bg-[#0d0e12]'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Bundle ({bundles.length})</span>
              {activeTab === 'bundle' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kontrak')}
              className={`relative px-5 py-3 text-sm font-sans font-bold transition-colors flex items-center gap-2 border-l border-[#f0f0f0] dark:border-[#272a34] cursor-pointer ${
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

        </div>

        {/* Render Tab 1 Controls (Search Toolbar) */}
        {activeTab === 'doctype' ? (
          <DoctypeToolbar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            sortKey={sortKey}
            onSortChange={setSortKey}
            filters={filters}
            onFiltersChange={setFilters}
            groups={doctypeGroups}
            total={filteredDoctypes.length}
            action={
              <AddDoctypeButton
                contractRate={contractRate}
                className="flex items-center gap-1.5 px-5 h-full text-xs font-sans font-bold uppercase tracking-wider bg-[#ff5e1f] hover:bg-[#ff7038] text-white transition-colors cursor-pointer"
              />
            }
          />
        ) : activeTab === 'bundle' ? (
          <DoctypeToolbar
            query={bQuery}
            onQueryChange={setBQuery}
            sortKey={bSort}
            onSortChange={setBSort}
            filters={bFilters}
            onFiltersChange={setBFilters}
            groups={bundleGroups}
            total={bundleRows.length}
            placeholder="Search bundle..."
            totalLabel="Bundle"
            action={
              <button
                type="button"
                onClick={() => setBundleModal({ open: true, bundle: null })}
                className="flex items-center gap-1.5 px-5 h-full text-xs font-sans font-bold uppercase tracking-wider bg-[#ff5e1f] hover:bg-[#ff7038] text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bundle</span>
              </button>
            }
          />
        ) : (
          <DoctypeToolbar
            query={kQuery}
            onQueryChange={setKQuery}
            sortKey={kSort}
            onSortChange={setKSort}
            filters={kFilters}
            onFiltersChange={setKFilters}
            groups={contractGroups}
            total={contractRows.length}
            placeholder="Search platform..."
            totalLabel="Kontrak"
            action={
              <button
                type="button"
                onClick={() => setContractDrawer('new')}
                className="flex items-center gap-1.5 px-5 h-full text-xs font-sans font-bold uppercase tracking-wider bg-[#ff5e1f] hover:bg-[#ff7038] text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kontrak Baru</span>
              </button>
            }
          />
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'doctype' ? (
        /* Unified Table Container: Thead and Tbody live in a single table inside single overflow-x-auto to prevent mobile desync */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-sans text-xs">
            <thead className="bg-gray-50/80 dark:bg-[#0d0e12]">
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
            <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
              {filteredDoctypes.map((doctype) => (
                <RateCardRow key={doctype.id} doctype={doctype} contractRate={platformRates[doctype.platform?.slug ?? ''] ?? contractRate} />
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
      ) : activeTab === 'bundle' ? (
        /* Tab Bundle: kontrak multi-platform */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-sans text-xs">
            <thead className="bg-gray-50/80 dark:bg-[#0d0e12]">
              <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] text-[11px] font-sans font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <th className="pl-5 pr-4 py-3 font-semibold w-[220px]">BUNDLE</th>
                <th className="px-4 py-3 font-semibold">KOMPONEN</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">HARGA PAKET</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">BERLAKU MULAI</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
              {bundleRows.map((b) => (
                <tr key={b.id} onClick={() => setBundleModal({ open: true, bundle: b })} className="cursor-pointer hover:bg-gray-50/80 dark:hover:bg-[#16181d] transition-colors border-b border-[#f0f0f0] dark:border-[#272a34]">
                  <td className="pl-5 pr-4 py-3 font-bold text-gray-900 dark:text-white">{b.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {b.items.map((i, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-[#20232b] text-gray-700 dark:text-gray-300">
                          {i.productionUnit?.platform?.name ?? i.productionUnit?.name} · {i.doctype?.displayName} · {i.pages} hal
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Rp {Number(b.price).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{b.effectiveFrom ? new Date(b.effectiveFrom).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${b.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-[#20232b] text-gray-500'}`}>{b.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                  </td>
                </tr>
              ))}
              {bundleRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-gray-400 dark:text-gray-500">
                    {bQuery || bFilters.statuses?.length ? 'Tidak ada bundle yang sesuai.' : 'Belum ada bundle. Klik Add Bundle untuk membuat paket multi-platform.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        /* Tab 2: Kontrak Platform (tabel, satu baris per platform) */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-sans text-xs">
            <thead className="bg-gray-50/80 dark:bg-[#0d0e12]">
              <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] text-[11px] font-sans font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <th className="pl-5 pr-4 py-3 font-semibold w-[240px]">PLATFORM</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">OUTPUT</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">TARIF DASAR / HALAMAN</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">HARI KERJA</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">PERIODE</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">DOCTYPE</th>
                <th className="px-4 py-3 text-center font-semibold w-[110px] whitespace-nowrap border-l border-[#f0f0f0] dark:border-[#272a34]">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
              {contractRows.map((p) => (
                <tr key={p.id} onClick={() => setContractDrawer(p.id)} className="cursor-pointer hover:bg-gray-50/80 dark:hover:bg-[#16181d] transition-colors border-b border-[#f0f0f0] dark:border-[#272a34]">
                  <td className="pl-5 pr-4 py-3">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-900 dark:text-white truncate">{p.name}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{p.slug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-[#20232b] text-gray-700 dark:text-gray-300">{outputLabel(p.outputType)}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{p.baseRate == null ? <span className="text-amber-600 dark:text-amber-400 font-bold">Belum berkontrak</span> : `Rp ${p.baseRate.toLocaleString('id-ID')}`}</td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap" title="Senin–Jumat di periode kontrak; libur nasional belum dikurangi">
                    {p.contractStartDate && p.contractEndDate
                      ? `${workingDaysInRange(new Date(p.contractStartDate).toISOString().slice(0, 10), new Date(p.contractEndDate).toISOString().slice(0, 10)).toLocaleString('id-ID')} hari`
                      : '25 hari / bulan'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {(() => {
                      const fmt = (d: string | Date) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
                      if (!p.contractStartDate) return '26 Jan 2026';
                      return p.contractEndDate ? `${fmt(p.contractStartDate)} – ${fmt(p.contractEndDate)}` : `Sejak ${fmt(p.contractStartDate)}`;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{doctypes.filter((d) => d.platform?.slug === p.slug).length}</td>
                  <td className="px-4 py-2 text-center border-l border-[#f0f0f0] dark:border-[#272a34]">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setContractDrawer(p.id); }}
                      aria-label={`Edit kontrak ${p.name}`}
                      className="inline-flex h-8 items-center gap-1.5 border border-[#f0f0f0] bg-white px-3 text-[11px] font-bold text-gray-700 hover:text-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d] dark:text-gray-300 cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {contractRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400 dark:text-gray-500">Tidak ada kontrak platform yang sesuai.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
      <BundleSlideModal
        open={bundleModal.open}
        onClose={() => setBundleModal({ open: false, bundle: null })}
        bundle={bundleModal.bundle}
        units={bundleUnits}
        doctypes={bundleDoctypes}
      />
      {contractDrawer && (
        <ContractDrawer
          key={contractDrawer}
          contract={contractDrawer === 'new' ? null : platforms.find((p) => p.id === contractDrawer) ?? null}
          onClose={() => setContractDrawer(null)}
          onSaved={(platform) => {
            const created = contractDrawer === 'new';
            setContractDrawer(null);
            toast.success(created ? `Kontrak ${platform.name} dibuat` : `Kontrak ${platform.name} diperbarui`);
            if (created && returnToWizard) router.push('/production/new');
            else router.refresh();
          }}
        />
      )}
    </div>
  );
}
