'use client';

import { useState, useEffect } from 'react';
import { 
  getNotionConfigAction, 
  saveNotionWorkspaceAction,
  addNotionDatabaseAction,
  testNotionConnectionAction,
  saveSchedulingConfigAction,
} from '@/app/actions/notion-config';
import { getLatestSyncStatus } from '@/app/actions/sync';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
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
import Image from 'next/image';

const SYNC_INTERVAL_OPTIONS = [
  { value: '15_mins',  label: 'Every 15 minutes' },
  { value: '30_mins',  label: 'Every 30 minutes' },
  { value: '1_hour',   label: 'Every 1 hour' },
  { value: '6_hours',  label: 'Every 6 hours' },
  { value: '12_hours', label: 'Every 12 hours' },
  { value: '24_hours', label: 'Every 24 hours' },
];

export default function NotionConfigPage() {
  const [configExists, setConfigExists] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [databases, setDatabases] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);

  // API Key Form
  const [inputWorkspaceName, setInputWorkspaceName] = useState('');
  const [inputApiKey, setInputApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // DB Form
  const [inputDbName, setInputDbName] = useState('');
  const [inputDbId, setInputDbId] = useState('');
  const [showDbId, setShowDbId] = useState(false);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<any>(null);
  const [dbFeedback, setDbFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Scheduling state
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState('24_hours');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState<{ success: boolean; message: string } | null>(null);
  
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
      } else {
        setApiFeedback({ success: false, message: res.error || 'Failed to save API Key.' });
      }
    } catch (err: any) {
      setApiFeedback({ success: false, message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleTestDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDbId.trim()) return;

    setIsTestingDb(true);
    setDbTestResult(null);
    setDbFeedback(null);
    
    try {
      const res = await testNotionConnectionAction(inputDbId);
      setDbTestResult(res);
      if (res.success && res.dbTitle) {
        if (!inputDbName) setInputDbName(res.dbTitle);
      }
    } catch (err: any) {
      setDbTestResult({ success: false, error: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleSaveDatabase = async () => {
    if (!inputDbName.trim() || !inputDbId.trim()) return;
    if (dbTestResult && !dbTestResult.success) return;

    setIsSavingDb(true);
    setDbFeedback(null);

    try {
      const res = await addNotionDatabaseAction(inputDbName, inputDbId);
      if (res.success) {
        await loadData();
        setShowDbModal(false);
        setInputDbName('');
        setInputDbId('');
        setDbTestResult(null);
      } else {
        setDbFeedback({ success: false, message: res.error || 'Failed to add database.' });
      }
    } catch (err: any) {
      setDbFeedback({ success: false, message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSavingDb(false);
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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F5F0EB] dark:bg-[#0a0b0e] text-gray-900 dark:text-gray-100 transition-colors">
      <Sidebar currentSyncLog={latestSyncLog} />

      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-x-hidden relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#E8E0D8] dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
              Notion Configuration
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure the connection settings to synchronize tasks directly from your Notion workspace database.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-medium shadow-sm">
              IS
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading configurations...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back Button Placeholder */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-max">
              <ArrowLeft className="w-4 h-4" />
              <span>Back To Notion Config</span>
            </div>

            {/* Top Workspace Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white dark:bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0 border border-gray-200 dark:border-gray-800">
                  <svg viewBox="0 0 100 100" className="w-10 h-10 text-black">
                    <path fill="currentColor" d="M19.9 23.3V78l41.6-9.6V20.1L19.9 23.3zm29.1 41.5l-15.3 3.6V42.3L49 38.6v26.2zm0-28.7l-15.3 3.6v-2.3l15.3-3.6v2.3zm19.8 15.6l-15.3 3.6V26.2l15.3-3.6v29.1zm0-31.4l-15.3 3.6v-2.3l15.3-3.6v2.3z"/>
                    <path fill="currentColor" d="M80.1 23.3v54.7L38.5 87.6V78H23.5v9.6L6.1 83.3V20l38.5-8.8 35.5 8.2v3.9zM23.5 28.5V74l39.5-9.1V26.2l-39.5 2.3z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notion</h2>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${databases.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {databases.length > 0 ? `${databases.length} Database Connected` : 'No Database Connected'}
                  </div>
                </div>
              </div>

              {!configExists ? (
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10"
                >
                  <Plus className="w-4 h-4" />
                  Notion API Key
                </button>
              ) : (
                <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  API Key : {maskedApiKey}
                </div>
              )}
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start mt-6">
              
              {/* Left Column (Databases & Scheduling) */}
              <div className="xl:col-span-2 space-y-6">
                
                {/* Database Connection Card */}
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E8E0D8] dark:border-gray-800 p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Database Connection
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Credentials Are Encrypted Symmetrically Using AES-256-CBC Before Database Storage.
                    </p>
                  </div>
                  
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                    {databases.length === 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800" disabled />
                          <span className="text-sm text-gray-500 dark:text-gray-400">Select All</span>
                        </div>
                        <button
                          disabled={!configExists}
                          onClick={() => setShowDbModal(true)}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-800 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
                        >
                          <Plus className="w-4 h-4" />
                          Add Database
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {databases.map((db, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-[#FAF9F6] dark:bg-[#07090e] border border-gray-200 dark:border-gray-800 rounded-xl">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 dark:text-white">{db.name}</span>
                              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">ID: {db.maskedDatabaseId}</span>
                            </div>
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-3 py-1.5 rounded-full text-xs font-medium border border-green-200 dark:border-green-900/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Connected
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => setShowDbModal(true)}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all border border-indigo-200 dark:border-indigo-900/50"
                        >
                          <Plus className="w-4 h-4" />
                          Add Another Database
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scheduled Sync Settings Card */}
                {configExists && (
                  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E8E0D8] dark:border-gray-800 p-6 shadow-sm space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                         <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0">
                          <Timer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                         </div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Scheduled Sync Settings
                          </h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Configure automatic periodic syncs from Notion. The <code className="font-mono">/api/sync/cron</code> endpoint must be called externally.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 pt-2">
                      {/* Auto-Sync Toggle */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#FAF9F6] dark:bg-[#07090e] gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${autoSync ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'}`}>
                            <Zap className={`w-4 h-4 ${autoSync ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-900 dark:text-white">Auto Sync</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                              {autoSync ? 'Enabled - Cron Endpoint Active' : 'Disabled'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAutoSync(!autoSync)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                            autoSync ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${autoSync ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>

                      {/* Interval Picker */}
                      <div className="flex flex-col justify-center">
                        <label htmlFor="sync-interval-select" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                          <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Sync Interval
                        </label>
                        <select
                          id="sync-interval-select"
                          value={syncInterval}
                          onChange={(e) => setSyncInterval(e.target.value)}
                          disabled={!autoSync}
                          className="py-2.5 px-4 w-full border border-gray-300 dark:border-gray-800 bg-[#FAF9F6] dark:bg-[#07090e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-transparent text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                        >
                          {SYNC_INTERVAL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Scheduling Feedback */}
                    {scheduleFeedback && (
                      <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
                        scheduleFeedback.success 
                          ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30' 
                          : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30'
                      }`}>
                        {scheduleFeedback.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                        <span>{scheduleFeedback.message}</span>
                      </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={handleSaveScheduling}
                        disabled={isSavingSchedule}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
                      >
                        {isSavingSchedule ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" />Saving...</>
                        ) : (
                          <><Save className="w-4 h-4" />Save Schedule</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (Instructions & Logs) */}
              <div className="space-y-6">
                <div className="bg-[#1a1c23] dark:bg-[#111827] text-gray-300 rounded-2xl border border-gray-800 p-6 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Compass className="w-5 h-5 text-indigo-400" />
                      How To Setup
                    </h2>
                  </div>

                  <div className="space-y-5 text-sm">
                    <div className="space-y-2">
                      <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded bg-indigo-900/50 text-indigo-400 flex items-center justify-center font-mono text-[10px]">1</span>
                        Create Integration
                      </h3>
                      <p className="pl-7 text-xs leading-relaxed text-gray-400">
                        Go To <span className="text-indigo-400">Notion.So/Integrations</span>, Create An Internal Integration, And Copy The **Internal Integration Token** (Starts With `secret_`)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded bg-indigo-900/50 text-indigo-400 flex items-center justify-center font-mono text-[10px]">2</span>
                        Find Database ID
                      </h3>
                      <p className="pl-7 text-xs leading-relaxed text-gray-400">
                        Open Your Task Database Page In Notion. Copy Its URL. The Database ID Is The 32-Character String In The Path After The Workspace Name:
                        <code className="block mt-2 p-3 bg-black/40 border border-gray-800/60 rounded-xl font-mono text-[10px] break-all text-indigo-300">
                          notion.so/workspace/<span className="font-bold text-red-400">2f40e19aa1358026a0e1d9caab5cdbb7</span>?v=...
                        </code>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded bg-indigo-900/50 text-indigo-400 flex items-center justify-center font-mono text-[10px]">3</span>
                        Grant Connections
                      </h3>
                      <p className="pl-7 text-xs leading-relaxed text-gray-400">
                        Inside Notion, Click The Three Dots `...` At The Top Right Of Your Database. Click **Add Connections** And Search For The Name Of The Integration You Created In Step 1.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sync Logs Widget */}
                {latestSyncLog && (
                  <div className="bg-[#1a1c23] dark:bg-[#111827] text-gray-300 rounded-2xl border border-gray-800 p-6 shadow-sm space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Sync Metode</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full border border-indigo-500/30 text-xs font-semibold text-indigo-400">
                          {autoSync ? 'AUTO SYNC' : 'MANUAL'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Sync Interval</span>
                        <span className="text-white font-medium">
                          {SYNC_INTERVAL_OPTIONS.find(o => o.value === syncInterval)?.label || 'None'}
                        </span>
                      </div>
                      <div className="border-b border-gray-800/60 pt-2 mb-2"></div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Status</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold uppercase ${
                          latestSyncLog.status === 'success' 
                            ? 'border-green-500/30 text-green-400' 
                            : 'border-red-500/30 text-red-400'
                        }`}>
                          {latestSyncLog.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Synced At</span>
                        <span className="text-white font-medium">
                          {new Date(latestSyncLog.finishedAt || latestSyncLog.startedAt).toLocaleString('id-ID')}
                        </span>
                      </div>

                      {latestSyncLog.recordsSynced !== null && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">Records Synced</span>
                          <span className="text-white font-bold">
                            {latestSyncLog.recordsSynced}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </main>

      {/* API Key Modal Overlay */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-2">Add Notion API Key</h2>
            
            <form onSubmit={handleSaveApiKey} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Name</label>
                <input
                  type="text"
                  value={inputWorkspaceName}
                  onChange={(e) => setInputWorkspaceName(e.target.value)}
                  placeholder="Database Name"
                  className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Notion API Key (Integration Secret)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={inputApiKey}
                    onChange={(e) => setInputApiKey(e.target.value)}
                    placeholder="secret_..."
                    className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {apiFeedback && (
                <div className="p-3 rounded-xl bg-red-900/20 border border-red-900/50 text-red-400 text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{apiFeedback.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingApiKey || !inputWorkspaceName || !inputApiKey}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingApiKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Notion API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Database Modal Overlay */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 my-8">
            <h2 className="text-xl font-bold text-white mb-2">Connect New Database</h2>
            
            <form onSubmit={handleTestDatabase} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Notion Database ID</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <Database className="w-4 h-4" />
                    </div>
                    <input
                      type={showDbId ? 'text' : 'password'}
                      value={inputDbId}
                      onChange={(e) => {
                        setInputDbId(e.target.value);
                        setDbTestResult(null);
                      }}
                      placeholder="Enter 32-character Notion Database ID"
                      className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowDbId(!showDbId)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                    >
                      {showDbId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isTestingDb || !inputDbId}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-indigo-400 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-900/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTestingDb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    Test
                  </button>
                </div>
              </div>
            </form>

            {dbTestResult && (
              <div className="space-y-4 pt-4 border-t border-gray-800">
                {dbTestResult.success ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-green-950/20 border border-green-900/30 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-semibold text-green-400 text-sm">Database Connected Successfully!</div>
                        <div className="text-xs text-green-500/70">{dbTestResult.dbTitle}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Save As (Name)</label>
                      <input
                        type="text"
                        value={inputDbName}
                        onChange={(e) => setInputDbName(e.target.value)}
                        placeholder="E.g. Main Tasks"
                        className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {!dbTestResult.isSchemaCompatible && (
                      <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-xs text-red-400 flex gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <div>Warning: Schema compatibility issues detected. Some columns may not sync correctly.</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-sm text-red-400 flex gap-2">
                    <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>{dbTestResult.error}</div>
                  </div>
                )}
              </div>
            )}

            {dbFeedback && (
              <div className="p-3 rounded-xl bg-red-900/20 border border-red-900/50 text-red-400 text-sm flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{dbFeedback.message}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowDbModal(false);
                  setDbTestResult(null);
                  setInputDbName('');
                  setInputDbId('');
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDatabase}
                disabled={isSavingDb || !dbTestResult?.success || !inputDbName}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingDb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Add Database
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
