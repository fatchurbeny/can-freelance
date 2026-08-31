'use client';

import { useState, useEffect } from 'react';
import { 
  getNotionConfigAction, 
  saveNotionWorkspaceAction,
  addNotionDatabaseAction,
  testNotionConnectionAction,
  saveSchedulingConfigAction,
  deleteNotionConfigAction,
} from '@/app/actions/notion-config';
import { getLatestSyncStatus } from '@/app/actions/sync';
import Sidebar from '@/components/Sidebar';
import CloudflareTopBar from '@/components/CloudflareTopBar';
import { 
  Key, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  EyeOff, 
  Save, 
  Activity,
  ArrowRight,
  Server,
  RefreshCw,
  Compass,
  AlertCircle,
  Clock,
  Timer,
  Zap,
  Plus,
  ArrowLeft
} from 'lucide-react';
import SelectDropdown from '@/components/SelectDropdown';
import Image from 'next/image';
import { NotionLogo } from '@/logo/NotionLogo';

import { useRouter } from 'next/navigation';

const SYNC_INTERVAL_OPTIONS = [
  { value: '15_mins',  label: 'Every 15 minutes' },
  { value: '30_mins',  label: 'Every 30 minutes' },
  { value: '1_hour',   label: 'Every 1 hour' },
  { value: '6_hours',  label: 'Every 6 hours' },
  { value: '12_hours', label: 'Every 12 hours' },
  { value: '24_hours', label: 'Every 24 hours' },
];

export default function NotionConfigPage() {
  const router = useRouter();

  const [configExists, setConfigExists] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [databases, setDatabases] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // API Key Form
  const [inputWorkspaceName, setInputWorkspaceName] = useState('');
  const [inputApiKey, setInputApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [apiFeedback, setApiFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Scheduling state
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState('24_hours');
  
  const [latestSyncLog, setLatestSyncLog] = useState<any>(null);

  const loadData = async () => {
    try {
      const config = await getNotionConfigAction();
      setConfigExists(config.exists);
      if (config.exists) {
        setWorkspaceName(config.workspaceName || '');
        setMaskedApiKey(config.maskedApiKey || '');
        setDatabases(config.databases || []);
      }
      setAutoSync(config.autoSync ?? false);
      setSyncInterval(config.syncInterval ?? '24_hours');
      
      const syncStatus = await getLatestSyncStatus();
      setLatestSyncLog(syncStatus);
    } catch (err) {
      console.error('Error loading configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWorkspaceName.trim() || !inputApiKey.trim()) return;

    setIsSavingApiKey(true);
    setApiFeedback(null);

    try {
      const res = await saveNotionWorkspaceAction(inputWorkspaceName, inputApiKey);
      if (res.success) {
        await loadData();
        setShowApiKeyModal(false);
        setInputApiKey('');
        setInputWorkspaceName('');
        // Automatically redirect to databases page
        router.push('/notion-config/databases');
      } else {
        setApiFeedback({ success: false, message: res.error || 'Failed to save API Key.' });
      }
    } catch (err: any) {
      setApiFeedback({ success: false, message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleSaveScheduling = async () => {
    setIsSavingSchedule(true);
    setScheduleFeedback(null);
    try {
      const res = await saveSchedulingConfigAction(autoSync, syncInterval);
      if (res.success) {
        setScheduleFeedback({ success: true, message: 'Scheduled Sync Settings Saved Successfully!' });
        window.dispatchEvent(new Event('notion-config-updated'));
      } else {
        setScheduleFeedback({ success: false, message: res.error || 'Failed to save scheduling settings.' });
      }
    } catch (err: any) {
      setScheduleFeedback({ success: false, message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const getStatusColor = (status: 'match' | 'mismatch' | 'missing', isRequired: boolean) => {
    if (status === 'match') return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30';
    if (status === 'missing' && !isRequired) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <CloudflareTopBar badgeLabel="NOTION CONFIG" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <Sidebar currentSyncLog={latestSyncLog} />

        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col p-6 md:p-8 space-y-6 overflow-x-hidden relative bg-grid-pattern">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-[#ff5e1f] animate-spin" />
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400">Loading configurations...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Single Continuous Symmetrical Cloudflare Outer Table Container */}
            <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">
              
              {/* 2-Column Symmetrical Grid with Vertical Divider Line & Zero Gap */}
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
                
                {/* Left Column: Workspace Connection & Scheduled Sync Settings */}
                <div className="flex flex-col divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                  {/* Row 1: Workspace Connection Card */}
                  <div 
                    onClick={() => {
                      if (configExists) router.push('/notion-config/databases');
                    }}
                    className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${configExists ? 'cursor-pointer hover:bg-gray-50/80 dark:hover:bg-[#16181d]/80' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-[#16181d] rounded-lg flex items-center justify-center shrink-0 border border-[#f0f0f0] dark:border-[#272a34]">
                        <NotionLogo />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {configExists && workspaceName ? workspaceName : 'Notion Workspace'}
                        </h3>
                        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                          {databases.length > 0 ? databases.map(db => db.name).join(', ') : 'No databases connected'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (configExists) router.push('/notion-config/databases');
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors ${
                          configExists 
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer' 
                            : 'text-gray-500 bg-gray-100 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] cursor-default'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${configExists ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                        {databases.length > 0 ? `${databases.length} Database` : (configExists ? '0 Database' : 'No Connection')}
                      </button>

                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!configExists) {
                            setShowApiKeyModal(true);
                          } else {
                            if (window.confirm("Are you sure you want to disconnect? This will remove your API Key and all connected databases.")) {
                              const res = await deleteNotionConfigAction();
                              if (res.success) {
                                await loadData();
                              } else {
                                alert(res.error || "Failed to disconnect.");
                              }
                            }
                          }
                        }}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                          configExists ? 'bg-[#ff5e1f]' : 'bg-gray-400 dark:bg-gray-700'
                        }`}
                      >
                        <span 
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            configExists ? 'translate-x-6' : 'translate-x-1'
                          }`} 
                        />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Scheduled Sync Settings */}
                  {configExists && databases.length > 0 && (
                    <div className="p-5 sm:p-6 space-y-6">
                      <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Timer className="w-4 h-4 text-[#ff5e1f]" />
                          Scheduled Sync Settings
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-6 font-mono">
                          Configure automatic periodic syncs from Notion via external cron endpoints.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end mt-6">
                        <div className="space-y-2.5">
                          <label className="text-xs font-bold font-mono text-gray-900 dark:text-white flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-[#ff5e1f]" />
                            Auto Sync State
                          </label>
                          <div className="h-11 px-3.5 bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${autoSync ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                              <span className="font-bold text-xs font-mono text-gray-900 dark:text-white truncate">
                                {autoSync ? 'Enabled' : 'Disabled'}
                              </span>
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate hidden sm:inline">
                                {autoSync ? '(Cron Active)' : '(Paused)'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAutoSync(!autoSync)}
                              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                autoSync ? 'bg-[#ff5e1f]' : 'bg-gray-300 dark:bg-gray-700'
                              }`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${autoSync ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <label className="text-xs font-bold font-mono text-gray-900 dark:text-white flex items-center gap-2">
                            <Compass className="w-3.5 h-3.5 text-[#ff5e1f]" />
                            Sync Interval
                          </label>
                          <SelectDropdown
                            label="Select Interval"
                            options={SYNC_INTERVAL_OPTIONS}
                            value={syncInterval}
                            onChange={setSyncInterval}
                            disabled={!autoSync}
                            buttonClassName="h-11"
                          />
                        </div>
                      </div>

                      {scheduleFeedback && (
                        <div className={`p-3.5 rounded-lg border flex items-center gap-2 text-xs font-mono ${scheduleFeedback.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                          {scheduleFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                          {scheduleFeedback.message}
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleSaveScheduling}
                          disabled={isSavingSchedule}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-bold text-white bg-[#ff5e1f] hover:bg-[#ff7038] rounded-lg transition-all shadow-none disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingSchedule ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save Schedule
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: How To Setup & Dynamic Sync Summary */}
                <div className="flex flex-col divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                  {/* Section 1: How To Setup */}
                  <div className="p-5 sm:p-6 space-y-6">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Compass className="w-4 h-4 text-[#ff5e1f]" />
                        How To Setup
                      </h2>
                    </div>

                    <div className="space-y-5 text-xs font-mono">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">1</span>
                          Create Integration
                        </h3>
                        <p className="pl-7 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                          Go to <span className="text-[#ff5e1f] font-semibold">notion.so/my-integrations</span>, create an internal integration, and copy the **Internal Integration Secret** (starts with <code className="text-gray-800 dark:text-gray-200">secret_</code>).
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">2</span>
                          Find Database ID
                        </h3>
                        <p className="pl-7 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                          Open your task database page in Notion and copy its URL. The database ID is the 32-character string in the URL path after workspace name:
                          <code className="block mt-2 p-3 bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] rounded-lg font-mono text-[10px] break-all text-gray-700 dark:text-gray-300">
                            notion.so/workspace/<span className="font-bold text-[#ff5e1f]">2f40e19aa1358026a0e1d9caab5cdbb7</span>?v=...
                          </code>
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">3</span>
                          Grant Connections
                        </h3>
                        <p className="pl-7 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                          Inside Notion, click the three dots <code className="text-gray-800 dark:text-gray-200">...</code> at top right of database. Click **Add Connections** and search for the integration created in step 1.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Current Sync Summary (Dynamic Status & Logs) */}
                  {configExists && databases.length > 0 && (
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-gray-500 dark:text-gray-400 font-bold">Sync Status</p>
                          <h3 className="mt-1 text-base font-bold text-gray-900 dark:text-white">Current Sync Summary</h3>
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                          latestSyncLog?.status === 'success'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : latestSyncLog?.status === 'running'
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : latestSyncLog?.status === 'failed'
                            ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'border-gray-500/20 bg-gray-500/10 text-gray-500'
                        }`}>
                          {latestSyncLog?.status ? latestSyncLog.status.toUpperCase() : 'BELUM SYNC'}
                        </span>
                      </div>

                      <div className="space-y-3 border-t border-[#f0f0f0] dark:border-[#272a34] pt-4 text-xs font-mono">
                        <div className="flex items-center justify-between gap-4 py-1">
                          <span className="text-gray-500 dark:text-gray-400">Sync Method</span>
                          <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                            {autoSync ? 'Auto Sync (Cron)' : 'Manual Sync'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-1">
                          <span className="text-gray-500 dark:text-gray-400">Sync Interval</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {autoSync
                              ? (SYNC_INTERVAL_OPTIONS.find(o => o.value === syncInterval)?.label || syncInterval)
                              : 'Ketika Menekan Tombol Sync'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-1">
                          <span className="text-gray-500 dark:text-gray-400">Status</span>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                            latestSyncLog?.status === 'success'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : latestSyncLog?.status === 'running'
                              ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : latestSyncLog?.status === 'failed'
                              ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'border-gray-500/20 bg-gray-500/10 text-gray-500'
                          }`}>
                            {latestSyncLog?.status ? latestSyncLog.status.toUpperCase() : 'BELUM SYNC'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-1">
                          <span className="text-gray-500 dark:text-gray-400">Synced At</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {latestSyncLog?.finishedAt || latestSyncLog?.startedAt
                              ? `${new Date(latestSyncLog.finishedAt || latestSyncLog.startedAt).toLocaleDateString('id-ID')} ${new Date(latestSyncLog.finishedAt || latestSyncLog.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                              : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-1">
                          <span className="text-gray-500 dark:text-gray-400">Records Synced</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {latestSyncLog?.recordsSynced ?? 0} Data
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}
      </main>

      {/* API Key Modal Overlay */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] w-full max-w-lg rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Notion API Key</h2>
            
            <form onSubmit={handleSaveApiKey} className="space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 dark:text-gray-300">Name</label>
                <input
                  type="text"
                  value={inputWorkspaceName}
                  onChange={(e) => setInputWorkspaceName(e.target.value)}
                  placeholder="Database Name"
                  className="w-full bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] rounded-lg px-3.5 py-2 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-[#ff5e1f] transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 dark:text-gray-300">Notion API Key (Integration Secret)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={inputApiKey}
                    onChange={(e) => setInputApiKey(e.target.value)}
                    placeholder="secret_..."
                    className="w-full bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] rounded-lg pl-9 pr-9 py-2 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:border-[#ff5e1f] transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {apiFeedback && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{apiFeedback.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[#f0f0f0] dark:border-[#272a34]">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 text-xs font-mono text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingApiKey || !inputWorkspaceName || !inputApiKey}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-bold text-white bg-[#ff5e1f] hover:bg-[#ff7038] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSavingApiKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Notion API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Database Modal has been moved to /notion-config/databases */}
      </div>
    </div>
  );
}
