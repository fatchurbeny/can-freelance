'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, RefreshCw, AlertTriangle, X } from 'lucide-react';

export interface QueuedAction {
  id: string;
  description: string;
  action: () => Promise<void>;
}

interface SyncQueueContextType {
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
  pendingQueue: QueuedAction[];
  enqueueAction: (description: string, action: () => Promise<void>) => Promise<boolean>;
}

const SyncQueueContext = createContext<SyncQueueContextType | undefined>(undefined);

export function SyncQueueProvider({ children }: { children: React.ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<QueuedAction[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState<{
    description: string;
    action: () => Promise<void>;
    resolve: (executed: boolean) => void;
  } | null>(null);

  // Auto-run queued actions when isSyncing finishes (transitions from true to false)
  useEffect(() => {
    if (!isSyncing && pendingQueue.length > 0) {
      const processQueue = async () => {
        const queueToRun = [...pendingQueue];
        setPendingQueue([]);
        toast.loading(`Memproses ${queueToRun.length} antrean perubahan data...`, { id: 'queue-process' });

        const executedDescriptions: string[] = [];
        for (const item of queueToRun) {
          try {
            await item.action();
            executedDescriptions.push(item.description);
          } catch (err) {
            console.error(`Failed executing queued action: ${item.description}`, err);
          }
        }

        toast.dismiss('queue-process');

        if (executedDescriptions.length > 0) {
          toast.success(
            (t) => (
              <div className="space-y-1.5 font-mono text-xs text-gray-900 dark:text-gray-100">
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  ✅ {executedDescriptions.length} Antrean Edit Berhasil Disinkronkan:
                </div>
                <ul className="pl-1 space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                  {executedDescriptions.map((desc, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ),
            {
              duration: 7000,
              className: '!bg-white dark:!bg-[#0d0e12] !border !border-emerald-500/30 !shadow-2xl !rounded-xl p-4 max-w-sm',
            }
          );
        }
      };

      processQueue();
    }
  }, [isSyncing, pendingQueue]);

  const enqueueAction = (description: string, action: () => Promise<void>): Promise<boolean> => {
    if (!isSyncing) {
      action();
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      setPendingPrompt({ description, action, resolve });
    });
  };

  const handleQueue = () => {
    if (!pendingPrompt) return;
    const newItem: QueuedAction = {
      id: Math.random().toString(36).substring(2, 9),
      description: pendingPrompt.description,
      action: pendingPrompt.action,
    };
    setPendingQueue((prev) => [...prev, newItem]);
    toast(`Perubahan "${pendingPrompt.description}" diantrikan untuk diproses setelah sync selesai.`, {
      icon: '📥',
      className: '!bg-white dark:!bg-[#0d0e12] !text-gray-900 dark:!text-gray-100 !border !border-[#f0f0f0] dark:!border-[#272a34] !shadow-2xl !rounded-xl font-mono text-xs p-3.5',
      duration: 4000,
    });
    pendingPrompt.resolve(false);
    setPendingPrompt(null);
  };

  const handleExecuteImmediately = async () => {
    if (!pendingPrompt) return;
    const actionToRun = pendingPrompt.action;
    const resolveToCall = pendingPrompt.resolve;
    setPendingPrompt(null);
    try {
      await actionToRun();
      resolveToCall(true);
    } catch (err) {
      resolveToCall(false);
    }
  };

  const handleCancel = () => {
    if (!pendingPrompt) return;
    pendingPrompt.resolve(false);
    setPendingPrompt(null);
  };

  return (
    <SyncQueueContext.Provider
      value={{
        isSyncing,
        setIsSyncing,
        pendingQueue,
        enqueueAction,
      }}
    >
      {children}

      {/* Cloudflare Continuous Card Warning Modal */}
      {pendingPrompt && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-2xl overflow-hidden font-sans text-gray-900 dark:text-gray-100">
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between bg-white dark:bg-[#0d0e12] rounded-t-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                    Sync Notion Sedang Berjalan
                  </h3>
                  <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                    Proses sinkronisasi latar belakang aktif
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 bg-gray-50/50 dark:bg-[#16181d]/50 space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 flex items-start gap-2.5">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Perubahan <strong className="underline text-gray-900 dark:text-white">{pendingPrompt.description}</strong> terdeteksi saat sync Notion sedang berjalan.
                </p>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Pilih opsi di bawah untuk memasukkan perubahan ini ke antrean (Queue) agar otomatis diproses setelah sync selesai, atau langsung eksekusi sekarang.
              </p>
              {pendingQueue.length > 0 && (
                <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
                  * Terdapat {pendingQueue.length} perubahan yang sudah ada di dalam antrean.
                </div>
              )}
            </div>

            {/* Action Buttons Footer */}
            <div className="px-5 py-3.5 flex items-center justify-end gap-2 bg-white dark:bg-[#0d0e12] rounded-b-xl">
              <button
                onClick={handleCancel}
                className="px-3.5 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272a34] font-mono text-xs font-medium transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteImmediately}
                className="px-3.5 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] text-gray-900 dark:text-gray-100 hover:border-[#ff5e1f] hover:text-[#ff5e1f] font-mono text-xs font-bold transition-all cursor-pointer"
              >
                Eksekusi Sekarang
              </button>
              <button
                onClick={handleQueue}
                className="px-4 py-1.5 rounded-lg bg-[#ff5e1f] hover:bg-[#ff7038] text-white font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Antrikan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </SyncQueueContext.Provider>
  );
}

export function useSyncQueue() {
  const context = useContext(SyncQueueContext);
  if (!context) {
    throw new Error('useSyncQueue must be used within a SyncQueueProvider');
  }
  return context;
}
