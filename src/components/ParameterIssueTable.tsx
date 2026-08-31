'use client';

import { useState, useMemo } from 'react';
import { updateTaskParametersAction, retryNotionSyncAction } from '@/app/actions/parameter-issue';
import toast from 'react-hot-toast';
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

  const handleSaveSingle = async (task: ParameterIssueTask) => {
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

  const handleBatchApply = async () => {
    if (selectedIds.size === 0) return;
    if (!batchMonth && !batchPoolScore) {
      toast.error('Select a Task Month or enter a Pool Score to apply to selected tasks');
      return;
    }

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

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Info Banner */}
      <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Parameter Issues ({tasks.length})
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Tasks below are missing <code className="font-semibold text-amber-700 dark:text-amber-300">Task Month</code> or <code className="font-semibold text-amber-700 dark:text-amber-300">Pool Score</code>. Complete them to enable accurate analytics and payroll.
            </p>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E8E0D8] py-16 px-4 text-center dark:border-[#262936] dark:bg-[#12141a]">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
            <CheckCircle2 className="size-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">All Parameters Complete!</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
            Great job! No tasks currently have missing Task Month or Pool Score parameters.
          </p>
        </div>
      ) : (
        <div className="relative overflow-x-auto rounded-xl border border-[#E8E0D8] bg-white shadow-sm dark:border-[#262936] dark:bg-[#12141a]">
          <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
            <thead className="border-b border-[#E8E0D8] bg-gray-50/80 text-[11px] font-semibold text-gray-500 uppercase dark:border-[#262936] dark:bg-[#161922] dark:text-gray-400">
              <tr>
                <th scope="col" className="p-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="cursor-pointer text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="Select All"
                  >
                    {allSelected ? (
                      <CheckSquare className="size-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-3 py-3 w-full">Task Name</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">Designer</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">Doctype</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">Status</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">Issue Type</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap min-w-[190px]">Task Month</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap min-w-[110px]">Pool Score</th>
                <th scope="col" className="px-3 py-3 whitespace-nowrap text-right min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D8] dark:divide-[#262936]">
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
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                        : 'hover:bg-gray-50/60 dark:hover:bg-[#161922]'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleSelectRow(task.id)}
                        className="cursor-pointer text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {isSelected ? (
                          <CheckSquare className="size-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </button>
                    </td>

                    {/* Task Name */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white line-clamp-1">
                          {task.name || 'Untitled Task'}
                        </span>
                        {task.taskAccounts.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {task.taskAccounts.map(({ account }) => (
                              <span
                                key={account.id}
                                className="inline-block rounded px-1.5 py-0.2 text-[10px] font-semibold"
                                style={{
                                  backgroundColor: (account.color || '#6366F1') + '20',
                                  color: account.color || '#6366F1',
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
                            style={{ backgroundColor: task.designer.avatarColor || '#6366F1' }}
                          />
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {task.designer.displayName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </td>

                    {/* Doctype */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-gray-600 dark:text-gray-400">
                        {task.doctype?.displayName || '-'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {task.designStatus?.displayName || 'Unknown'}
                      </span>
                    </td>

                    {/* Issue Type */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {isMonthMissing && isScoreMissing ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                          Both Missing
                        </span>
                      ) : isMonthMissing ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          Month Missing
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
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
                          className={`w-[130px] rounded-lg border px-2 py-1 text-xs outline-none transition-all dark:bg-[#161922] ${
                            isMonthMissing && !currentMonth
                              ? 'border-amber-400 text-amber-700 dark:border-amber-600 dark:text-amber-300 font-semibold'
                              : 'border-[#E8E0D8] text-gray-900 dark:border-[#262936] dark:text-white'
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
                          className="flex size-7 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-900/60 cursor-pointer"
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
                        className={`w-[85px] rounded-lg border px-2 py-1 text-xs outline-none transition-all dark:bg-[#161922] ${
                          isScoreMissing && currentScore === ''
                            ? 'border-orange-400 text-orange-700 dark:border-orange-600 dark:text-orange-300 font-semibold'
                            : 'border-[#E8E0D8] text-gray-900 dark:border-[#262936] dark:text-white'
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
                            className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-200 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/80 cursor-pointer"
                          >
                            <RefreshCw className={`size-3 ${isSaving ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSaveSingle(task)}
                            disabled={isSaving}
                            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {isSaving ? (
                              <RefreshCw className="size-3 animate-spin" />
                            ) : (
                              <Save className="size-3" />
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

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-[#0F172A] px-5 py-3 text-white shadow-2xl backdrop-blur-md dark:border-indigo-500/40">
          <div className="flex items-center gap-2 border-r border-gray-700 pr-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold">
              {selectedIds.size}
            </span>
            <span className="text-xs font-semibold text-gray-200">Selected</span>
          </div>

          {/* Batch Month Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400">Month:</span>
            <select
              value={batchMonth}
              onChange={(e) => setBatchMonth(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white outline-none"
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
            <span className="text-[11px] text-gray-400">Pool Score:</span>
            <input
              type="number"
              step="0.1"
              placeholder="No Change"
              value={batchPoolScore}
              onChange={(e) => setBatchPoolScore(e.target.value)}
              className="w-[85px] rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white outline-none"
            />
          </div>

          {/* Apply Button */}
          <button
            onClick={handleBatchApply}
            disabled={isBatchSaving}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer transition-all shadow-md"
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
