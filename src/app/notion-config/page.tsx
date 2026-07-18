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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Notion Connector</h2>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
              
              {/* Left Column (Connector) */}
              <div className="xl:col-span-2 space-y-6">
                
                {/* Notion Connector Card */}
                <div 
                  onClick={() => {
                    if (configExists) router.push('/notion-config/databases');
                  }}
                  className={`bg-white dark:bg-[#111827] rounded-2xl border border-[#E8E0D8] dark:border-gray-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${configExists ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1f2937]' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-gray-200 dark:border-gray-800">
                      <svg viewBox="0 0 100 100" className="w-8 h-8 text-black">
                        <path fill="currentColor" d="M19.9 23.3V78l41.6-9.6V20.1L19.9 23.3zm29.1 41.5l-15.3 3.6V42.3L49 38.6v26.2zm0-28.7l-15.3 3.6v-2.3l15.3-3.6v2.3zm19.8 15.6l-15.3 3.6V26.2l15.3-3.6v29.1zm0-31.4l-15.3 3.6v-2.3l15.3-3.6v2.3z"/>
                        <path fill="currentColor" d="M80.1 23.3v54.7L38.5 87.6V78H23.5v9.6L6.1 83.3V20l38.5-8.8 35.5 8.2v3.9zM23.5 28.5V74l39.5-9.1V26.2l-39.5 2.3z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {configExists && workspaceName ? workspaceName : 'Notion Workspace'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
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
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                        configExists 
                          ? 'text-green-500 bg-[#162a1f] border border-green-900/50 hover:bg-[#1f3a2b] cursor-pointer' 
                          : 'text-gray-500 bg-gray-800/50 border border-gray-800 cursor-default'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${configExists ? 'bg-green-500' : 'bg-gray-500'}`}></span>
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
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                        configExists ? 'bg-[#22c55e]' : 'bg-gray-600'
                      }`}
                    >
                      <span 
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          configExists ? 'translate-x-7' : 'translate-x-1'
                        }`} 
                      />
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column (Instructions) */}
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

      {/* Add Database Modal has been moved to /notion-config/databases */}
    </div>
  );
}
