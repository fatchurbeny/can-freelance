'use client';

import { useState, useEffect } from 'react';
import { 
  getNotionConfigAction, 
  saveNotionConfigAction, 
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
} from 'lucide-react';

const SYNC_INTERVAL_OPTIONS = [
  { value: '15_mins',  label: 'Every 15 minutes' },
  { value: '30_mins',  label: 'Every 30 minutes' },
  { value: '1_hour',   label: 'Every 1 hour' },
  { value: '6_hours',  label: 'Every 6 hours' },
  { value: '12_hours', label: 'Every 12 hours' },
  { value: '24_hours', label: 'Every 24 hours' },
];

export default function NotionConfigPage() {
  const [apiKey, setApiKey] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDatabaseId, setShowDatabaseId] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Scheduling state
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState('15_mins');
  const [scheduleFeedback, setScheduleFeedback] = useState<{ success: boolean; message: string } | null>(null);
  
  const [testResult, setTestResult] = useState<{
    success: boolean;
    dbTitle?: string;
    maskedDatabaseId?: string;
    schemaComparison?: {
      key: string;
      label: string;
      expectedType: string;
      actualType: string | null;
      actualName: string | null;
      status: 'match' | 'mismatch' | 'missing';
      isRequired: boolean;
    }[];
    isSchemaCompatible?: boolean;
    error?: string;
  } | null>(null);

  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  const [latestSyncLog, setLatestSyncLog] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const config = await getNotionConfigAction();
        if (config.exists) {
          setApiKey(config.apiKey);
          setDatabaseId(config.databaseId);
        }
        // Load scheduling settings regardless of credentials
        setAutoSync(config.autoSync ?? false);
        setSyncInterval(config.syncInterval ?? '15_mins');
        
        const syncStatus = await getLatestSyncStatus();
        setLatestSyncLog(syncStatus);
      } catch (err) {
        console.error('Error loading configuration:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !databaseId.trim()) return;

    setIsTesting(true);
    setTestResult(null);
    setFeedback(null);
    
    try {
      const res = await testNotionConnectionAction(apiKey, databaseId);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'An unexpected error occurred during connection testing.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!apiKey.trim() || !databaseId.trim()) return;
    if (testResult && !testResult.success) return;

    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await saveNotionConfigAction(apiKey, databaseId);
      if (res.success) {
        setFeedback({
          success: true,
          message: 'Notion connection settings saved and encrypted successfully!',
        });
        
        // Refresh local details masking
        const config = await getNotionConfigAction();
        if (config.exists) {
          setApiKey(config.apiKey);
          setDatabaseId(config.databaseId);
        }
      } else {
        setFeedback({
          success: false,
          message: res.error || 'Failed to save settings.',
        });
      }
    } catch (err: any) {
      setFeedback({
        success: false,
        message: err.message || 'Failed to save configuration settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveScheduling = async () => {
    setIsSavingSchedule(true);
    setScheduleFeedback(null);
    try {
      const res = await saveSchedulingConfigAction(autoSync, syncInterval);
      if (res.success) {
        setScheduleFeedback({ success: true, message: 'Scheduled sync settings saved successfully!' });
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

      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-x-hidden">
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Setup Form (Col 1 & 2) */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E8E0D8] dark:border-gray-800 p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-indigo-600" />
                    Credentials Settings
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Credentials are encrypted symmetrically using AES-256-CBC before database storage.
                  </p>
                </div>

                <form onSubmit={handleTestConnection} className="space-y-4">
                  {/* API Key */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                      Notion API Key (Integration Secret)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setTestResult(null); // Reset tests if edited
                          setFeedback(null);
                        }}
                        placeholder="secret_..."
                        className="pl-10 pr-10 py-3 w-full border border-gray-300 dark:border-gray-800 bg-[#FAF9F6] dark:bg-[#07090e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-transparent text-sm font-mono tracking-wide"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Database ID */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                      Notion Database ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Database className="w-4 h-4" />
                      </div>
                      <input
                        type={showDatabaseId ? 'text' : 'password'}
                        value={databaseId}
                        onChange={(e) => {
                          setDatabaseId(e.target.value);
                          setTestResult(null); // Reset tests if edited
                          setFeedback(null);
                        }}
                        placeholder="Enter 32-character Notion Database ID"
                        className="pl-10 pr-10 py-3 w-full border border-gray-300 dark:border-gray-800 bg-[#FAF9F6] dark:bg-[#07090e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-transparent text-sm font-mono tracking-wide"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowDatabaseId(!showDatabaseId)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showDatabaseId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      type="submit"
                      disabled={isTesting || isSaving || !apiKey.trim() || !databaseId.trim()}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Testing Connection...
                        </>
                      ) : (
                        <>
                          <Activity className="w-4 h-4" />
                          Test Connection
                        </>
                      )}
                    </button>
                    
                    {testResult?.success && (
                      <button
                        type="button"
                        onClick={handleSaveConfig}
                        disabled={isSaving || isTesting || !testResult.isSchemaCompatible}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 disabled:bg-gray-400 dark:disabled:bg-gray-800 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-green-600/10 ml-auto"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Config
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>

                {/* Feedback Toast/Banner */}
                {feedback && (
                  <div className={`p-4 rounded-xl border flex gap-3 text-sm ${
                    feedback.success 
                      ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900/30' 
                      : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/30'
                  }`}>
                    {feedback.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                    <span>{feedback.message}</span>
                  </div>
                )}
              </div>

              {/* Schema Validation Details */}
              {testResult && (
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E8E0D8] dark:border-gray-800 p-6 shadow-sm space-y-6">
                  {testResult.success ? (
                    <>
                      {/* Success Metadata Panel */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-green-50/50 dark:bg-green-950/5 border border-green-100 dark:border-green-950/20 rounded-xl gap-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              Database Found & Connected
                            </h3>
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">
                              {testResult.dbTitle}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg font-mono text-gray-500 dark:text-gray-400">
                          ID: {testResult.maskedDatabaseId}
                        </div>
                      </div>

                      {/* Schema status summary */}
                      {testResult.isSchemaCompatible ? (
                        <div className="p-4 bg-green-50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/20 text-green-800 dark:text-green-300 rounded-xl text-sm flex gap-3">
                          <Compass className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                          <div>
                            <span className="font-semibold">Structure Match:</span> All required columns are present and typed correctly. The database is fully ready to sync data!
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/20 text-red-800 dark:text-red-300 rounded-xl text-sm flex gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                          <div>
                            <span className="font-semibold">Structure Conflict:</span> One or more required columns are missing or have incorrect property types in Notion. Please adjust your Notion database headers.
                          </div>
                        </div>
                      )}

                      {/* Properties Comparison List */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
                          Notion Column Schema Mapping
                        </h4>
                        
                        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                          {testResult.schemaComparison?.map((prop) => (
                            <div key={prop.key} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 text-sm gap-2">
                              <div className="flex items-start gap-2.5">
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  prop.isRequired 
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' 
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                  {prop.isRequired ? 'REQUIRED' : 'OPTIONAL'}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    {prop.key}
                                    {prop.actualName && prop.actualName !== prop.key && (
                                      <span className="text-xs font-normal text-gray-400 dark:text-gray-500 font-mono">
                                        (mapped to &quot;{prop.actualName}&quot;)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {prop.label}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 w-full sm:w-auto sm:justify-end">
                                <div className="text-xs text-right font-mono hidden md:block">
                                  <span className="text-gray-400">Expected:</span> <span className="text-gray-700 dark:text-gray-300 font-medium">{prop.expectedType}</span>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(prop.status, prop.isRequired)}`}>
                                  {prop.status === 'match' && (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>Matched ({prop.actualType})</span>
                                    </>
                                  )}
                                  {prop.status === 'missing' && (
                                    <>
                                      {prop.isRequired ? <XCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                                      <span>Missing</span>
                                    </>
                                  )}
                                  {prop.status === 'mismatch' && (
                                    <>
                                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>Mismatch ({prop.actualType})</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/20 text-red-800 dark:text-red-300 rounded-xl text-sm flex gap-3">
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                      <div>
                        <span className="font-semibold">Connection Failed:</span> {testResult.error}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scheduled Sync Settings Card */}
            <div className="xl:col-span-2">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E8E0D8] dark:border-gray-800 p-6 shadow-sm space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Timer className="w-5 h-5 text-indigo-600" />
                      Scheduled Sync Settings
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Configure automatic periodic syncs from Notion. The <code className="font-mono text-indigo-600 dark:text-indigo-400">/api/sync/cron</code> endpoint must be called externally (e.g. Vercel Cron, GitHub Actions, or a system cron).
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  {/* Auto-Sync Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAF9F6] dark:bg-[#07090e] gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autoSync ? 'bg-indigo-100 dark:bg-indigo-950/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <Zap className={`w-5 h-5 ${autoSync ? 'text-indigo-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">Auto Sync</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {autoSync ? 'Enabled — cron endpoint active' : 'Disabled — manual only'}
                        </div>
                      </div>
                    </div>
                    <button
                      id="auto-sync-toggle"
                      type="button"
                      onClick={() => setAutoSync(!autoSync)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                        autoSync ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      aria-checked={autoSync}
                      role="switch"
                      aria-label="Toggle auto sync"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                          autoSync ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Interval Picker */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="sync-interval-select" className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Sync Interval
                    </label>
                    <select
                      id="sync-interval-select"
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(e.target.value)}
                      disabled={!autoSync}
                      className="py-3 px-4 w-full border border-gray-300 dark:border-gray-700 bg-[#FAF9F6] dark:bg-[#07090e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-transparent text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                      {SYNC_INTERVAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {!autoSync && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">Enable Auto Sync to activate interval selection.</p>
                    )}
                  </div>
                </div>

                {/* Scheduling Feedback */}
                {scheduleFeedback && (
                  <div className={`p-4 rounded-xl border flex gap-3 text-sm ${
                    scheduleFeedback.success 
                      ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900/30' 
                      : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/30'
                  }`}>
                    {scheduleFeedback.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                    <span>{scheduleFeedback.message}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    id="save-schedule-btn"
                    type="button"
                    onClick={handleSaveScheduling}
                    disabled={isSavingSchedule}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
                  >
                    {isSavingSchedule ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" />Saving...</>
                    ) : (
                      <><Save className="w-4 h-4" />Save Schedule</>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E8E0D8] dark:border-gray-800 p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-indigo-600" />
                    How to Setup
                  </h2>
                </div>

                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">1</span>
                      Create Integration
                    </h3>
                    <p className="pl-7 text-xs leading-relaxed">
                      Go to <a href="https://notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">notion.so/integrations</a>, create an Internal Integration, and copy the **Internal Integration Token** (starts with `secret_`).
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">2</span>
                      Find Database ID
                    </h3>
                    <p className="pl-7 text-xs leading-relaxed">
                      Open your task database page in Notion. Copy its URL. The database ID is the 32-character string in the path after the workspace name:
                      <code className="block mt-1.5 p-2 bg-[#FAF9F6] dark:bg-[#07090e] border border-gray-200 dark:border-gray-800 rounded font-mono text-[10px] break-all leading-normal text-indigo-600 dark:text-indigo-400">
                        notion.so/workspace/<span className="font-bold underline text-red-600 dark:text-red-400">2f40e19aa1358026a0e1d9caab5cdbb7</span>?v=...
                      </code>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">3</span>
                      Grant Connections
                    </h3>
                    <p className="pl-7 text-xs leading-relaxed">
                      Inside Notion, click the three dots `...` at the top right of your database. Click **Add connections** and search for the name of the Integration you created in Step 1.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sync Logs */}
              {latestSyncLog && (
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E8E0D8] dark:border-gray-800 p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    Latest Sync Log
                  </h3>
                  
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Status</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        latestSyncLog.status === 'success' 
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
                          : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                      }`}>
                        {latestSyncLog.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Synced At</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {new Date(latestSyncLog.finishedAt || latestSyncLog.startedAt).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {latestSyncLog.recordsSynced !== null && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Records Synced</span>
                        <span className="text-gray-900 dark:text-white font-bold">
                          {latestSyncLog.recordsSynced}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
