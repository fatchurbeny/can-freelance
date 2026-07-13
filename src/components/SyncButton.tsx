'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { triggerSyncAction } from '@/app/actions/sync';
import toast, { Toaster } from 'react-hot-toast';

interface SyncButtonProps {
  initialSyncLog: {
    startedAt: Date;
    finishedAt: Date | null;
    status: string;
    recordsSynced: number | null;
    errorMessage: string | null;
  } | null;
  isCollapsed?: boolean;
}

export default function SyncButton({ initialSyncLog, isCollapsed = false }: SyncButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState(initialSyncLog);
  const [modalState, setModalState] = useState<'idle' | 'syncing' | 'success'>('idle');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setModalState('syncing');
    try {
      const res = await triggerSyncAction();
      if (res.status === 'success') {
        setSyncLog({
          startedAt: new Date(),
          finishedAt: new Date(),
          status: 'success',
          recordsSynced: res.recordsSynced || 0,
          errorMessage: null,
        });
        setModalState('success');
        toast.success('Notion sync completed!', {
          style: {
            background: '#0B0F19',
            color: '#4ade80',
            border: '1px solid #166534',
          },
          iconTheme: {
            primary: '#4ade80',
            secondary: '#0B0F19',
          }
        });
      } else {
        setSyncLog({
          startedAt: new Date(),
          finishedAt: new Date(),
          status: 'failed',
          recordsSynced: 0,
          errorMessage: res.errorMessage || 'Unknown error',
        });
        setModalState('idle');
        toast.error(`Sync failed: ${res.errorMessage || 'Unknown error'}`, {
          style: {
            background: '#0B0F19',
            color: '#f87171',
            border: '1px solid #991b1b',
          }
        });
      }
    } catch (err: any) {
      setSyncLog({
        startedAt: new Date(),
        finishedAt: new Date(),
        status: 'failed',
        recordsSynced: 0,
        errorMessage: err.message || String(err),
      });
      setModalState('idle');
      toast.error(`Sync failed: ${err.message || String(err)}`, {
        style: {
          background: '#0B0F19',
          color: '#f87171',
          border: '1px solid #991b1b',
        }
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = () => {
    if (!syncLog) return 'Belum Pernah Sync';
    const date = syncLog.finishedAt ? new Date(syncLog.finishedAt) : new Date(syncLog.startedAt);
    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    if (syncLog.status === 'success') {
      return `Success (${syncLog.recordsSynced} data) pkl ${timeStr}`;
    }
    return `Gagal pkl ${timeStr}`;
  };

  return (
    <>
      <Toaster position="bottom-center" />
      
      {mounted && modalState !== 'idle' && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-7 w-full max-w-xl shadow-2xl relative">
            <div className="flex items-center gap-4 mb-5">
              {modalState === 'syncing' ? (
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                   <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                   <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
              )}
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {modalState === 'syncing' ? 'Synchronizing Notion Database...' : 'Sync Completed Successfully!'}
              </h2>
            </div>
            
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              {modalState === 'syncing' 
                ? 'Connecting to the Notion integration service and downloading approved briefing items into PostgreSQL cache layer...'
                : 'All tasks with "Completed (Approved)" status have been merged into the database.'}
            </p>

            <div className="bg-[#0B0F19] border border-gray-800 rounded-xl p-5 font-mono text-[13px] text-gray-400 h-[190px] overflow-y-auto mb-6 flex flex-col gap-1.5 shadow-inner">
               <p>Spawning Node worker process...</p>
               <br />
               <p>[Log Output]</p>
               <p className="text-gray-300">[{new Date().toISOString()}] Starting Notion to PostgreSQL Synchronization...</p>
               <p className="text-gray-300">Querying Notion database for active tasks (Not Started, In Progress, Review, Approved)...</p>
               {modalState === 'success' && (
                 <>
                   <p className="text-emerald-400 mt-2">✔ Success: Sync completed successfully.</p>
                   <p className="text-gray-500">Worker process exited with code 0.</p>
                 </>
               )}
            </div>

            {modalState === 'success' && (
              <div className="flex justify-end mt-2">
                <button 
                  onClick={() => setModalState('idle')}
                  className="px-6 py-2.5 rounded-xl border border-gray-700 hover:bg-gray-800 hover:text-white text-sm font-semibold text-gray-300 transition-all shadow-sm"
                >
                  Close Panel
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <div className="mt-auto pt-6 border-t border-[#E8E0D8] dark:border-gray-800 space-y-4">
        {/* Notion Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center justify-center px-4 py-3 rounded-xl border border-indigo-600/30 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/30 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group shadow-sm hover:shadow ${isCollapsed ? 'w-12 h-12 p-0' : 'w-full gap-2.5'}`}
        >
          <RefreshCw className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {!isCollapsed && <span>{isSyncing ? 'Syncing...' : 'Notion Sync'}</span>}
        </button>

        {/* Sync and Postgres Status */}
        {isCollapsed ? (
          <div className="flex justify-center py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          </div>
        ) : (
          <div className="space-y-4 text-[13px]">
            <div className="flex items-center gap-4">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className="text-emerald-500 font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Postgres Active
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-gray-500 dark:text-gray-400">Terakhir Sync :</span>
              <ul className="text-gray-900 dark:text-white font-medium list-disc list-outside ml-4 space-y-1 text-sm">
                <li>
                  {syncLog?.status === 'success' ? `Success - ${syncLog.recordsSynced} Data` : (syncLog ? 'Failed' : 'Belum Pernah Sync')}
                </li>
                {syncLog && (
                  <li>
                    {new Date(syncLog.finishedAt || syncLog.startedAt).toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA') ? 'Today' : new Date(syncLog.finishedAt || syncLog.startedAt).toLocaleDateString('id-ID')} - {new Date(syncLog.finishedAt || syncLog.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
