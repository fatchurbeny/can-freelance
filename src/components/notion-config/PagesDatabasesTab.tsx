'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Archive, ArchiveRestore, Database, FileText, Files, Library, Loader2, Plus, RefreshCw, ScanSearch, Search, Star, Unlink, X } from 'lucide-react';
import {
  addNotionPageAction,
  getNotionPagesAndDatabasesAction,
  removeNotionPageAction,
  scanNotionPageDatabasesAction,
  setDefaultNotionPageAction,
  setNotionDatabaseArchivedAction,
} from '@/app/actions/notion-config';
import { BTN, PANEL_HEAD, PANEL_NOTE, PANEL_TITLE, SECTION_GAP, TABLE, TD, TH, THEAD_ROW, TROW } from './styles';

interface PageRow {
  id: string;
  name: string;
  pageId: string;
  isDefault: boolean;
  databaseCount: number;
}

interface DatabaseRow {
  id: string;
  name: string;
  maskedDatabaseId: string;
  archived: boolean;
  /** Dipakai production: status arsip mengikuti production (diatur di Production Hub). */
  managedByProduction: boolean;
  parentPageName: string | null;
  productions: { name: string; isActive: boolean }[];
  purpose: string | null;
}

const ASSET_PURPOSE = 'asset_library';
const BORDER_L = 'border-l border-[#f0f0f0] dark:border-[#272a34]';

interface Props {
  /** Daftar berubah (tambah/lepas page, pindai, arsip) → muat ulang ringkasan di header. */
  onChanged: () => void;
  onOpenAssetTab: () => void;
}

/** Tab Pages & Databases: page induk untuk database baru, dan database yang terdaftar di platform. */
export default function PagesDatabasesTab({ onChanged, onOpenAssetTab }: Props) {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [databases, setDatabases] = useState<DatabaseRow[]>([]);
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newPage, setNewPage] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await getNotionPagesAndDatabasesAction();
    setLoading(false);
    if (!res.success) { toast.error(res.error || 'Gagal memuat data.'); return; }
    if (!res.exists) return;
    setPages(res.pages ?? []);
    setDatabases(res.databases ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reload = async () => {
    await load();
    onChanged();
  };

  const run = async (id: string, action: () => Promise<{ success: boolean; error?: string }>, done?: string) => {
    setBusyId(id);
    const res = await action();
    setBusyId(null);
    if (!res.success) { toast.error(res.error || 'Gagal.'); return; }
    if (done) toast.success(done);
    await reload();
  };

  const addPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPage.trim()) return;
    setAdding(true);
    const res = await addNotionPageAction({ page: newPage, makeDefault });
    setAdding(false);
    if (!res.success) { toast.error(res.error || 'Gagal menambah page.'); return; }
    toast.success(`Page "${res.page?.name}" ditambahkan.`);
    setNewPage('');
    setMakeDefault(false);
    await reload();
  };

  const scan = async (page: PageRow) => {
    setBusyId(page.id);
    const res = await scanNotionPageDatabasesAction(page.id);
    setBusyId(null);
    if (!res.success) { toast.error(res.error || 'Gagal memindai page.'); return; }
    toast.success(res.added ? `${res.added} database baru didaftarkan dari "${page.name}".` : `Tidak ada database baru di "${page.name}".`);
    await reload();
  };

  const removePage = (page: PageRow) => {
    if (!window.confirm(`Lepas page "${page.name}" dari daftar? Page dan database di Notion tidak terhapus.`)) return;
    run(page.id, () => removeNotionPageAction(page.id), 'Page dilepas dari daftar.');
  };

  const activeCount = databases.filter((db) => !db.archived).length;
  const archivedCount = databases.length - activeCount;
  const visibleDatabases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return databases.filter((db) => {
      if ((view === 'archived') !== db.archived) return false;
      if (!q) return true;
      return `${db.name} ${db.parentPageName ?? ''} ${db.productions.map((p) => p.name).join(' ')}`.toLowerCase().includes(q);
    });
  }, [databases, view, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-xs text-gray-500">
        <RefreshCw className="h-4 w-4 animate-spin text-[#ff5e1f]" /> Memuat page dan database…
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Pages */}
      <div className={PANEL_HEAD}>
        <div className="space-y-0.5">
          <span className={PANEL_TITLE}>Pages</span>
          <p className={PANEL_NOTE}>Database production baru dibuat di salah satu page ini; page default dipakai otomatis di wizard production. Pastikan page sudah di-share ke integrasi (••• → Connections).</p>
        </div>
      </div>
      <form onSubmit={addPage} className="flex flex-wrap items-stretch border-b border-[#f0f0f0] dark:border-[#272a34]">
        <input
          aria-label="Link atau ID page Notion"
          value={newPage}
          onChange={(e) => setNewPage(e.target.value)}
          placeholder="Tempel link page Notion atau ID 32 karakter"
          className="h-11 min-w-[220px] flex-1 rounded-none border-0 bg-gray-50/50 px-5 text-xs text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#ff5e1f] dark:bg-[#16181d]/50 dark:text-white dark:focus:bg-[#16181d]"
        />
        <label className={`flex items-center gap-2 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer ${BORDER_L}`}>
          <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="h-4 w-4 accent-gray-900" />Jadikan default
        </label>
        <button type="submit" disabled={adding || !newPage.trim()} className="flex h-11 items-center gap-1.5 bg-[#ff5e1f] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-50 cursor-pointer">
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Tambah Page
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className={`${TABLE} min-w-[720px]`}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>Page</th>
              <th className={`${TH} ${BORDER_L}`}>ID</th>
              <th className={`${TH} ${BORDER_L} text-right`}>Database</th>
              <th className={`${TH} ${BORDER_L} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Belum ada page. Tambahkan page tempat database production dibuat.</td></tr>
            )}
            {pages.map((page) => (
              <tr key={page.id} className={`${TROW} ${busyId === page.id ? 'pointer-events-none animate-pulse' : ''}`}>
                <td className={TD}>
                  <div className="flex items-center gap-2.5 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                    <FileText className="h-4 w-4 shrink-0 text-[#ff5e1f]" />{page.name}
                    {page.isDefault && <span className="bg-[#ff5e1f] px-1.5 py-0.5 text-[9px] font-bold text-white">DEFAULT</span>}
                  </div>
                </td>
                <td className={`${TD} ${BORDER_L} font-mono text-[11px] text-gray-500 dark:text-gray-400`}>{page.pageId}</td>
                <td className={`${TD} ${BORDER_L} text-right font-bold tabular-nums text-gray-900 dark:text-white`}>{page.databaseCount}</td>
                <td className={`${TD} ${BORDER_L}`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button type="button" className={BTN} disabled={page.isDefault} onClick={() => run(page.id, () => setDefaultNotionPageAction(page.id), `"${page.name}" jadi page default.`)} aria-label={`Jadikan ${page.name} default`}>
                      <Star className={`h-3.5 w-3.5 ${page.isDefault ? 'fill-[#ff5e1f] text-[#ff5e1f]' : ''}`} />Default
                    </button>
                    <button type="button" className={BTN} onClick={() => scan(page)} title="Daftarkan database yang sudah ada di page ini">
                      <ScanSearch className="h-3.5 w-3.5" />Pindai
                    </button>
                    <button type="button" className={BTN} onClick={() => removePage(page)} aria-label={`Lepas ${page.name}`}>
                      <Unlink className="h-3.5 w-3.5" />Lepas
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Databases */}
      <div className={`${PANEL_HEAD} ${SECTION_GAP}`}>
        <div className="space-y-0.5">
          <span className={PANEL_TITLE}>Databases</span>
          <p className={PANEL_NOTE}>Database milik production mengikuti status production-nya (atur lewat Production Hub). Database tanpa kegunaan bisa diarsipkan; tetap terdaftar dan data Notion tidak disentuh.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-stretch border-b border-[#f0f0f0] dark:border-[#272a34]">
        <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2 px-5">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari database, page, atau production…" aria-label="Cari database" className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400" />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Hapus pencarian" className="text-gray-400 hover:text-[#ff5e1f] cursor-pointer"><X className="h-3.5 w-3.5" /></button>
          )}
        </label>
        <div className={`grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] ${BORDER_L}`}>
          {([['active', `Aktif (${activeCount})`], ['archived', `Arsip (${archivedCount})`]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`h-11 px-4 text-xs font-bold uppercase cursor-pointer ${view === id ? 'bg-[#ff5e1f] text-white' : 'bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:bg-[#16181d]/50 dark:text-gray-300 dark:hover:bg-[#16181d]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className={`${TABLE} min-w-[760px]`}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>Database</th>
              <th className={`${TH} ${BORDER_L}`}>Page</th>
              <th className={`${TH} ${BORDER_L}`}>Dipakai</th>
              <th className={`${TH} ${BORDER_L} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleDatabases.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                {databases.length === 0 ? 'Belum ada database. Buat production baru, atau pindai page yang berisi database lama.' : 'Tidak ada database yang cocok.'}
              </td></tr>
            )}
            {visibleDatabases.map((db) => {
              const isAssetDb = db.purpose === ASSET_PURPOSE && !db.managedByProduction;
              return (
                <tr key={db.id} className={`${TROW} ${busyId === db.id ? 'pointer-events-none animate-pulse' : ''}`}>
                  <td className={TD}>
                    <div className="flex items-center gap-2.5 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                      <Database className="h-4 w-4 shrink-0 text-[#ff5e1f]" />{db.name}
                    </div>
                    <div className="mt-0.5 pl-[26px] font-mono text-[10px] text-gray-400">{db.maskedDatabaseId}</div>
                  </td>
                  <td className={`${TD} ${BORDER_L} whitespace-nowrap text-gray-600 dark:text-gray-300`}>{db.parentPageName ?? '—'}</td>
                  <td className={`${TD} ${BORDER_L}`}>
                    {isAssetDb ? (
                      <span className="inline-flex items-center gap-1 bg-[#ff5e1f]/10 px-2 py-0.5 text-[10px] font-bold text-[#c2410c] dark:text-[#ff7038]"><Library className="h-3 w-3" />Asset Library</span>
                    ) : db.productions.length === 0 ? (
                      <span className="text-gray-400">Belum dipakai</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {db.productions.map((p) => (
                          <span key={p.name} className={`px-2 py-0.5 text-[10px] font-bold ${p.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-[#20232b]'}`}>
                            {p.name}{p.isActive ? '' : ' · diarsipkan'}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={`${TD} ${BORDER_L}`}>
                    <div className="flex justify-end">
                      {db.managedByProduction ? (
                        <Link href="/production" className={BTN} title="Status database ini mengikuti production-nya">
                          <Files className="h-3.5 w-3.5" />Production Hub
                        </Link>
                      ) : isAssetDb ? (
                        <button type="button" className={BTN} onClick={onOpenAssetTab}>
                          <Library className="h-3.5 w-3.5" />Tab Asset Library
                        </button>
                      ) : db.archived ? (
                        <button type="button" className={BTN} onClick={() => run(db.id, () => setNotionDatabaseArchivedAction({ id: db.id, archived: false }), `"${db.name}" dipulihkan.`)}>
                          <ArchiveRestore className="h-3.5 w-3.5" />Pulihkan
                        </button>
                      ) : (
                        <button type="button" className={BTN} onClick={() => run(db.id, () => setNotionDatabaseArchivedAction({ id: db.id, archived: true }), `"${db.name}" diarsipkan.`)}>
                          <Archive className="h-3.5 w-3.5" />Arsipkan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
