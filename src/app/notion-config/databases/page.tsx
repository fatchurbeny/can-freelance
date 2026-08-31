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
import CloudflareTopBar from '@/components/CloudflareTopBar';

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

  const handleDeleteDatabase = async (id: string) => {
    if (window.confirm("Are you sure you want to disconnect this database?")) {
      const res = await deleteNotionDatabaseAction(id);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || "Failed to delete database.");
      }
    }
  };

  const getStatusColor = (status: 'match' | 'mismatch' | 'missing', isRequired: boolean) => {
    if (status === 'match') return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'missing' && !isRequired) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <CloudflareTopBar badgeLabel="NOTION CONFIG" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <Sidebar currentSyncLog={latestSyncLog} />

        <main className="flex-1 md:ml-56 p-6 md:p-8 space-y-6 overflow-x-hidden relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-[#ff5e1f] animate-spin" />
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400">Loading databases...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Cloudflare Style Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-sans">
              <Link
                href="/notion-config"
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                Notion Config
              </Link>
              <span className="text-gray-400 dark:text-gray-600 font-normal">/</span>
              <span className="font-bold text-gray-900 dark:text-white">
                Databases
              </span>
            </nav>

            <div className="w-full rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">
              {/* Header Section */}
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-[#16181d] rounded-lg flex items-center justify-center shrink-0 border border-[#f0f0f0] dark:border-[#272a34]">
                    <NotionLogo />
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white">Notion Workspace</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${databases.length > 0 ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                      <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {databases.length > 0 ? `${databases.length} Database Connected` : 'No Database Connected'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  API Key : {maskedApiKey}
                </div>
              </div>

              {/* Database Connection Section */}
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold font-sans text-gray-900 dark:text-white mb-1">Database Connection</h3>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">Credentials are encrypted symmetrically using AES-256-CBC before database storage.</p>
                </div>

                <div className="border-t border-[#f0f0f0] dark:border-[#272a34] pt-6 space-y-6">
                  {databases.length > 0 ? (
                    <div className="flex items-center gap-3 text-xs font-mono text-gray-500 dark:text-gray-400 px-1">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-[#ff5e1f] focus:ring-[#ff5e1f] cursor-pointer" />
                      <span className="font-bold">Select All</span>
                    </div>
                  ) : null}

                  {databases.length > 0 ? (
                    <div className="space-y-4">
                      {databases.map((db, idx) => (
                        <div key={db.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100/80 dark:hover:bg-[#16181d] transition-colors">
                          
                          <div className="flex items-start gap-4">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-[#ff5e1f] focus:ring-[#ff5e1f] mt-1 cursor-pointer" />
                            <Key className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            
                            <div>
                              <div className="font-bold font-sans text-sm text-gray-900 dark:text-white mb-1.5">{db.name}</div>
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                                </span>
                                <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">#Read-Content</span>
                                <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">#Update-Content</span>
                                <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">#Insert-Content</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 text-sm ml-8 sm:ml-0">
                            <button className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer">
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button onClick={() => handleDeleteDatabase(db.id)} className="flex items-center gap-1.5 text-xs font-mono text-red-500/70 hover:text-red-500 transition-colors cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                            
                            <button type="button" className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#ff5e1f] focus:outline-none cursor-pointer">
                              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                            </button>
                          </div>
                          
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-gray-500 italic py-4">No databases connected yet. Click the button below to add one.</div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => setShowDbModal(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-bold text-white bg-[#ff5e1f] hover:bg-[#ff7038] rounded-lg transition-all shadow-none cursor-pointer"
                    >
                      <span className="text-sm leading-none">+</span> Add Database
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </main>

      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[95vh] relative text-xs font-mono">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#f0f0f0] dark:border-[#272a34] shrink-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Database</h2>
              <button 
                onClick={() => {
                  setShowDbModal(false);
                  setDbTestResult(null);
                  setInputDbName('');
                  setInputDbId('');
                }} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto space-y-6">
              
              <form onSubmit={handleTestDatabase} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700 dark:text-gray-300">Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputDbName}
                      onChange={(e) => setInputDbName(e.target.value)}
                      placeholder="Database Name"
                      className="w-full bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] rounded-lg px-3.5 py-2 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:border-[#ff5e1f] transition-colors"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 pointer-events-none">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700 dark:text-gray-300">Database ID</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Key className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showDbId ? 'text' : 'password'}
                      value={inputDbId}
                      onChange={(e) => {
                        setInputDbId(e.target.value);
                        setDbTestResult(null);
                      }}
                      placeholder="Enter 32-character Notion Database ID"
                      className="w-full bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] rounded-lg pl-9 pr-9 py-2 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:border-[#ff5e1f] transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowDbId(!showDbId)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      {showDbId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-[#f0f0f0] dark:border-[#272a34]">
                  <div className="flex flex-wrap gap-4 text-[10px] text-emerald-500 font-mono">
                    {dbTestResult?.capabilities?.map((cap: string) => (
                      <span key={cap}>#{cap}</span>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      type="submit"
                      disabled={isTestingDb || !inputDbId}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                    >
                      {isTestingDb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      Test Connection
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDatabase}
                      disabled={isSavingDb || !dbTestResult?.success || !inputDbName}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-bold text-white bg-[#ff5e1f] hover:bg-[#ff7038] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                    >
                      {isSavingDb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                  </div>
                </div>
              </form>

              {dbTestResult && (
                <div className="space-y-4 pt-4 border-t border-[#f0f0f0] dark:border-[#272a34] mt-4">
                  {dbTestResult.success ? (
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-xs">{dbTestResult.dbTitle}</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Database Found & Connected</div>
                          </div>
                        </div>
                        <div className="px-2.5 py-1 rounded bg-white dark:bg-[#0d0e12] text-[10px] text-gray-500 dark:text-gray-400 font-mono border border-[#f0f0f0] dark:border-[#272a34] flex items-center gap-2">
                          <Activity className="w-3 h-3" /> ID : {dbTestResult.maskedDatabaseId}
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 flex gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <div>Structured Match: All Required Columns Are Present And Typed Correctly. The Database Is Fully Ready To Sync Data!</div>
                      </div>

                      <div className="pt-2">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Notion Column Schema Mapping</h4>
                        <div className="space-y-2">
                          {dbTestResult.schemaComparison.map((field: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34]">
                              <div className="flex items-center gap-3">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest ${field.isRequired ? 'bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                  {field.isRequired ? 'REQUIRED' : 'OPTIONAL'}
                                </span>
                                <div>
                                  <div className="text-xs font-bold text-gray-900 dark:text-gray-200">{field.key}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">{field.label}</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-[10px]">
                                <span className="text-gray-500 font-mono">Expected: {field.expectedType}</span>
                                <span className={`px-2 py-0.5 rounded-full border ${getStatusColor(field.status, field.isRequired)} flex items-center gap-1 font-bold`}>
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
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 flex gap-2">
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{dbTestResult.error}</div>
                    </div>
                  )}
                </div>
              )}

              {dbFeedback && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono flex gap-2 mt-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{dbFeedback.message}</span>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
