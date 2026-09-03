'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, CheckCircle2, Timer } from 'lucide-react';
import { triggerSyncAction, getSyncProgressAction, getLatestSyncStatus } from '@/app/actions/sync';
import { getNotionConfigAction } from '@/app/actions/notion-config';
import toast from 'react-hot-toast';
import { useSyncQueue } from '@/context/SyncQueueContext';

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
  const { isSyncing, setIsSyncing } = useSyncQueue();
  const [mounted, setMounted] = useState(false);
  const [syncLog, setSyncLog] = useState(initialSyncLog);
  const [modalState, setModalState] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [syncMetrics, setSyncMetrics] = useState<{
    recordsSynced: number;
    newRecords: number;
    updatedRecords: number;
    failedRecords: number;
  } | null>(null);

  // Live progress, percentage & ETA tracking
  const [liveProgress, setLiveProgress] = useState<{
    percent: number;
    processedRecords: number;
    totalRecordsEst: number;
    etaSeconds: number;
    currentStepMessage: string;
  }>({
    percent: 0,
    processedRecords: 0,
    totalRecordsEst: 288,
    etaSeconds: 0,
    currentStepMessage: '',
  });

  // Poll live progress every 500ms while isSyncing is true
  useEffect(() => {
    if (!isSyncing) {
      setLiveProgress((prev) => ({
        ...prev,
        percent: 100,
        etaSeconds: 0,
        currentStepMessage: 'Selesai',
      }));
      return;
    }

    const interval = setInterval(async () => {
      try {
        const p = await getSyncProgressAction();
        if (p) {
          setLiveProgress({
            percent: p.percentage,
            processedRecords: p.processedRecords,
            totalRecordsEst: p.totalRecordsEst,
            etaSeconds: p.etaSeconds,
            currentStepMessage: p.currentStepMessage,
          });
        }
      } catch (err) {
        console.error('Failed to fetch live sync progress:', err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isSyncing]);

  // Auto-sync state
  const [autoSync, setAutoSync] = useState(false);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  const isCronRunningRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync initialSyncLog or auto-fetch latest sync log on mount
  useEffect(() => {
    if (initialSyncLog) {
      setSyncLog(initialSyncLog);
    } else {
      getLatestSyncStatus().then((log) => {
        if (log) setSyncLog(log);
      });
    }
  }, [initialSyncLog]);

  // Load config on mount and when updated
  useEffect(() => {
    async function init() {
      try {
        const config = await getNotionConfigAction();
        const isAuto = config.autoSync ?? false;
        setAutoSync(isAuto);
        const log = await getLatestSyncStatus();
        if (log) setSyncLog(log);
      } catch (err) {
        console.error('Failed to init SyncButton:', err);
      }
    }

    init();

    window.addEventListener('notion-config-updated', init);
    return () => window.removeEventListener('notion-config-updated', init);
  }, []);

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

  const [syncModeUsed, setSyncModeUsed] = useState<'incremental' | 'full'>('incremental');

  // Manual sync (allows trigger anytime)
  const handleSync = async (mode: 'incremental' | 'full' = 'incremental') => {
    if (isSyncing) {
      // Re-open modal if user clicks button while sync is running in background
      setModalState(syncMetrics ? 'success' : 'syncing');
      return;
    }
    setSyncModeUsed(mode);
    setIsSyncing(true);
    setModalState('syncing');

    // 1-minute auto-close timer for modal popup
    const autoCloseTimer = setTimeout(() => {
      setModalState((currentModalState) => {
        if (currentModalState === 'syncing') {
          toast('Sync sedang berjalan di latar belakang. Pantau indikator pada sidebar menu.', {
            icon: '⏳',
            className: '!bg-white dark:!bg-[#0d0e12] !text-gray-900 dark:!text-gray-100 !border !border-[#f0f0f0] dark:!border-[#272a34] !shadow-2xl !rounded-xl font-mono text-xs p-3.5',
            duration: 6000,
          });
          return 'idle';
        }
        return currentModalState;
      });
    }, 60_000);

    try {
      const res = await triggerSyncAction(mode);
      clearTimeout(autoCloseTimer);
      if (res.status === 'success') {
        const recordsSynced = res.recordsSynced || 0;
        const newRecords = (res as any).newRecords || 0;
        const updatedRecords = (res as any).updatedRecords || 0;
        const failedRecords = (res as any).failedRecords || 0;

        setSyncMetrics({
          recordsSynced,
          newRecords,
          updatedRecords,
          failedRecords,
        });

        setSyncLog({
          startedAt: new Date(),
          finishedAt: new Date(),
          status: 'success',
          recordsSynced,
          errorMessage: null,
        });
        setModalState('success');
        toast.success(`Notion sync completed! (${recordsSynced} synced, ${newRecords} new)`, {
          className: '!bg-white dark:!bg-[#0d0e12] !text-emerald-600 dark:!text-emerald-400 !border !border-[#f0f0f0] dark:!border-[#272a34] !shadow-2xl !rounded-xl font-mono text-xs p-3.5',
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
          className: '!bg-white dark:!bg-[#0d0e12] !text-rose-600 dark:!text-rose-400 !border !border-[#f0f0f0] dark:!border-[#272a34] !shadow-2xl !rounded-xl font-mono text-xs p-3.5',
        });
      }
    } catch (err: any) {
      clearTimeout(autoCloseTimer);
      setSyncLog({
        startedAt: new Date(),
        finishedAt: new Date(),
        status: 'failed',
        recordsSynced: 0,
        errorMessage: err.message || String(err),
      });
      setModalState('idle');
      toast.error(`Sync failed: ${err.message || String(err)}`, {
        className: '!bg-white dark:!bg-[#0d0e12] !text-rose-600 dark:!text-rose-400 !border !border-[#f0f0f0] dark:!border-[#272a34] !shadow-2xl !rounded-xl font-mono text-xs p-3.5',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      {/* Cloudflare Table Simetris Sync Modal */}
      {mounted && modalState !== 'idle' && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalState('idle');
              if (isSyncing) {
                toast('Sync berjalan di latar belakang. Pantau indikator pada sidebar menu.', {
                  icon: '⏳',
                  className: '!bg-white dark:!bg-[#0d0e12] !text-gray-900 dark:!text-gray-100 !border !border-[#f0f0f0] dark:!border-[#272a34] !shadow-2xl !rounded-xl font-mono text-xs p-3.5',
                  duration: 4000,
                });
              }
            }
          }}
          className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-2xl overflow-hidden font-sans text-gray-900 dark:text-gray-100 cursor-default"
          >
            {/* Top Bar Header */}
            <div className="px-5 py-4 flex items-center justify-between bg-white dark:bg-[#0d0e12] rounded-none">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ff5e1f]/10 border border-[#ff5e1f]/20 flex items-center justify-center">
                  <RefreshCw className={`w-4 h-4 text-[#ff5e1f] ${modalState === 'syncing' ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                    Notion Database Sync ({syncModeUsed === 'incremental' ? 'Incremental' : 'Full'})
                  </h2>
                  <p className="text-[11px] font-sans text-gray-500 dark:text-gray-400">
                    {modalState === 'syncing'
                      ? syncModeUsed === 'incremental'
                        ? 'Fetching only recently edited Notion records...'
                        : 'Full reconciliation: downloading all live Notion records...'
                      : 'Notion database synchronization complete'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase">
                  {syncModeUsed.toUpperCase()}
                </span>
                <span className="font-sans text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 uppercase">
                  {modalState === 'syncing' ? 'SYNCING' : 'FINISHED'}
                </span>
              </div>
            </div>

            {/* Live Progress Bar Section */}
            <div className="px-5 py-3.5 bg-white dark:bg-[#0d0e12] space-y-2 border-b border-[#f0f0f0] dark:border-[#272a34]">
              <div className="flex items-center justify-between font-sans text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#ff5e1f] px-2 py-0.5 rounded bg-[#ff5e1f]/10 border border-[#ff5e1f]/20 font-sans">
                    {modalState === 'syncing' ? `${liveProgress.percent}%` : '100%'}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 font-medium text-[11px]">
                    {modalState === 'syncing'
                      ? `${liveProgress.processedRecords} / ${liveProgress.totalRecordsEst} Records`
                      : `${syncMetrics?.recordsSynced || syncLog?.recordsSynced || 0} Records Synced`}
                  </span>
                </div>
                {modalState === 'syncing' && (
                  <div className="flex items-center gap-1.5 text-[#ff5e1f] text-[11px] font-bold">
                    <Timer className="w-3.5 h-3.5 animate-pulse" />
                    <span>Estimasi: ~{liveProgress.etaSeconds}s</span>
                  </div>
                )}
              </div>

              {/* Progress Track */}
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-[#16181d] overflow-hidden p-0.5 border border-[#f0f0f0] dark:border-[#272a34]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff5e1f] via-[#ff7038] to-[#ff5e1f] transition-all duration-300 shadow-[0_0_10px_rgba(255,94,31,0.5)]"
                  style={{ width: `${modalState === 'syncing' ? Math.max(5, liveProgress.percent) : 100}%` }}
                />
              </div>
            </div>

            {/* Simetris KPI Metrics Grid */}
            <div className="p-4 bg-gray-50/50 dark:bg-[#16181d]/50 grid grid-cols-3 gap-3">
              {/* Total Synced Card */}
              <div className="p-3 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] flex flex-col justify-between">
                <span className="font-sans text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Total Data</span>
                <div className="my-1">
                  <span className="font-sans text-2xl font-bold text-gray-900 dark:text-white">
                    {syncMetrics?.recordsSynced ?? (syncLog?.recordsSynced ?? 0)}
                  </span>
                </div>
                <span className="font-sans text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase w-max">
                  Synced
                </span>
              </div>

              {/* New Data Card */}
              <div className="p-3 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] flex flex-col justify-between">
                <span className="font-sans text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Data Baru</span>
                <div className="my-1">
                  <span className="font-sans text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {syncMetrics?.newRecords ?? 0}
                  </span>
                </div>
                <span className="font-sans text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase w-max">
                  Baru
                </span>
              </div>

              {/* Failed Data Card */}
              <div className="p-3 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] flex flex-col justify-between">
                <span className="font-sans text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Gagal Sync</span>
                <div className="my-1">
                  <span className="font-sans text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {syncMetrics?.failedRecords ?? 0}
                  </span>
                </div>
                <span className="font-sans text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase w-max">
                  {(syncMetrics?.failedRecords ?? 0) > 0 ? 'Error' : 'Clean'}
                </span>
              </div>
            </div>

            {/* Log Terminal Console */}
            <div className="p-4 bg-white dark:bg-[#0d0e12]">
              <div className="p-3.5 bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] rounded-lg font-mono text-[11px] text-gray-700 dark:text-gray-300 h-[140px] overflow-y-auto space-y-1">
                <p className="text-gray-500 dark:text-gray-400">Spawning Node worker process...</p>
                <p className="text-gray-500 dark:text-gray-400">[{new Date().toLocaleTimeString()}] Starting Notion to PostgreSQL Synchronization...</p>
                {modalState === 'syncing' && liveProgress.currentStepMessage && (
                  <p className="text-[#ff5e1f] font-medium animate-pulse">└─ {liveProgress.currentStepMessage}</p>
                )}
                {modalState === 'success' && (
                  <>
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1">✔ Success: {syncMetrics?.recordsSynced || syncLog?.recordsSynced || 0} records reconciled cleanly.</p>
                    <p className="text-emerald-600/80 dark:text-emerald-500/80">└─ {syncMetrics?.newRecords ?? 0} new tasks created, {syncMetrics?.updatedRecords ?? 0} updated, {syncMetrics?.failedRecords ?? 0} failed.</p>
                    <p className="text-gray-400 dark:text-gray-500">Worker process exited code 0.</p>
                  </>
                )}
              </div>
            </div>

            {/* Action Footer */}
            <div className="px-5 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-[#16181d]/50 rounded-none">
              <div className="flex items-center gap-1.5 font-sans text-xs text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Postgres Cache Active</span>
              </div>
              {modalState === 'success' ? (
                <div className="flex items-center gap-2">
                  {syncModeUsed === 'incremental' && (
                    <button
                      type="button"
                      onClick={() => handleSync('full')}
                      className="px-3 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#16181d] font-sans text-xs font-bold transition-all cursor-pointer"
                    >
                      Jalankan Full Sync
                    </button>
                  )}
                  <button
                    onClick={() => setModalState('idle')}
                    className="px-5 py-1.5 rounded-lg bg-[#ff5e1f] text-white hover:bg-[#ff7038] font-sans text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Tutup Panel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-sans text-xs text-[#ff5e1f]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Proses Berjalan ({liveProgress.percent}%)...</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="w-full">
        {/* Symmetrical Table-Style Sidebar Sync Block */}
        {isCollapsed ? (
          <div className="flex justify-center py-2">
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-[#ff5e1f] animate-ping' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></span>
          </div>
        ) : (
          <div className="w-full rounded-none divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12] border-t border-[#f0f0f0] dark:border-[#272a34] font-sans text-xs select-none">
            
            {/* Row 1: Interactive Sync Button */}
            <button
              type="button"
              onClick={() => handleSync('incremental')}
              className={`flex items-center justify-center px-4 py-2.5 transition-all font-sans text-xs font-bold cursor-pointer group bg-gray-50 dark:bg-[#16181d] text-gray-900 dark:text-gray-100 hover:bg-[#ff5e1f]/10 hover:text-[#ff5e1f] dark:hover:text-[#ff5e1f] w-full gap-2 ${
                isSyncing ? 'text-[#ff5e1f] animate-pulse' : ''
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'text-[#ff5e1f] animate-spin' : 'text-gray-500 dark:text-gray-400 group-hover:text-[#ff5e1f] group-hover:rotate-180 transition-transform duration-500'}`} />
              <span>
                {isSyncing
                  ? `Syncing ${liveProgress.percent}%...`
                  : autoSync
                  ? 'Sync Now (Daily 00:00)'
                  : 'Notion Sync'}
              </span>
            </button>

            {/* Row 2: Status */}
            <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-[#0d0e12] text-[11px]">
              <span className="text-gray-400 dark:text-gray-500">Status</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Postgres Active
              </span>
            </div>

            {/* Row 3: Live sync progress indicator if syncing */}
            {isSyncing && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/5 text-[#ff5e1f] font-sans text-[10px] font-bold animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                <span>Sync Sedang Berjalan...</span>
              </div>
            )}

            {/* Row 4: Terakhir Sync */}
            <div className="px-4 py-2 bg-white dark:bg-[#0d0e12] space-y-0.5 text-[11px]">
              <div className="text-gray-400 dark:text-gray-500">Terakhir Sync :</div>
              <div className="text-gray-900 dark:text-gray-100 font-bold">
                {syncLog?.status === 'success'
                  ? `Success - ${syncLog.recordsSynced ?? 0} Data`
                  : syncLog?.status === 'running'
                  ? 'Sedang Berjalan...'
                  : syncLog?.status === 'failed'
                  ? 'Failed'
                  : 'Belum Pernah Sync'}
              </div>
              {syncLog && (
                <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-0.5">
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
