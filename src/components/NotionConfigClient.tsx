'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Database, Eye, EyeOff, Key, Library, Mail, Plug, RefreshCw, Save, X } from 'lucide-react';
import { getNotionConfigAction, saveNotionWorkspaceAction, deleteNotionConfigAction } from '@/app/actions/notion-config';
import { getEmailConfigAction } from '@/app/actions/email-notification';
import TopBar from '@/components/TopBar';
import EmailConfigCard from '@/components/EmailConfigCard';
import AssetLibraryNotionCard from '@/components/assets/AssetLibraryNotionCard';
import KoneksiTab from '@/components/notion-config/KoneksiTab';
import PagesDatabasesTab from '@/components/notion-config/PagesDatabasesTab';
import SyncTab from '@/components/notion-config/SyncTab';
import { DOT } from '@/components/notion-config/styles';

type TabId = 'koneksi' | 'pages' | 'sync' | 'asset' | 'email';

const TABS: { id: TabId; label: string; icon: ComponentType<{ className?: string }>; needsConfig?: boolean }[] = [
  { id: 'koneksi', label: 'Koneksi', icon: Plug },
  { id: 'pages', label: 'Pages & Databases', icon: Database, needsConfig: true },
  { id: 'sync', label: 'Sinkronisasi', icon: RefreshCw, needsConfig: true },
  { id: 'asset', label: 'Asset Library', icon: Library, needsConfig: true },
  { id: 'email', label: 'Email Notifikasi', icon: Mail },
];

const isTabId = (v: string | null): v is TabId => !!v && TABS.some((t) => t.id === v);

export interface NotionConfigState {
  exists: boolean;
  workspaceName: string;
  maskedApiKey: string;
  pageCount: number;
  databaseCount: number;
  defaultPageName: string | null;
  autoSync: boolean;
  syncInterval: string;
}

const EMPTY: NotionConfigState = {
  exists: false, workspaceName: '', maskedApiKey: '', pageCount: 0, databaseCount: 0, defaultPageName: null, autoSync: false, syncInterval: '24_hours',
};

/** Notion Config: satu halaman dengan tab (pola ProductionTabNav); tab aktif disimpan di `?tab=`. */
export default function NotionConfigClient({ initialSyncLog }: { initialSyncLog: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Kembali dari Google OAuth → langsung ke tab Email
  const requested = searchParams.get('google_auth') ? 'email' : searchParams.get('tab');
  const [tab, setTab] = useState<TabId>(isTabId(requested) ? requested : 'koneksi');

  const [config, setConfig] = useState<NotionConfigState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [latestSyncLog, setLatestSyncLog] = useState<any>(initialSyncLog);
  const [emailNeedsAttention, setEmailNeedsAttention] = useState(false);
  const [counts, setCounts] = useState<{ databases: number }>({ databases: 0 });

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [inputWorkspaceName, setInputWorkspaceName] = useState('');
  const [inputApiKey, setInputApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const res = await getNotionConfigAction();
      setConfig({
        exists: res.exists,
        workspaceName: res.workspaceName || '',
        maskedApiKey: res.maskedApiKey || '',
        pageCount: res.pageCount ?? 0,
        databaseCount: res.databases?.length ?? 0,
        defaultPageName: res.defaultPageName ?? null,
        autoSync: res.autoSync ?? false,
        syncInterval: res.syncInterval ?? '24_hours',
      });
      setCounts({ databases: res.databases?.length ?? 0 });
    } catch (err) {
      console.error('Error loading configuration:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmailStatus = useCallback(async () => {
    try {
      const res = await getEmailConfigAction();
      const status = res.config?.authStatus || (res.config?.encryptedOAuthToken ? 'ACTIVE' : 'DISCONNECTED');
      setEmailNeedsAttention(status === 'RECONNECT_REQUIRED' || status === 'AUTH_FAILED');
    } catch {
      setEmailNeedsAttention(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadEmailStatus();
  }, [loadConfig, loadEmailStatus]);

  useEffect(() => {
    const onFinished = async () => {
      const { getLatestSyncStatus } = await import('@/app/actions/sync');
      setLatestSyncLog(await getLatestSyncStatus());
    };
    window.addEventListener('notion-sync-finished', onFinished);
    return () => window.removeEventListener('notion-sync-finished', onFinished);
  }, []);

  const selectTab = (id: TabId) => {
    setTab(id);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('google_auth');
    params.delete('error');
    params.delete('sub');
    if (id === 'koneksi') params.delete('tab');
    else params.set('tab', id);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWorkspaceName.trim() || !inputApiKey.trim()) return;
    setIsSavingApiKey(true);
    setApiFeedback(null);
    try {
      const res = await saveNotionWorkspaceAction(inputWorkspaceName, inputApiKey);
      if (!res.success) { setApiFeedback(res.error || 'Gagal menyimpan API key.'); return; }
      await loadConfig();
      setShowApiKeyModal(false);
      setInputApiKey('');
      setInputWorkspaceName('');
      selectTab('pages');
    } catch (err: any) {
      setApiFeedback(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Putuskan koneksi Notion? API key dan daftar database di app akan dihapus. Data di Notion tidak disentuh.')) return;
    const res = await deleteNotionConfigAction();
    if (!res.success) { window.alert(res.error || 'Gagal memutuskan koneksi.'); return; }
    await loadConfig();
    selectTab('koneksi');
  };

  const openConnect = () => {
    setInputWorkspaceName(config.workspaceName);
    setApiFeedback(null);
    setShowApiKeyModal(true);
  };

  const syncedAt = latestSyncLog?.finishedAt || latestSyncLog?.startedAt;
  const syncedLabel = syncedAt
    ? `${new Date(syncedAt).toLocaleDateString('id-ID')} ${new Date(syncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
    : 'belum pernah';
  const visibleTabs = TABS.filter((t) => config.exists || !t.needsConfig);
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : 'koneksi';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar badgeLabel="NOTION CONFIG" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col gap-5 overflow-x-hidden p-3 sm:p-6 md:p-8 bg-grid-pattern font-sans">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Notion Config</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {config.exists ? (
                  <>Workspace <strong className="text-gray-900 dark:text-white">{config.workspaceName || 'Notion'}</strong> · {config.pageCount} page · {counts.databases} database terdaftar</>
                ) : loading ? 'Memuat konfigurasi…' : 'Belum terhubung ke Notion.'}
              </p>
            </div>
            {config.exists && (
              <div className="flex flex-wrap items-stretch gap-2">
                <span className="flex h-10 items-center gap-2 border border-[#f0f0f0] bg-white px-3 text-xs font-semibold text-gray-600 dark:border-[#272a34] dark:bg-[#0d0e12] dark:text-gray-300">
                  <span aria-hidden className={`${DOT} ${latestSyncLog?.status === 'failed' ? 'bg-rose-500' : latestSyncLog?.status === 'running' ? 'bg-amber-500' : 'bg-[#00a67d]'}`} />
                  Terhubung · sync terakhir {syncedLabel}
                </span>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event('notion-sync-request'))}
                  className="flex h-10 items-center gap-2 bg-[#ff5e1f] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync Sekarang
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col rounded-none border border-[#f0f0f0] bg-white dark:border-[#272a34] dark:bg-[#0d0e12]">
            <div role="tablist" aria-label="Bagian Notion Config" className="flex items-stretch overflow-x-auto border-b border-[#f0f0f0] bg-[#f8f9fa] dark:border-[#272a34] dark:bg-[#0d0e12] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {visibleTabs.map((t) => {
                const isActive = activeTab === t.id;
                const Icon = t.icon;
                const count = t.id === 'pages' ? counts.databases : undefined;
                const alert = t.id === 'email' && emailNeedsAttention;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectTab(t.id)}
                    className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap border-r border-[#f0f0f0] px-4 py-2.5 text-sm transition-all duration-150 dark:border-[#272a34] cursor-pointer ${
                      isActive
                        ? 'bg-white font-bold text-gray-900 dark:bg-[#16181d] dark:text-white'
                        : 'bg-[#f8f9fa] font-medium text-gray-600 hover:bg-[#f0f1f3] hover:text-gray-900 dark:bg-[#0d0e12] dark:text-gray-400 dark:hover:bg-[#16181d]/50 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#ff5e1f]' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span>{t.label}</span>
                    {count !== undefined && count > 0 && (
                      <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isActive ? 'bg-[#ff5e1f]/10 text-[#ff5e1f]' : 'bg-gray-200/60 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{count}</span>
                    )}
                    {alert && (
                      <span aria-label="Perlu perhatian" className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">!</span>
                    )}
                    {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ff5e1f]" />}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin text-[#ff5e1f]" /> Memuat konfigurasi…
              </div>
            ) : (
              <div role="tabpanel">
                {activeTab === 'koneksi' && (
                  <KoneksiTab config={config} onConnect={openConnect} onDisconnect={handleDisconnect} onOpenPages={() => selectTab('pages')} />
                )}
                {activeTab === 'pages' && <PagesDatabasesTab onChanged={loadConfig} onOpenAssetTab={() => selectTab('asset')} />}
                {activeTab === 'sync' && <SyncTab autoSync={config.autoSync} syncInterval={config.syncInterval} latestSyncLog={latestSyncLog} onSaved={loadConfig} />}
                {activeTab === 'asset' && <AssetLibraryNotionCard />}
                {activeTab === 'email' && <EmailConfigCard onStatusChange={(needs) => setEmailNeedsAttention(needs)} />}
              </div>
            )}
          </div>
        </main>
      </div>

      {showApiKeyModal && (
        <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label="Hubungkan Notion">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowApiKeyModal(false)} />
          <form onSubmit={handleSaveApiKey} className="relative flex h-full w-full max-w-140 flex-col border-l border-[#f0f0f0] bg-white font-sans shadow-2xl animate-[slideInRight_180ms_ease-out] dark:border-[#272a34] dark:bg-[#0d0e12]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#f0f0f0] bg-gray-50/50 px-5 py-4 dark:border-[#272a34] dark:bg-[#16181d]/50">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center border border-[#f0f0f0] bg-white text-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d]"><Key className="h-4 w-4" /></div>
                <div>
                  <h2 className="text-sm font-bold uppercase text-gray-900 dark:text-white">{config.exists ? 'Ganti API Key' : 'Hubungkan Notion'}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Internal Integration Secret dari notion.so/my-integrations</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowApiKeyModal(false)} aria-label="Tutup" className="flex size-8 items-center justify-center border border-[#f0f0f0] bg-white text-gray-500 hover:text-gray-900 dark:border-[#272a34] dark:bg-[#16181d] dark:hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-[#f0f0f0] overflow-y-auto dark:divide-[#272a34]">
              <div className="flex min-h-11 items-stretch text-xs">
                <label htmlFor="nc-name" className="flex w-[150px] shrink-0 items-center border-r border-[#f0f0f0] bg-gray-50/50 px-5 font-bold text-gray-500 dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-400">Workspace</label>
                <input id="nc-name" value={inputWorkspaceName} onChange={(e) => setInputWorkspaceName(e.target.value)} placeholder="Nama workspace" required
                  className="min-h-11 w-full rounded-none border-0 bg-gray-50/50 px-5 text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#ff5e1f] dark:bg-[#16181d]/50 dark:text-white dark:focus:bg-[#16181d]" />
              </div>
              <div className="flex min-h-11 items-stretch text-xs">
                <label htmlFor="nc-key" className="flex w-[150px] shrink-0 items-center border-r border-[#f0f0f0] bg-gray-50/50 px-5 font-bold text-gray-500 dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-400">API key</label>
                <div className="relative flex-1">
                  <input id="nc-key" type={showApiKey ? 'text' : 'password'} value={inputApiKey} onChange={(e) => setInputApiKey(e.target.value)} placeholder="ntn_… / secret_…" required
                    className="min-h-11 w-full rounded-none border-0 bg-gray-50/50 pl-5 pr-11 font-mono text-xs text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#ff5e1f] dark:bg-[#16181d]/50 dark:text-white dark:focus:bg-[#16181d]" />
                  <button type="button" onClick={() => setShowApiKey((v) => !v)} aria-label={showApiKey ? 'Sembunyikan API key' : 'Tampilkan API key'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer">
                    {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            {apiFeedback && (
              <div className="flex shrink-0 items-center gap-2 border-t border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />{apiFeedback}
              </div>
            )}
            <div className="grid shrink-0 grid-cols-2 divide-x divide-[#f0f0f0] border-t border-[#f0f0f0] dark:divide-[#272a34] dark:border-[#272a34]">
              <button type="button" onClick={() => setShowApiKeyModal(false)} className="w-full bg-gray-50/50 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:bg-[#16181d]/50 dark:text-gray-300 dark:hover:bg-[#16181d] cursor-pointer">Batal</button>
              <button type="submit" disabled={isSavingApiKey || !inputWorkspaceName || !inputApiKey} className="flex w-full items-center justify-center gap-2 bg-[#ff5e1f] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-50 cursor-pointer">
                {isSavingApiKey ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
