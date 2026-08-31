'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, CheckCircle2, Timer } from 'lucide-react';
import { triggerSyncAction } from '@/app/actions/sync';
import { getNotionConfigAction } from '@/app/actions/notion-config';
import { getLatestSyncStatus } from '@/app/actions/sync';
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

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SyncButton({ initialSyncLog, isCollapsed = false }: SyncButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState(initialSyncLog);
  const [modalState, setModalState] = useState<'idle' | 'syncing' | 'success'>('idle');

  // Auto-sync state
  const [autoSync, setAutoSync] = useState(false);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  const isCronRunningRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch cron status and update countdown
  const refetchCronStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/cron');
      const data = await res.json();
      if (typeof data.nextSyncInMs === 'number') {
        setCountdownMs(data.nextSyncInMs);
      } else if (data.status === 'success' || (data.status === 'skipped' && !data.nextSyncInMs)) {
        setCountdownMs(0);
      }
      // Update sidebar sync log if sync was triggered
      if (data.status === 'success' && data.recordsSynced !== undefined) {
        setSyncLog({
          startedAt: new Date(),
          finishedAt: new Date(),
          status: 'success',
          recordsSynced: data.recordsSynced,
          errorMessage: null,
        });
      }
    } catch (err) {
      console.error('Failed to fetch cron status:', err);
    }
  }, []);

  // Load config on mount and when updated
  useEffect(() => {
    async function init() {
      try {
        const config = await getNotionConfigAction();
        const isAuto = config.autoSync ?? false;
        setAutoSync(isAuto);
        if (isAuto) {
          await refetchCronStatus();
        } else {
          setCountdownMs(null);
        }
      } catch (err) {
        console.error('Failed to init SyncButton:', err);
      }
    }

    init();

    window.addEventListener('notion-config-updated', init);
    return () => window.removeEventListener('notion-config-updated', init);
  }, [refetchCronStatus]);

  // Tick every second when autoSync is active
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      setCountdownMs(prev => {
        if (prev === null) return null;
        return Math.max(0, prev - 1000);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoSync]);

  // Trigger cron when countdown reaches 0
  useEffect(() => {
    if (!autoSync || countdownMs !== 0 || isCronRunningRef.current) return;

    isCronRunningRef.current = true;
    setIsSyncing(true);

    fetch('/api/sync/cron')
      .then(res => res.json())
      .then(async data => {
        if (data.status === 'success') {
          toast.success(`Auto sync: ${data.recordsSynced ?? 0} records synced!`, {
            style: {
              background: '#0B0F19',
              color: '#4ade80',
              border: '1px solid #166534',
            },
            iconTheme: { primary: '#4ade80', secondary: '#0B0F19' },
          });
        }
        // Always fetch the true DB sync log after cron fires
        const latest = await getLatestSyncStatus();
        if (latest) setSyncLog(latest);
        return refetchCronStatus();
      })
      .catch(err => {
        console.error('Cron auto-trigger failed:', err);
        setCountdownMs(15 * 60 * 1000);
      })
      .finally(() => {
        setIsSyncing(false);
        isCronRunningRef.current = false;
      });
  }, [autoSync, countdownMs, refetchCronStatus]);

  // Poll sync log every 30s while autoSync is on (keeps sidebar fresh)
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(async () => {
      try {
        const latest = await getLatestSyncStatus();
        if (latest) setSyncLog(latest);
      } catch (err) {
        console.error('Failed to poll sync log:', err);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [autoSync]);

  // Manual sync (only when autoSync is off)
  const handleSync = async () => {
    if (autoSync || isSyncing) return;
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
          iconTheme: { primary: '#4ade80', secondary: '#0B0F19' },
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
          style: { background: '#0B0F19', color: '#f87171', border: '1px solid #991b1b' },
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
        style: { background: '#0B0F19', color: '#f87171', border: '1px solid #991b1b' },
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <Toaster position="bottom-center" />

      {/* Manual sync modal (only shown when autoSync is off) */}
      {mounted && !autoSync && modalState !== 'idle' && createPortal(
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

      <div className="mt-auto space-y-4">

        {/* ── Auto Sync ON: countdown button ── */}
        {autoSync ? (
          <div
            className={`flex items-center justify-center px-3 py-2 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] transition-all font-mono font-bold text-xs select-none ${
              isSyncing
                ? 'border-amber-500/40 text-amber-500 animate-pulse'
                : 'border-[#ff5e1f]/30 text-[#ff5e1f]'
            } ${isCollapsed ? 'w-9 h-9 p-0' : 'w-full gap-2'}`}
          >
            <Timer className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            {!isCollapsed && (
              <span className="font-mono tracking-wider text-xs">
                {isSyncing
                  ? 'Syncing...'
                  : countdownMs === null
                  ? 'Loading...'
                  : formatCountdown(countdownMs)}
              </span>
            )}
          </div>
        ) : (
          /* ── Auto Sync OFF: normal manual button ── */
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center justify-center px-4 py-2 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-gray-900 dark:text-gray-100 hover:border-[#ff5e1f] hover:text-[#ff5e1f] dark:hover:text-[#ff5e1f] transition-all font-mono text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group shadow-none ${isCollapsed ? 'w-9 h-9 p-0' : 'w-full gap-2'}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 group-hover:text-[#ff5e1f] ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            {!isCollapsed && <span>{isSyncing ? 'Syncing...' : 'Notion Sync'}</span>}
          </button>
        )}

        {/* Sync and Postgres Status */}
        {isCollapsed ? (
          <div className="flex justify-center py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          </div>
        ) : (
          <div className="p-3 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 dark:text-gray-500">Status</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Postgres Active
              </span>
            </div>
            <div className="pt-1.5 border-t border-[#f0f0f0] dark:border-[#272a34]/60 space-y-1">
              <div className="text-gray-400 dark:text-gray-500">Terakhir Sync :</div>
              <div className="text-gray-900 dark:text-gray-200 font-bold">
                {syncLog?.status === 'success' ? `Success - ${syncLog.recordsSynced} Data` : (syncLog ? 'Failed' : 'Belum Pernah Sync')}
              </div>
              {syncLog && (
                <div className="text-[10px] text-gray-400 dark:text-gray-500">
                  {new Date(syncLog.finishedAt || syncLog.startedAt).toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA') ? 'Today' : new Date(syncLog.finishedAt || syncLog.startedAt).toLocaleDateString('id-ID')} • {new Date(syncLog.finishedAt || syncLog.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
