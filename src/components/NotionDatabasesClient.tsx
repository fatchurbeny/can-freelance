'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Archive, ArchiveRestore, CheckCircle2, Database, FileText, Files, Loader2, Plus, RefreshCw, ScanSearch, Star, Unlink } from 'lucide-react';
import {
  addNotionPageAction,
  getNotionPagesAndDatabasesAction,
  removeNotionPageAction,
  scanNotionPageDatabasesAction,
  setDefaultNotionPageAction,
  setNotionDatabaseArchivedAction,
} from '@/app/actions/notion-config';
import { NotionLogo } from '@/logo/NotionLogo';
import TopBar from '@/components/TopBar';

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
}

const TABLE = 'w-full text-left font-sans text-xs';
const THEAD = 'bg-gray-50 dark:bg-[#16181d] text-gray-500 dark:text-gray-400 uppercase tracking-wider';
const ROW = 'border-b border-[#f0f0f0] dark:border-[#272a34] last:border-b-0 hover:bg-gray-50 dark:hover:bg-[#16181d]/60 transition-colors';
const ACTION = 'inline-flex items-center gap-1.5 px-2.5 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

/** Notion Config → Pages & Databases: page induk untuk database baru, dan database yang terdaftar di platform. */
export default function NotionDatabasesClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [pages, setPages] = useState<PageRow[]>([]);
  const [databases, setDatabases] = useState<DatabaseRow[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newPage, setNewPage] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await getNotionPagesAndDatabasesAction();
    setLoading(false);
    if (!res.success) { toast.error(res.error || 'Gagal memuat data.'); return; }
    if (!res.exists) { router.push('/notion-config'); return; }
    setWorkspaceName(res.workspaceName ?? '');
    setMaskedApiKey(res.maskedApiKey ?? '');
    setPages(res.pages ?? []);
    setDatabases(res.databases ?? []);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const run = async (id: string, action: () => Promise<{ success: boolean; error?: string }>, done?: string) => {
    setBusyId(id);
    const res = await action();
    setBusyId(null);
    if (!res.success) { toast.error(res.error || 'Gagal.'); return; }
    if (done) toast.success(done);
    await load();
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
    await load();
  };

  const scan = async (page: PageRow) => {
    setBusyId(page.id);
    const res = await scanNotionPageDatabasesAction(page.id);
    setBusyId(null);
    if (!res.success) { toast.error(res.error || 'Gagal memindai page.'); return; }
    toast.success(res.added ? `${res.added} database baru didaftarkan dari "${page.name}".` : `Tidak ada database baru di "${page.name}".`);
    await load();
  };

  const removePage = (page: PageRow) => {
    if (!window.confirm(`Lepas page "${page.name}" dari daftar? Page dan database di Notion tidak terhapus.`)) return;
    run(page.id, () => removeNotionPageAction(page.id), 'Page dilepas dari daftar.');
  };

  const activeDatabases = databases.filter((db) => !db.archived);
  const archivedCount = databases.length - activeDatabases.length;
  const visibleDatabases = showArchived ? databases : activeDatabases;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar badgeLabel="NOTION CONFIG" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col gap-6 p-3 sm:p-6 md:p-8 bg-grid-pattern">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-sans">
            <Link href="/notion-config" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Notion Config</Link>
            <span className="text-gray-400 dark:text-gray-600">/</span>
            <span className="font-bold text-gray-900 dark:text-white">Pages &amp; Databases</span>
          </nav>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw className="w-8 h-8 text-[#ff5e1f] animate-spin" />
              <p className="text-xs font-sans text-gray-500 dark:text-gray-400">Memuat page dan database…</p>
            </div>
          ) : (
            <>
              <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-[#16181d] flex items-center justify-center shrink-0 border border-[#f0f0f0] dark:border-[#272a34]"><NotionLogo /></div>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold font-sans text-gray-900 dark:text-white truncate">{workspaceName || 'Notion Workspace'}</h1>
                    <p className="text-xs font-sans text-gray-500 dark:text-gray-400 mt-0.5">{pages.length} page · {activeDatabases.length} database terdaftar</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-sans font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 min-w-0 max-w-full">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /><span className="whitespace-nowrap">API key</span> <code className="font-mono truncate min-w-0">{maskedApiKey}</code>
                </div>
              </div>

              {/* Pages */}
              <section className="flex flex-col gap-3">
                <div>
                  <h2 className="font-sans text-base font-bold text-[#262626] dark:text-white">Pages</h2>
                  <p className="font-sans text-xs text-gray-500 dark:text-gray-400">
                    Database production baru dibuat di dalam salah satu page ini. Page bertanda bintang dipakai otomatis di wizard production. Pastikan page sudah di-share ke integrasi (••• → Connections).
                  </p>
                </div>
                <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] overflow-x-auto">
                  <form onSubmit={addPage} className="flex flex-wrap items-stretch border-b border-[#f0f0f0] dark:border-[#272a34]">
                    <input
                      aria-label="Link atau ID page Notion"
                      value={newPage}
                      onChange={(e) => setNewPage(e.target.value)}
                      placeholder="Tempel link page Notion atau ID 32 karakter"
                      className="flex-1 min-w-[220px] h-11 px-4 rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 font-sans text-xs text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f]"
                    />
                    <label className="flex items-center gap-2 px-4 border-l border-[#f0f0f0] dark:border-[#272a34] text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="w-4 h-4 accent-gray-900" />Jadikan default
                    </label>
                    <button type="submit" disabled={adding || !newPage.trim()} className="flex items-center gap-1.5 px-4 h-11 rounded-none bg-[#ff5e1f] hover:bg-[#ff7038] text-white text-xs font-semibold font-sans cursor-pointer disabled:opacity-50">
                      {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Tambah Page
                    </button>
                  </form>
                  <table className={TABLE}>
                    <thead className={THEAD}>
                      <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
                        <th className="px-4 py-3 font-bold">Page</th>
                        <th className="px-4 py-3 font-bold">ID</th>
                        <th className="px-4 py-3 font-bold text-right">Database</th>
                        <th className="px-4 py-3 font-bold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Belum ada page. Tambahkan page tempat database production dibuat.</td></tr>
                      )}
                      {pages.map((page) => (
                        <tr key={page.id} className={`${ROW} ${busyId === page.id ? 'pointer-events-none animate-pulse' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5 font-semibold text-[#262626] dark:text-white whitespace-nowrap">
                              <FileText className="w-4 h-4 text-[#ff5e1f] shrink-0" />{page.name}
                              {page.isDefault && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#ff5e1f]/10 text-[#c2410c] dark:text-[#ff7038]">DEFAULT</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">{page.pageId}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#262626] dark:text-white">{page.databaseCount}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button type="button" className={ACTION} disabled={page.isDefault} onClick={() => run(page.id, () => setDefaultNotionPageAction(page.id), `"${page.name}" jadi page default.`)} aria-label={`Jadikan ${page.name} default`}>
                                <Star className={`w-3.5 h-3.5 ${page.isDefault ? 'fill-[#ff5e1f] text-[#ff5e1f]' : ''}`} />Default
                              </button>
                              <button type="button" className={ACTION} onClick={() => scan(page)} title="Daftarkan database yang sudah ada di page ini">
                                <ScanSearch className="w-3.5 h-3.5" />Pindai
                              </button>
                              <button type="button" className={ACTION} onClick={() => removePage(page)} aria-label={`Lepas ${page.name}`}>
                                <Unlink className="w-3.5 h-3.5" />Lepas
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Databases */}
              <section className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="font-sans text-base font-bold text-[#262626] dark:text-white">Databases</h2>
                    <p className="font-sans text-xs text-gray-500 dark:text-gray-400">
                      Database terdaftar otomatis saat production dibuat atau dihubungkan dari wizard. Database milik production mengikuti status production-nya, jadi atur lewat Production Hub. Database tanpa production (mis. hasil Pindai) bisa diarsipkan di sini; tetap terdaftar dan data Notion tidak disentuh.
                    </p>
                  </div>
                  {archivedCount > 0 && (
                    <button type="button" onClick={() => setShowArchived((v) => !v)} className="flex items-center gap-1.5 px-3 h-9 shrink-0 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-xs font-semibold font-sans text-gray-600 dark:text-gray-300 cursor-pointer">
                      <Archive className="w-3.5 h-3.5" />{showArchived ? 'Sembunyikan diarsipkan' : `Diarsipkan (${archivedCount})`}
                    </button>
                  )}
                </div>
                <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] overflow-x-auto">
                  <table className={TABLE}>
                    <thead className={THEAD}>
                      <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
                        <th className="px-4 py-3 font-bold">Database</th>
                        <th className="px-4 py-3 font-bold">Page</th>
                        <th className="px-4 py-3 font-bold">Dipakai Production</th>
                        <th className="px-4 py-3 font-bold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDatabases.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Belum ada database. Buat production baru, atau pindai page yang berisi database lama.</td></tr>
                      )}
                      {visibleDatabases.map((db) => {
                        return (
                          <tr key={db.id} className={`${ROW} ${db.archived ? 'opacity-60' : ''} ${busyId === db.id ? 'pointer-events-none animate-pulse' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5 font-semibold text-[#262626] dark:text-white whitespace-nowrap">
                                <Database className="w-4 h-4 text-[#ff5e1f] shrink-0" />{db.name}
                                {db.archived && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 dark:bg-[#20232b] text-gray-500">ARSIP</span>}
                              </div>
                              <div className="mt-0.5 pl-[26px] font-mono text-[10px] text-gray-400">{db.maskedDatabaseId}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{db.parentPageName ?? '—'}</td>
                            <td className="px-4 py-3">
                              {db.productions.length === 0 ? (
                                <span className="text-gray-400">Belum dipakai</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {db.productions.map((p) => (
                                    <span key={p.name} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-[#20232b] text-gray-500'}`}>
                                      {p.name}{p.isActive ? '' : ' · diarsipkan'}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end">
                                {db.managedByProduction ? (
                                  <Link href="/production" className={ACTION} title="Status database ini mengikuti production-nya">
                                    <Files className="w-3.5 h-3.5" />Production Hub
                                  </Link>
                                ) : db.archived ? (
                                  <button type="button" className={ACTION} onClick={() => run(db.id, () => setNotionDatabaseArchivedAction({ id: db.id, archived: false }), `"${db.name}" dipulihkan.`)}>
                                    <ArchiveRestore className="w-3.5 h-3.5" />Pulihkan
                                  </button>
                                ) : (
                                  <button type="button" className={ACTION} onClick={() => run(db.id, () => setNotionDatabaseArchivedAction({ id: db.id, archived: true }), `"${db.name}" diarsipkan.`)}>
                                    <Archive className="w-3.5 h-3.5" />Arsipkan
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
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
