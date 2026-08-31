'use client';

import { useState, useMemo } from 'react';
import { updateTaskParametersAction, retryNotionSyncAction } from '@/app/actions/parameter-issue';
import toast from 'react-hot-toast';
import { useSyncQueue } from '@/context/SyncQueueContext';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Wand2,
  Save,
  Sparkles,
  CheckSquare,
  Square,
  HelpCircle,
  Filter,
} from 'lucide-react';

interface ParameterIssueTask {
  id: string;
  name: string | null;
  notionPageId: string;
  notionUrl: string | null;
  taskMonth: string | null;
  poolScore: number | string | null;
  createdTime: string | number | Date;
  dateApproved?: string | number | Date | null;
  designer: { id: string; displayName: string; avatarColor: string | null } | null;
  doctype: { id: string; displayName: string } | null;
  designStatus: { id: string; notionKey: string; displayName: string } | null;
  taskAccounts: { account: { id: string; displayName: string; color: string | null } }[];
}

interface Props {
  initialTasks: ParameterIssueTask[];
  onParametersUpdated?: () => void;
}

const IND_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function suggestTaskMonth(task: ParameterIssueTask): string {
  const dateVal = task.dateApproved || task.createdTime;
  if (!dateVal) return 'Agustus-2026';
  const d = new Date(dateVal);
  const monthName = IND_MONTHS[d.getMonth()] || 'Agustus';
  const year = d.getFullYear() || 2026;
  return `${monthName}-${year}`;
}

export default function ParameterIssueTable({ initialTasks, onParametersUpdated }: Props) {
  const [tasks, setTasks] = useState<ParameterIssueTask[]>(initialTasks);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingRows, setEditingRows] = useState<Record<string, { taskMonth?: string; poolScore?: string }>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [failedSyncIds, setFailedSyncIds] = useState<Record<string, string>>({});
  const { enqueueAction } = useSyncQueue();

  // Batch edit inputs
  const [batchMonth, setBatchMonth] = useState<string>('');
  const [batchPoolScore, setBatchPoolScore] = useState<string>('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // Month options generator (e.g., 2025, 2026, 2027)
  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const years = [2026, 2025, 2027];
    for (const year of years) {
      for (const m of IND_MONTHS) {
        options.push(`${m}-${year}`);
      }
    }
    return options;
  }, []);

  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRowChange = (id: string, field: 'taskMonth' | 'poolScore', value: string) => {
    setEditingRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleAutoSuggest = (task: ParameterIssueTask) => {
    const suggested = suggestTaskMonth(task);
    handleRowChange(task.id, 'taskMonth', suggested);
    toast.success(`Suggested: ${suggested}`, { duration: 2000 });
  };

  const executeSaveSingle = async (task: ParameterIssueTask) => {
    const draft = editingRows[task.id] || {};
    const finalMonth = draft.taskMonth !== undefined ? draft.taskMonth : task.taskMonth;
    const finalScoreStr = draft.poolScore !== undefined ? draft.poolScore : (task.poolScore?.toString() ?? '');

    const finalScore = finalScoreStr.trim() !== '' ? Number(finalScoreStr) : null;

    if (!finalMonth && finalScore === null) {
      toast.error('Please fill Task Month or Pool Score before saving');
      return;
    }

    setSavingIds((prev) => new Set(prev).add(task.id));

    try {
      const res = await updateTaskParametersAction([task.id], {
        taskMonth: finalMonth,
        poolScore: finalScore,
      });

      if (res.success) {
        toast.success('Task parameters saved!');
        
        // Check Notion sync status
        const syncResult = res.notionSyncResults?.[task.id];
        if (syncResult && !syncResult.success) {
          setFailedSyncIds((prev) => ({
            ...prev,
            [task.id]: syncResult.error || 'Failed to sync to Notion',
          }));
          toast.error(`Local DB updated, but Notion sync failed: ${syncResult.error}`);
        } else {
          setFailedSyncIds((prev) => {
            const next = { ...prev };
            delete next[task.id];
            return next;
          });
        }

        // If issue resolved, remove from local issue list
        if (finalMonth && finalScore !== null) {
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
        } else {
          // Update in place
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, taskMonth: finalMonth, poolScore: finalScore } : t))
          );
        }

        onParametersUpdated?.();
      } else {
        toast.error(res.error || 'Failed to save parameters');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving parameters');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleSaveSingle = (task: ParameterIssueTask) => {
    enqueueAction(`Simpan Parameter Task "${task.name || task.id}"`, () => executeSaveSingle(task));
  };

  const handleRetryNotionSync = async (taskId: string) => {
    setSavingIds((prev) => new Set(prev).add(taskId));
    try {
      const res = await retryNotionSyncAction(taskId);
      if (res.success) {
        toast.success('Notion sync succeeded!');
        setFailedSyncIds((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      } else {
        toast.error(`Notion sync retry failed: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Retry failed');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const executeBatchApply = async () => {
    const taskIds = Array.from(selectedIds);
    setIsBatchSaving(true);

    try {
      const payload: { taskMonth?: string | null; poolScore?: number | null } = {};
      if (batchMonth) payload.taskMonth = batchMonth;
      if (batchPoolScore.trim() !== '') payload.poolScore = Number(batchPoolScore);

      const res = await updateTaskParametersAction(taskIds, payload);

      if (res.success) {
        toast.success(`Updated ${taskIds.length} tasks successfully!`);

        // Check if any Notion syncs failed
        if (res.notionSyncResults) {
          const failedMap: Record<string, string> = {};
          let failedCount = 0;
          for (const [id, syncRes] of Object.entries(res.notionSyncResults)) {
            if (!syncRes.success) {
              failedMap[id] = syncRes.error || 'Sync failed';
              failedCount++;
            }
          }
          if (failedCount > 0) {
            setFailedSyncIds((prev) => ({ ...prev, ...failedMap }));
            toast.error(`${failedCount} task(s) updated in DB, but failed Notion sync.`);
          }
        }

        // Filter out resolved tasks
        setTasks((prev) =>
          prev.filter((t) => {
            if (!selectedIds.has(t.id)) return true;
            const updatedMonth = payload.taskMonth !== undefined ? payload.taskMonth : t.taskMonth;
            const updatedScore = payload.poolScore !== undefined ? payload.poolScore : t.poolScore;
            return !updatedMonth || updatedScore === null;
          })
        );

        setSelectedIds(new Set());
        setBatchMonth('');
        setBatchPoolScore('');
        onParametersUpdated?.();
      } else {
        toast.error(res.error || 'Batch update failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Batch update failed');
    } finally {
      setIsBatchSaving(false);
    }
  };

  const handleBatchApply = () => {
    if (selectedIds.size === 0) return;
    if (!batchMonth && !batchPoolScore) {
      toast.error('Select a Task Month or enter a Pool Score to apply to selected tasks');
      return;
    }
    enqueueAction(`Bulk Update ${selectedIds.size} Tasks`, () => executeBatchApply());
  };

  return (
    <div className="w-full divide-y divide-[#f0f0f0] dark:divide-[#272a34] font-sans">
      {/* Header Info Banner (Cloudflare Continuous Flat Cell Style) */}
      <div className="flex flex-col gap-2 bg-gray-50/50 dark:bg-[#0d0e12] p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ff5e1f]/10 border border-[#ff5e1f]/20 text-[#ff5e1f]">
            <AlertCircle className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-900 dark:text-white">
              Parameter Issues ({tasks.length})
            </h3>
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">
              Tasks below are missing <code className="font-semibold text-[#ff5e1f]">Task Month</code> or <code className="font-semibold text-[#ff5e1f]">Pool Score</code>. Complete them to enable accurate analytics and payroll.
            </p>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white dark:bg-[#0d0e12] py-20 px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-3">
            <CheckCircle2 className="size-6" />
          </div>
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-gray-900 dark:text-white">All Parameters Complete!</h3>
          <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1 max-w-md">
            Great job! No tasks currently have missing Task Month or Pool Score parameters.
          </p>
        </div>
      ) : (
        /* Cloudflare Continuous Outer Table (No Outer Border or Extra Gap) */
        <div className="w-full overflow-x-auto bg-white dark:bg-[#0d0e12]">
          <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-50/80 dark:bg-[#16181d]/80 text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded-none border border-gray-300 dark:border-[#272a34] bg-white dark:bg-[#16181d] text-black dark:text-white cursor-pointer accent-[#ff5e1f]"
                    title="Select All"
                  />
                </th>
                <th scope="col" className="px-3 py-3 w-[260px] max-w-[260px]">Task Name</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">Designer</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">Doctype</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">Status</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">Issue Type</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap min-w-[170px]">Task Month</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap min-w-[110px]">Pool Score</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap text-right min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
              {tasks.map((task) => {
                const isSelected = selectedIds.has(task.id);
                const isSaving = savingIds.has(task.id);
                const syncError = failedSyncIds[task.id];

                const draft = editingRows[task.id] || {};
                const currentMonth = draft.taskMonth !== undefined ? draft.taskMonth : (task.taskMonth || '');
                const currentScore = draft.poolScore !== undefined ? draft.poolScore : (task.poolScore?.toString() || '');

                const isMonthMissing = !task.taskMonth;
                const isScoreMissing = task.poolScore === null || task.poolScore === undefined;

                return (
                  <tr
                    key={task.id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-[#ff5e1f]/5 dark:bg-[#ff5e1f]/10'
                        : 'hover:bg-gray-50/60 dark:hover:bg-[#16181d]'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(task.id)}
                        className="w-4 h-4 rounded-none border border-gray-300 dark:border-[#272a34] bg-white dark:bg-[#16181d] text-black dark:text-white cursor-pointer accent-[#ff5e1f]"
                      />
                    </td>

                    {/* Task Name */}
                    <td className="px-3 py-3 w-[260px] max-w-[260px] min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-gray-900 dark:text-white truncate block max-w-[240px]" title={task.name || 'Untitled Task'}>
                          {task.name || 'Untitled Task'}
                        </span>
                        {task.taskAccounts.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {task.taskAccounts.map(({ account }) => (
                              <span
                                key={account.id}
                                className="inline-block rounded px-1.5 py-0.2 font-mono text-[10px] font-bold uppercase"
                                style={{
                                  backgroundColor: (account.color || '#ff5e1f') + '15',
                                  color: account.color || '#ff5e1f',
                                  border: `1px solid ${(account.color || '#ff5e1f')}30`,
                                }}
                              >
                                {account.displayName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Designer */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {task.designer ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: task.designer.avatarColor || '#ff5e1f' }}
                          />
                          <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                            {task.designer.displayName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-mono text-xs">-</span>
                      )}
                    </td>

                    {/* Doctype */}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {task.doctype?.displayName || '-'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 font-mono text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase">
                        {task.designStatus?.displayName || 'Unknown'}
                      </span>
                    </td>

                    {/* Issue Type */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {isMonthMissing && isScoreMissing ? (
                        <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">
                          Both Missing
                        </span>
                      ) : isMonthMissing ? (
                        <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                          Month Missing
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] dark:text-[#ff7038] border border-[#ff5e1f]/20 uppercase">
                          Pool Score Missing
                        </span>
                      )}
                    </td>

                    {/* Task Month Input + Auto Suggest */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={currentMonth}
                          onChange={(e) => handleRowChange(task.id, 'taskMonth', e.target.value)}
                          className={`w-[130px] rounded-none border px-2 py-1 font-mono text-xs outline-none transition-all dark:bg-[#16181d] ${
                            isMonthMissing && !currentMonth
                              ? 'border-amber-400 text-amber-600 dark:border-amber-500 dark:text-amber-400 font-bold'
                              : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-900 dark:text-white'
                          }`}
                        >
                          <option value="">-- Pilih Bulan --</option>
                          {monthOptions.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleAutoSuggest(task)}
                          title={`Auto-Suggest (${suggestTaskMonth(task)})`}
                          className="flex size-7 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-amber-600 hover:border-amber-500 hover:text-amber-500 dark:text-amber-400 transition-colors cursor-pointer"
                        >
                          <Wand2 className="size-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Pool Score Input */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 10.5"
                        value={currentScore}
                        onChange={(e) => handleRowChange(task.id, 'poolScore', e.target.value)}
                        className={`w-[85px] rounded-none border px-2 py-1 font-mono text-xs outline-none transition-all dark:bg-[#16181d] ${
                          isScoreMissing && currentScore === ''
                            ? 'border-[#ff5e1f] text-[#ff5e1f] dark:border-[#ff5e1f] dark:text-[#ff7038] font-bold'
                            : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-900 dark:text-white'
                        }`}
                      />
                    </td>

                    {/* Action & Sync Retry */}
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {syncError ? (
                          <button
                            onClick={() => handleRetryNotionSync(task.id)}
                            disabled={isSaving}
                            title={`Sync error: ${syncError}. Click to retry.`}
                            className="flex items-center gap-1.5 rounded-none bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 font-mono text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                          >
                            <RefreshCw className={`size-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSaveSingle(task)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 rounded-none bg-[#ff5e1f] hover:bg-[#ff7038] px-3 py-1 font-mono text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                          >
                            {isSaving ? (
                              <RefreshCw className="size-3.5 animate-spin" />
                            ) : (
                              <Save className="size-3.5" />
                            )}
                            <span>Save</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cloudflare Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] px-5 py-3 text-gray-900 dark:text-gray-100 shadow-2xl backdrop-blur-md font-mono text-xs">
          <div className="flex items-center gap-2 border-r border-[#f0f0f0] dark:border-[#272a34] pr-3">
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 uppercase">
              {selectedIds.size} Selected
            </span>
          </div>

          {/* Batch Month Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 uppercase">Month:</span>
            <select
              value={batchMonth}
              onChange={(e) => setBatchMonth(e.target.value)}
              className="rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-2.5 py-1 text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-[#ff5e1f]"
            >
              <option value="">-- No Change --</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Pool Score Input */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 uppercase">Pool Score:</span>
            <input
              type="number"
              step="0.1"
              placeholder="No Change"
              value={batchPoolScore}
              onChange={(e) => setBatchPoolScore(e.target.value)}
              className="w-[90px] rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-2.5 py-1 text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-[#ff5e1f]"
            />
          </div>

          {/* Apply Button */}
          <button
            onClick={handleBatchApply}
            disabled={isBatchSaving}
            className="flex items-center gap-1.5 rounded-none bg-[#ff5e1f] hover:bg-[#ff7038] px-4 py-1.5 font-mono text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isBatchSaving ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span>Apply to {selectedIds.size} Tasks</span>
          </button>
        </div>
      )}
    </div>
  );
}
