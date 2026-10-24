"use client";

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import SelectDropdown from '@/components/SelectDropdown';
import { createAssetCategoryAction, syncAssetsNowAction } from '@/app/actions/assets';
import type { AssetCategoryRow, AssetRow, AssetSyncSummary } from '@/lib/asset-library';
import AssetDetailDrawer from './AssetDetailDrawer';
import AssetFormDrawer from './AssetFormDrawer';
import { coverSrc, coverTint, formatRelative } from './asset-ui';

export interface UnitOption { id: string; name: string }

interface Props {
  categories: AssetCategoryRow[];
  assets: AssetRow[];
  units: UnitOption[];
  canManage: boolean;
  sync: AssetSyncSummary;
}

type DrawerState = { mode: 'detail' | 'edit'; id: string } | { mode: 'create'; id: null };

const cell = 'h-11 rounded-none border-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] text-xs';

export default function AssetLibraryClient({ categories, assets, units, canManage, sync }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [unit, setUnit] = useState('all');
  const [sort, setSort] = useState('updated');
  const [show, setShow] = useState('active');
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Diturunkan dari props agar data terbaru tampil setelah router.refresh().
  const drawerAsset = drawer?.id ? assets.find((a) => a.id === drawer.id) ?? null : null;
  const categoryIndex = useMemo(() => new Map(categories.map((c, i) => [c.id, i])), [categories]);

  const scoped = useMemo(() => assets.filter((a) => (show === 'archived' ? a.status === 'archived' : a.status === 'active')), [assets, show]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = scoped.filter((a) => {
      if (tab !== 'all' && a.categoryId !== tab) return false;
      if (unit === 'shared' && a.productionUnitId) return false;
      if (unit !== 'all' && unit !== 'shared' && a.productionUnitId !== unit && a.productionUnitId !== null) return false;
      if (q && !`${a.title} ${a.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === 'title') return [...rows].sort((a, b) => a.title.localeCompare(b.title, 'id'));
    if (sort === 'used') return [...rows].sort((a, b) => b.usedCount - a.usedCount);
    return rows;
  }, [scoped, tab, unit, search, sort]);

  const countFor = (categoryId: string) => scoped.filter((a) => categoryId === 'all' || a.categoryId === categoryId).length;

  const runSync = () =>
    startTransition(async () => {
      const res = await syncAssetsNowAction();
      if (!res.success) { toast.error(res.error); return; }
      toast.success(`Sinkron selesai (${res.pushed} dikirim, ${res.pulled} diperbarui dari Notion)`);
      router.refresh();
    });

  const addCategory = () =>
    startTransition(async () => {
      const name = newCategory?.trim();
      if (!name) { setNewCategory(null); return; }
      const res = await createAssetCategoryAction(name);
      if (!res.success) { toast.error(res.error); return; }
      setNewCategory(null);
      setTab(res.id);
      router.refresh();
    });

  const syncLabel = !sync.connected
    ? 'Notion belum terhubung'
    : sync.failed > 0
      ? `Notion · ${sync.failed} gagal terkirim`
      : sync.pending > 0
        ? `Notion · ${sync.pending} menunggu dikirim`
        : `Notion · sinkron ${formatRelative(sync.lastSyncedAt)}`;
  const syncDot = !sync.connected ? 'bg-[#6e7687]' : sync.failed > 0 ? 'bg-rose-500' : sync.pending > 0 ? 'bg-amber-500' : 'bg-[#00a67d]';

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 font-sans">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Asset Library</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kumpulan aset Canva yang siap dipakai designer dan dirujuk di Design Brief.</p>
        </div>
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="flex h-10 items-center gap-2 border border-[#f0f0f0] bg-gray-50/50 px-3 text-xs font-semibold text-gray-600 dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-300">
            <span aria-hidden className={`h-2 w-2 ${syncDot}`} />
            {syncLabel}
          </div>
          {canManage && sync.connected && (
            <button
              type="button"
              onClick={runSync}
              disabled={pending}
              className="flex h-10 items-center gap-2 border border-[#f0f0f0] bg-white px-3.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:text-[#ff5e1f] disabled:opacity-50 dark:border-[#272a34] dark:bg-[#0d0e12] dark:text-gray-300 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} />
              Sync
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setDrawer({ mode: 'create', id: null })}
              className="flex h-10 items-center gap-1.5 bg-[#ff5e1f] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tambah Aset
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col rounded-none border border-[#f0f0f0] bg-white dark:border-[#272a34] dark:bg-[#0d0e12]">
        {/* Satu baris tab yang bisa digeser (pola ProductionTabNav); + Kategori tetap di kanan */}
        <div className="flex items-stretch border-b border-[#f0f0f0] bg-[#f8f9fa] dark:border-[#272a34] dark:bg-[#0d0e12]">
          <div role="tablist" aria-label="Kategori aset" className="flex min-w-0 flex-1 items-stretch overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[{ id: 'all', name: 'Semua' }, ...categories].map((c) => {
              const isActive = tab === c.id;
              const count = countFor(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(c.id)}
                  className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap border-r border-[#f0f0f0] px-4 py-2.5 text-sm transition-all duration-150 dark:border-[#272a34] cursor-pointer ${
                    isActive
                      ? 'bg-white font-bold text-gray-900 dark:bg-[#16181d] dark:text-white'
                      : 'bg-[#f8f9fa] font-medium text-gray-600 hover:bg-[#f0f1f3] hover:text-gray-900 dark:bg-[#0d0e12] dark:text-gray-400 dark:hover:bg-[#16181d]/50 dark:hover:text-gray-200'
                  }`}
                >
                  <span>{c.name}</span>
                  {count > 0 && (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                        isActive ? 'bg-[#ff5e1f]/10 text-[#ff5e1f]' : 'bg-gray-200/60 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                  {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ff5e1f]" />}
                </button>
              );
            })}
          </div>
          {canManage && (newCategory === null ? (
            <button
              type="button"
              onClick={() => setNewCategory('')}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap border-l border-[#f0f0f0] px-4 text-xs font-bold text-[#ff5e1f] hover:bg-white dark:border-[#272a34] dark:hover:bg-[#16181d] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Kategori
            </button>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); addCategory(); }}
              className="flex shrink-0 items-stretch border-l border-[#f0f0f0] dark:border-[#272a34]"
            >
              <input
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setNewCategory(null)}
                placeholder="Nama kategori"
                aria-label="Nama kategori baru"
                className="w-28 bg-white sm:w-40 px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-[#ff5e1f] dark:bg-[#0d0e12]"
              />
              <button type="submit" disabled={pending} className="bg-[#ff5e1f] px-3 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-50 cursor-pointer">Simpan</button>
              <button type="button" onClick={() => setNewCategory(null)} aria-label="Batal" className="px-2 text-gray-400 hover:text-[#ff5e1f] cursor-pointer"><X className="h-4 w-4" /></button>
            </form>
          ))}
        </div>

        <div className="flex flex-wrap items-stretch border-b border-[#f0f0f0] dark:border-[#272a34]">
          <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2 border-r border-[#f0f0f0] px-3.5 dark:border-[#272a34]">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul atau tag…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400"
              aria-label="Cari aset"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Hapus pencarian" className="cursor-pointer text-gray-400 hover:text-[#ff5e1f]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          <div className="min-w-[150px] flex-1 sm:w-[190px] sm:flex-none"><SelectDropdown label="Production" value={unit} onChange={setUnit} buttonClassName={cell}
            options={[{ value: 'all', label: 'ALL Production' }, { value: 'shared', label: 'Semua production' }, ...units.map((u) => ({ value: u.id, label: u.name }))]} /></div>
          <div className="min-w-[130px] flex-1 sm:w-[170px] sm:flex-none"><SelectDropdown label="Urutkan" value={sort} onChange={setSort} buttonClassName={`${cell} ${canManage ? '' : 'border-r-0'}`}
            options={[{ value: 'updated', label: 'Terbaru' }, { value: 'title', label: 'Judul A–Z' }, { value: 'used', label: 'Paling dipakai' }]} /></div>
          {canManage && (
            <div className="min-w-[110px] flex-1 sm:w-[140px] sm:flex-none"><SelectDropdown label="Status" value={show} onChange={setShow} buttonClassName={`${cell} border-r-0`}
              options={[{ value: 'active', label: 'Aktif' }, { value: 'archived', label: 'Arsip' }]} /></div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {assets.length === 0 ? (canManage ? 'Belum ada aset. Klik Tambah Aset untuk mulai.' : 'Belum ada aset di library.') : 'Tidak ada aset yang cocok.'}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {filtered.map((a) => {
              const cover = coverSrc(a.coverUrl, a.previewUrl);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setDrawer({ mode: 'detail', id: a.id })}
                  className="group flex flex-col border-b border-r border-[#f0f0f0] bg-white text-left hover:bg-gray-50/80 dark:border-[#272a34] dark:bg-[#0d0e12] dark:hover:bg-[#16181d] cursor-pointer"
                >
                  <div className={`relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden ${cover ? 'bg-gray-100 dark:bg-[#16181d]' : coverTint(categoryIndex.get(a.categoryId) ?? 0)}`}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex aspect-video w-3/5 items-center justify-center bg-white text-[11px] font-bold uppercase tracking-wider text-gray-400 shadow-md dark:bg-[#0d0e12]">Cover</span>
                    )}
                    {a.pages != null && (
                      <span className="absolute bottom-2 right-2 bg-black/75 px-1.5 py-0.5 text-[11px] font-bold text-white">{a.pages} hlm</span>
                    )}
                    {a.syncStatus === 'ERROR' && canManage && (
                      <span className="absolute left-2 top-2 bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Gagal sync</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 px-3.5 pb-3.5 pt-3">
                    <span className="text-[13px] font-bold leading-snug text-gray-900 group-hover:text-[#ff5e1f] dark:text-white">{a.title}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {a.categoryName} · {a.productionName ?? 'Semua production'}{a.usedCount > 0 ? ` · ${a.usedCount} task` : ''}
                    </span>
                    {a.tags.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {a.tags.slice(0, 4).map((t) => (
                          <span key={t} className="border border-[#ebebeb] bg-gray-50 px-1.5 text-[11px] font-semibold text-gray-600 dark:border-[#272a34] dark:bg-[#16181d] dark:text-gray-300">{t}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {drawer?.mode === 'detail' && drawerAsset && (
        <AssetDetailDrawer
          asset={drawerAsset}
          canManage={canManage}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: 'edit', id: drawerAsset.id })}
          onChanged={() => router.refresh()}
        />
      )}
      {(drawer?.mode === 'create' || (drawer?.mode === 'edit' && drawerAsset)) && (
        <AssetFormDrawer
          key={drawer.id ?? 'new'}
          asset={drawer.mode === 'edit' ? drawerAsset : null}
          categories={categories}
          units={units}
          defaultCategoryId={tab !== 'all' ? tab : categories[0]?.id}
          notionConnected={sync.connected}
          onClose={() => setDrawer(drawer.mode === 'edit' ? { mode: 'detail', id: drawer.id } : null)}
          onSaved={(id) => { router.refresh(); setDrawer({ mode: 'detail', id }); }}
        />
      )}
    </div>
  );
}
