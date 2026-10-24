'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import SelectDropdown from '@/components/SelectDropdown';
import { getRecentSyncLogsAction, saveSchedulingConfigAction } from '@/app/actions/notion-config';
import { BTN_PRIMARY, DOT, KV_GRID, KV_LABEL, KV_ROW, KV_VALUE, PANEL_HEAD, PANEL_TITLE, SECTION_GAP, TABLE, TD, TH, THEAD_ROW, TROW } from './styles';

export const SYNC_INTERVAL_OPTIONS = [
  { value: '15_mins', label: 'Setiap 15 menit' },
  { value: '30_mins', label: 'Setiap 30 menit' },
  { value: '1_hour', label: 'Setiap 1 jam' },
  { value: '6_hours', label: 'Setiap 6 jam' },
  { value: '12_hours', label: 'Setiap 12 jam' },
  { value: '24_hours', label: 'Setiap 24 jam' },
];

type SyncLogRow = { id: string; startedAt: number; finishedAt: number | null; status: string; mode: string; recordsSynced: number | null; errorMessage: string | null };

interface Props {
  autoSync: boolean;
  syncInterval: string;
  latestSyncLog: { status?: string } | null;
  onSaved: () => void;
}

const STATUS_VIEW: Record<string, { label: string; dot: string }> = {
  success: { label: 'Success', dot: 'bg-[#00a67d]' },
  running: { label: 'Berjalan', dot: 'bg-amber-500' },
  failed: { label: 'Gagal', dot: 'bg-rose-500' },
};

const formatTime = (ms: number) =>
  `${new Date(ms).toLocaleDateString('id-ID')} ${new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

/** Tab Sinkronisasi: metode & interval sync otomatis, plus riwayat sync. */
export default function SyncTab({ autoSync: initialAuto, syncInterval: initialInterval, latestSyncLog, onSaved }: Props) {
  const [autoSync, setAutoSync] = useState(initialAuto);
  const [syncInterval, setSyncInterval] = useState(initialInterval);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<SyncLogRow[] | null>(null);

  const loadLogs = useCallback(async () => {
    const res = await getRecentSyncLogsAction(10);
    setLogs(res.success ? res.logs : []);
  }, []);

  useEffect(() => {
    loadLogs();
    window.addEventListener('notion-sync-finished', loadLogs);
    return () => window.removeEventListener('notion-sync-finished', loadLogs);
  }, [loadLogs]);

  const dirty = autoSync !== initialAuto || syncInterval !== initialInterval;

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveSchedulingConfigAction(autoSync, syncInterval);
      if (!res.success) { toast.error(res.error || 'Gagal menyimpan pengaturan sync.'); return; }
      toast.success('Pengaturan sync disimpan');
      window.dispatchEvent(new Event('notion-config-updated'));
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const latest = STATUS_VIEW[latestSyncLog?.status ?? ''];

  return (
    <div className="flex flex-col">
      <div className={PANEL_HEAD}>
        <span className={PANEL_TITLE}>Jadwal sinkronisasi</span>
        <button type="button" onClick={save} disabled={!dirty || saving} className={BTN_PRIMARY}>
          {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Simpan
        </button>
      </div>
      <div className={KV_GRID}>
        <div className={KV_ROW}>
          <span className={KV_LABEL}>Metode</span>
          <div className="grid flex-1 grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
            {([[false, 'Manual'], [true, 'Auto (Cron)']] as const).map(([value, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={autoSync === value}
                onClick={() => setAutoSync(value)}
                className={`text-xs font-bold uppercase cursor-pointer ${autoSync === value ? 'bg-[#ff5e1f] text-white' : 'bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:bg-[#16181d]/50 dark:text-gray-300 dark:hover:bg-[#16181d]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className={KV_ROW}>
          <span className={KV_LABEL}>Interval</span>
          <div className="flex-1">
            {autoSync ? (
              <SelectDropdown
                label="Interval"
                value={syncInterval}
                onChange={setSyncInterval}
                options={SYNC_INTERVAL_OPTIONS}
                buttonClassName="h-11 rounded-none border-0 bg-gray-50/50 text-xs dark:bg-[#16181d]/50"
              />
            ) : (
              <span className={`${KV_VALUE} h-full`}>Ketika menekan tombol Sync</span>
            )}
          </div>
        </div>
        <div className={KV_ROW}>
          <span className={KV_LABEL}>Mode cron</span>
          <span className={KV_VALUE}>Incremental (last_edited_time)</span>
        </div>
        <div className={KV_ROW}>
          <span className={KV_LABEL}>Sync terakhir</span>
          <span className={`${KV_VALUE} gap-2`}>
            <span aria-hidden className={`${DOT} ${latest?.dot ?? 'bg-[#6e7687]'}`} />
            {latest?.label ?? 'Belum sync'}
          </span>
        </div>
      </div>

      <div className={`${PANEL_HEAD} ${SECTION_GAP}`}>
        <span className={PANEL_TITLE}>Riwayat sync</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">10 terakhir</span>
      </div>
      <div className="overflow-x-auto">
        <table className={`${TABLE} min-w-[640px]`}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>Waktu</th>
              <th className={`${TH} border-l border-[#f0f0f0] dark:border-[#272a34]`}>Mode</th>
              <th className={`${TH} border-l border-[#f0f0f0] dark:border-[#272a34]`}>Status</th>
              <th className={`${TH} border-l border-[#f0f0f0] dark:border-[#272a34]`}>Records</th>
            </tr>
          </thead>
          <tbody>
            {logs === null && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Memuat riwayat…</td></tr>
            )}
            {logs?.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Belum ada riwayat sync.</td></tr>
            )}
            {logs?.map((log) => {
              const view = STATUS_VIEW[log.status] ?? { label: log.status, dot: 'bg-[#6e7687]' };
              return (
                <tr key={log.id} className={TROW}>
                  <td className={`${TD} font-bold text-gray-900 dark:text-white`}>{formatTime(log.startedAt)}</td>
                  <td className={`${TD} border-l border-[#f0f0f0] capitalize text-gray-600 dark:border-[#272a34] dark:text-gray-300`}>{log.mode}</td>
                  <td className={`${TD} border-l border-[#f0f0f0] dark:border-[#272a34]`} title={log.errorMessage ?? undefined}>
                    <span className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"><span aria-hidden className={`${DOT} ${view.dot}`} />{view.label}</span>
                    {log.status === 'failed' && log.errorMessage && <span className="mt-0.5 block max-w-[320px] truncate text-[11px] text-rose-600 dark:text-rose-400">{log.errorMessage}</span>}
                  </td>
                  <td className={`${TD} border-l border-[#f0f0f0] tabular-nums text-gray-600 dark:border-[#272a34] dark:text-gray-300`}>{log.recordsSynced ?? 0} data</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
