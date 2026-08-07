'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getNotionConfigAction, 
  addNotionDatabaseAction,
  testNotionConnectionAction,
  deleteNotionDatabaseAction
} from '@/app/actions/notion-config';
import { getLatestSyncStatus } from '@/app/actions/sync';
import Sidebar from '@/components/Sidebar';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  EyeOff, 
  Save, 
  Activity,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Key,
  Edit2,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { NotionLogo } from '@/logo/NotionLogo';

export default function DatabasesPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [configExists, setConfigExists] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [databases, setDatabases] = useState<any[]>([]);
  const [latestSyncLog, setLatestSyncLog] = useState<any>(null);

  // Modals state
  const [showDbModal, setShowDbModal] = useState(false);

  // DB Form
  const [inputDbName, setInputDbName] = useState('');
  const [inputDbId, setInputDbId] = useState('');
  const [showDbId, setShowDbId] = useState(false);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<any>(null);
  const [dbFeedback, setDbFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const loadData = async () => {
    try {
      const config = await getNotionConfigAction();
      setConfigExists(config.exists);
      if (config.exists) {
        setMaskedApiKey(config.maskedApiKey || '');
        setDatabases(config.databases || []);
      } else {
        router.push('/notion-config');
      }
      
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

  const handleDeleteDatabase = async (dbId: string) => {
    if (window.confirm("Are you sure you want to delete this database?")) {
      const res = await deleteNotionDatabaseAction(dbId);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || "Failed to delete database.");
      }
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#E8E0D8] dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
              Notion Configuration
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure the connection settings to synchronize tasks directly from your Notion workspace database.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading databases...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            <Link href="/notion-config" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back To Notion Config
            </Link>

            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E8E0D8] dark:border-gray-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-gray-200 dark:border-gray-800">
                  <NotionLogo />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notion</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${databases.length > 0 ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                    <span className="text-sm text-green-500 font-medium">
                      {databases.length > 0 ? `${databases.length} Database Connected` : 'No Database Connected'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-500 border border-green-900/50 rounded-full">
                <CheckCircle2 className="w-4 h-4" />
                API Key : {maskedApiKey}
              </div>
            </div>

            <div className="w-full bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-6">
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Database Connection</h3>
                <p className="text-xs text-gray-500">Credentials Are Encrypted Symmetrically Using AES-256-CBC Before Database Storage.</p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-6">
                
                {databases.length > 0 ? (
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4 px-2">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
                    <span>Select All</span>
                  </div>
                ) : null}

                {databases.length > 0 ? (
                  <div className="space-y-4">
                    {databases.map((db, idx) => (
                      <div key={db.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
                        
                        <div className="flex items-start gap-4">
                          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 mt-1" />
                          <Key className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white mb-2">{db.name}</div>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 text-[10px] text-green-600 dark:text-green-400">
                                <span className="w-1 h-1 rounded-full bg-green-500"></span> Active
                              </span>
                              <span className="text-[10px] text-gray-500">#Read-Content</span>
                              <span className="text-[10px] text-gray-500">#Update-Content</span>
                              <span className="text-[10px] text-gray-500">#Insert-Content</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm ml-8 sm:ml-0">
                          <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                          <button onClick={() => handleDeleteDatabase(db.id)} className="flex items-center gap-1.5 text-red-500/70 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                          
                          <button type="button" className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#22c55e]">
                            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                          </button>
                        </div>
                        
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic py-4">No databases connected yet. Click the button below to add one.</div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => setShowDbModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-400 rounded-xl transition-all shadow-md shadow-indigo-600/10 shrink-0"
                  >
                    <span className="text-lg leading-none">+</span> Add Database
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] relative">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Database</h2>
              <button 
                onClick={() => {
                  setShowDbModal(false);
                  setDbTestResult(null);
                  setInputDbName('');
                  setInputDbId('');
                }} 
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              
              <form onSubmit={handleTestDatabase} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputDbName}
                      onChange={(e) => setInputDbName(e.target.value)}
                      placeholder="Database Name"
                      className="w-full bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 pointer-events-none">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Database ID</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type={showDbId ? 'text' : 'password'}
                      value={inputDbId}
                      onChange={(e) => {
                        setInputDbId(e.target.value);
                        setDbTestResult(null);
                      }}
                      placeholder="Enter 32-character Notion Database ID"
                      className="w-full bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowDbId(!showDbId)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showDbId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-800/50">
                  <div className="flex flex-wrap gap-4 text-[10px] text-green-500/70 font-mono">
                    {dbTestResult?.capabilities?.map((cap: string) => (
                      <span key={cap}>#{cap}</span>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      type="submit"
                      disabled={isTestingDb || !inputDbId}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-green-600 dark:text-green-500 bg-green-50 dark:bg-[#162a1f] hover:bg-green-100 dark:hover:bg-[#1f3a2b] border border-green-200 dark:border-green-900/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isTestingDb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      Test Connection
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDatabase}
                      disabled={isSavingDb || !dbTestResult?.success || !inputDbName}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-400 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isSavingDb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                  </div>
                </div>
              </form>

              {dbTestResult && (
                <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-800 mt-6">
                  {dbTestResult.success ? (
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Database Found & Connected</div>
                            <div className="text-xs text-green-600 dark:text-green-500 mt-0.5">{dbTestResult.dbTitle}</div>
                          </div>
                        </div>
                        <div className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-800/50 text-[10px] text-gray-500 dark:text-gray-400 font-mono border border-gray-200 dark:border-gray-700/50 flex items-center gap-2">
                          <Activity className="w-3 h-3" /> ID : {dbTestResult.maskedDatabaseId}
                        </div>
                      </div>

                      <div className="p-3 bg-green-50 dark:bg-[#162a1f] border border-green-200 dark:border-green-900/50 rounded-xl text-xs text-green-700 dark:text-green-500 flex gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <div>Structured Match: All Required Columns Are Present And Typed Correctly. The Database Is Fully Ready To Sync Data!</div>
                      </div>

                      <div className="pt-2">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Notion Column Schema Mapping</h4>
                        <div className="space-y-2">
                          {dbTestResult.schemaComparison.map((field: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/50">
                              <div className="flex items-center gap-3">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest ${field.isRequired ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                  {field.isRequired ? 'REQUIRED' : 'OPTIONAL'}
                                </span>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-200">{field.key}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">{field.label}</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-[10px]">
                                <span className="text-gray-500 font-mono">Expected: {field.expectedType}</span>
                                <span className={`px-2 py-1 rounded-full border ${getStatusColor(field.status, field.isRequired)} flex items-center gap-1`}>
                                  {field.status === 'match' && <CheckCircle2 className="w-3 h-3" />}
                                  {field.status === 'mismatch' && <AlertTriangle className="w-3 h-3" />}
                                  {field.status === 'missing' && <AlertTriangle className="w-3 h-3" />}
                                  {field.status === 'match' ? `Matched (${field.actualType})` : field.status === 'mismatch' ? `Type Mismatch (${field.actualType})` : 'Missing'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-sm text-red-600 dark:text-red-400 flex gap-2">
                      <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>{dbTestResult.error}</div>
                    </div>
                  )}
                </div>
              )}

              {dbFeedback && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm flex gap-2 mt-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{dbFeedback.message}</span>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
