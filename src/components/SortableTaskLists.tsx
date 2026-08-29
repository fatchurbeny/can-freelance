'use client';

import { useMemo, useState } from 'react';
import SortControl, { SortKey } from './SortControl';
import ProductionToolbar from './ProductionToolbar';
import QAKanbanBoard from './QAKanbanBoard';
import { BoardFilters, EMPTY_FILTERS, FilterFacets } from './board-filters';
import { type CardAction } from './QACard';
import { updateTaskStatusAction } from '@/app/actions/qa';
import toast, { Toaster } from 'react-hot-toast';
import TaskDetailSheet from './TaskDetailSheet';
import {
  FileText, FileClock, Loader2, Hourglass, FileCheck2, CheckCircle2, UserCheck, XCircle,
  type LucideIcon,
} from 'lucide-react';

interface QATask {
  id: string;
  name: string | null;
  notionUrl: string | null;
  lastEditedTime?: string | number | null;
  createdTime?: string | number | null;
  designer: { id: string; displayName: string; avatarColor: string | null } | null;
  doctype: { id: string; displayName: string } | null;
  designStatus: { id: string; notionKey: string; displayName: string } | null;
  taskAccounts: { account: { id: string; displayName: string; color: string | null } }[];
  canvaLinks: { id: string; url: string }[];
  comments?: { id: string; content: string; createdAt: string }[];
  qtySubmit: string | number | null;
  pages: string | number | null;
  languages?: string[];
  license?: string | null;
  priority?: string | null;
  taskMonth?: string | null;
}

interface Props {
  tasks: QATask[];
}

interface ColumnConfig {
  id: string;
  title: string;
  /** Exact DesignStatus.notionKey values. Note Notion spells approved as "Aproved". */
  statuses: string[];
  dot: string;
  emptyMessage: string;
  actions?: CardAction[];
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'draft',
    title: 'Draft',
    statuses: ['Draft', 'draft'],
    dot: 'bg-gray-400',
    emptyMessage: 'No Draft tasks.',
  },
  {
    id: 'notStarted',
    title: 'Not Started',
    statuses: ['Not Started', 'Not started'],
    dot: 'bg-indigo-300',
    emptyMessage: 'No Not Started tasks.',
  },
  {
    id: 'inProgress',
    title: 'In Progress',
    statuses: ['In Progress', 'In progress'],
    dot: 'bg-indigo-400',
    emptyMessage: 'No In Progress tasks.',
  },
  {
    id: 'qa',
    title: 'QA',
    statuses: ['QA', 'qa'],
    dot: 'bg-amber-400',
    emptyMessage: 'No tasks in QA.',
    actions: [{ label: 'Move In Review', target: 'In Review', doneLabel: 'Moved to In Review' }],
  },
  {
    id: 'review',
    title: 'In Review',
    statuses: ['In Review', 'In review'],
    dot: 'bg-blue-400',
    emptyMessage: 'No tasks in review.',
    actions: [
      { label: 'Approved', target: 'Aproved', doneLabel: 'Approved' },
      { label: 'Profile-Only', target: 'Aproved-Profile Only', doneLabel: 'Approved (Profile Only)' },
    ],
  },
  {
    id: 'approved',
    title: 'Approved',
    statuses: ['Aproved', 'Approved'],
    dot: 'bg-emerald-400',
    emptyMessage: 'No approved tasks.',
  },
  {
    id: 'profileOnly',
    title: 'Approved - Profile Only',
    statuses: ['Aproved-Profile Only', 'Approved-Profile Only'],
    dot: 'bg-teal-400',
    emptyMessage: 'No profile-only tasks.',
  },
  {
    id: 'reject',
    title: 'Reject',
    statuses: ['Reject', 'reject'],
    dot: 'bg-rose-400',
    emptyMessage: 'No rejected tasks.',
  },
];

interface StatusCardConfig {
  label: string;
  statuses: string[];
  Icon: LucideIcon;
  chip: string; // tinted chip bg, from Figma token map
}

/** 8 status stat cards (Figma node 408:1214). Order matches the board pipeline. */
const STATUS_CARDS: StatusCardConfig[] = [
  { label: 'Draft', statuses: ['Draft', 'draft'], Icon: FileText, chip: 'bg-[#6b7280]/25' },
  { label: 'Not Started', statuses: ['Not Started', 'Not started'], Icon: FileClock, chip: 'bg-[#6646B1]/25' },
  { label: 'In Progress', statuses: ['In Progress', 'In progress'], Icon: Loader2, chip: 'bg-[#3B7BFF]/25' },
  { label: 'QA', statuses: ['QA', 'qa'], Icon: Hourglass, chip: 'bg-[#3B7BFF]/25' },
  { label: 'In Review', statuses: ['In Review', 'In review'], Icon: FileCheck2, chip: 'bg-[#F0A848]/25' },
  { label: 'Approved', statuses: ['Aproved', 'Approved'], Icon: CheckCircle2, chip: 'bg-[#22C35D]/25' },
  { label: 'Profile Only', statuses: ['Aproved-Profile Only', 'Approved-Profile Only'], Icon: UserCheck, chip: 'bg-[#EC4899]/25' },
  { label: 'Rejected', statuses: ['Reject', 'reject'], Icon: XCircle, chip: 'bg-[#E05C5E]/25' },
];

/** Serialized payloads deliver dates as ISO strings, so coerce before comparing. */
function time(value?: string | number | null) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : new Date(value).getTime();
}

function compare(a: QATask, b: QATask, sortKey: SortKey) {
  switch (sortKey) {
    case 'dateCreated':
      return time(b.createdTime) - time(a.createdTime);
    case 'nameAsc':
      return (a.name || '').localeCompare(b.name || '');
    case 'nameDesc':
      return (b.name || '').localeCompare(a.name || '');
    case 'lastEdited':
    default:
      return time(b.lastEditedTime) - time(a.lastEditedTime);
  }
}

/** Indonesian full month names (taskMonth format e.g. "Agustus-2026"). */
const IND_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const IND_MONTH_IDX: Record<string, number> = Object.fromEntries(
  IND_MONTHS.map((m, i) => [m, i]),
);

/** Sort key for "Agustus-2026" → "2026-07" so string compare orders chronologically. */
function monthSortKey(m: string): string {
  const [name, year] = m.split('-');
  return `${year}-${String(IND_MONTH_IDX[name] ?? 0).padStart(2, '0')}`;
}

/** Current computer month as taskMonth label, e.g. "Agustus-2026". */
function currentTaskMonth(): string {
  const now = new Date();
  return `${IND_MONTHS[now.getMonth()]}-${now.getFullYear()}`;
}

function filterTask(task: QATask, filters: BoardFilters, query: string): boolean {
  const lowers = query.trim().toLowerCase();
  if (lowers) {
    const haystack = [
      task.name,
      task.designer?.displayName,
      task.doctype?.displayName,
      ...task.taskAccounts.map((ta) => ta.account.displayName),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(lowers)) return false;
  }
  if (filters.designers.length && !filters.designers.includes(task.designer?.id ?? '')) return false;
  if (filters.doctypes.length && !filters.doctypes.includes(task.doctype?.id ?? '')) return false;
  if (
    filters.brands.length &&
    !task.taskAccounts.some((ta) => filters.brands.includes(ta.account.id))
  )
    return false;
  if (filters.languages.length && !filters.languages.some((l) => task.languages?.includes(l)))
    return false;
  if (filters.priorities.length && !filters.priorities.includes(task.priority ?? '')) return false;
  if (filters.taskMonths.length && !filters.taskMonths.includes(task.taskMonth ?? '')) return false;
  return true;
}

function deriveFacets(tasks: QATask[]): FilterFacets {
  const designers = new Map<string, { label: string; color: string | null }>();
  const doctypes = new Map<string, string>();
  const brands = new Map<string, { label: string; color: string | null }>();
  const languages = new Set<string>();
  const priorities = new Set<string>();
  const months = new Set<string>();

  for (const task of tasks) {
    if (task.designer && !designers.has(task.designer.id)) {
      designers.set(task.designer.id, {
        label: task.designer.displayName,
        color: task.designer.avatarColor,
      });
    }
    if (task.doctype && !doctypes.has(task.doctype.id)) {
      doctypes.set(task.doctype.id, task.doctype.displayName);
    }
    for (const ta of task.taskAccounts) {
      if (!brands.has(ta.account.id)) {
        brands.set(ta.account.id, { label: ta.account.displayName, color: ta.account.color });
      }
    }
    task.languages?.forEach((l) => languages.add(l));
    if (task.priority) priorities.add(task.priority);
    if (task.taskMonth) months.add(task.taskMonth);
  }

  return {
    designers: [...designers].map(([id, v]) => ({ id, label: v.label, color: v.color })),
    doctypes: [...doctypes].map(([id, label]) => ({ id, label })),
    brands: [...brands].map(([id, v]) => ({ id, label: v.label, color: v.color })),
    languages: [...languages].sort(),
    priorities: [...priorities].sort(),
    months: [...months].sort((a, b) => monthSortKey(b).localeCompare(monthSortKey(a))),
  };
}

export default function SortableTaskLists({ tasks }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('lastEdited');
  // Default: filter to the current computer month.
  const [filters, setFilters] = useState<BoardFilters>(() => ({
    ...EMPTY_FILTERS,
    taskMonths: [currentTaskMonth()],
  }));
  const [query, setQuery] = useState('');
  // Optimistic status while a drop is persisting; delete override on settle (success or revert).
  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<QATask | null>(null);

  const effectiveStatus = (task: QATask) => statusOverride[task.id] ?? task.designStatus?.notionKey ?? '';

  const facets = useMemo(() => deriveFacets(tasks), [tasks]);
  const hasAnyFilter =
    query.trim().length > 0 ||
    Object.values(filters).some((arr) => arr.length > 0);

  const columns = useMemo(
    () =>
      COLUMNS.map((column) => {
        const columnTasks = tasks
          .filter(
            (task) =>
              column.statuses.includes(effectiveStatus(task)) &&
              filterTask(task, filters, query),
          )
          .sort((a, b) => compare(a, b, sortKey));
        return { ...column, tasks: columnTasks };
      }),
    [tasks, filters, query, sortKey, statusOverride],
  );

  // Stats follow the month filter ONLY (ignores designer/brand/search filters).
  const monthlyTasks = useMemo(
    () =>
      filters.taskMonths.length > 0
        ? tasks.filter((t) => filters.taskMonths.includes(t.taskMonth ?? ''))
        : tasks,
    [tasks, filters.taskMonths],
  );

  const statusCounts = useMemo(
    () =>
      STATUS_CARDS.map((card) => ({
        ...card,
        count: monthlyTasks.filter((t) => card.statuses.includes(effectiveStatus(t))).length,
      })),
    [monthlyTasks, statusOverride],
  );

  /** Top 4 most-used doctypes for the selected month; fill width relative to the month max. */
  const doctypeStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of monthlyTasks) {
      const name = t.doctype?.displayName;
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));
    const max = sorted[0]?.count ?? 0;
    return sorted.map((row) => ({ ...row, pct: max > 0 ? Math.round((row.count / max) * 100) : 0 }));
  }, [monthlyTasks]);

  const actionsFor = (task: QATask) =>
    COLUMNS.find((c) => c.statuses.includes(effectiveStatus(task)))?.actions ?? [];

  const handleDropTask = async (taskId: string, targetNotionKey: string) => {
    if (statusOverride[taskId] === targetNotionKey) return true;
    setStatusOverride((m) => ({ ...m, [taskId]: targetNotionKey }));
    setDraggingTaskId(null);
    const result = await updateTaskStatusAction(taskId, targetNotionKey);
    setStatusOverride((m) => {
      const next = { ...m };
      delete next[taskId];
      return next;
    });
    if (!result.success) {
      toast.error(result.error || `Failed to move task to ${targetNotionKey}`);
      return false;
    }
    return true;
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <Toaster position="bottom-center" />
      <ProductionToolbar
        facets={facets}
        filters={filters}
        onFiltersChange={setFilters}
        query={query}
        onQueryChange={setQuery}
        sortKey={sortKey}
        onSortChange={setSortKey}
      />

      {/* Status statistics (Figma 410:1982) — follows the selected task month. */}
      <div className="flex flex-col gap-2 xl:flex-row">
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
          {statusCounts.map(({ label, count, Icon, chip }) => (
            <div
              key={label}
              className="flex size-full flex-col gap-1.5 rounded-[10px] border border-[#E8E0D8] bg-white p-3 dark:border-[#262936] dark:bg-[#12141a]"
            >
              <div className="flex w-full items-center gap-1">
                <p className="min-w-0 flex-1 truncate text-[11px] font-medium leading-normal text-gray-500 dark:text-[#6b7280]">
                  {label}
                </p>
                <div className={`flex shrink-0 items-center rounded-[4px] p-[2px] ${chip}`}>
                  <Icon className="size-[14px] text-gray-500 dark:text-gray-300" />
                </div>
              </div>
              <p className="text-[26px] font-bold leading-none text-gray-900 dark:text-white">
                {count}
              </p>
            </div>
          ))}
        </div>

        {/* Doctype created this month (Figma 410:1336). */}
        <div className="flex w-full shrink-0 flex-col gap-2.5 rounded-[10px] border border-[#E8E0D8] bg-white px-3 py-2.5 dark:border-[#262936] dark:bg-[#12141a] xl:w-[420px]">
          <div className="flex w-full items-center justify-between">
            <p className="whitespace-nowrap text-[11px] font-medium leading-normal text-gray-500 dark:text-[#6b7280]">
              {filters.taskMonths.length === 1
                ? `Doctype created ${filters.taskMonths[0]}`
                : filters.taskMonths.length > 1
                  ? `Doctype created in ${filters.taskMonths.length} months`
                  : 'Doctype created'}
            </p>
            <div className="flex shrink-0 items-center rounded-[4px] bg-[rgba(59,123,255,0.25)] p-[2px]">
              <FileText className="size-[14px] text-gray-500 dark:text-gray-300" />
            </div>
          </div>
          <div className="flex w-full flex-col gap-2">
            {doctypeStats.length > 0 ? (
              doctypeStats.map(({ name, count, pct }) => (
                <div key={name} className="flex w-full flex-col gap-1">
                  <div className="flex w-full items-center justify-between text-[11px] font-normal leading-normal text-gray-900 dark:text-white">
                    <p className="truncate capitalize">{name}</p>
                    <p className="shrink-0 text-right">{count}</p>
                  </div>
                  <div className="flex h-[5px] w-full items-start rounded-[80px] bg-gray-500/25 dark:bg-[rgba(107,114,128,0.25)]">
                    <div
                      className="h-[5px] rounded-[80px] bg-[#22c35d]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-gray-500 dark:text-[#6b7280]">
                No doctypes for the selected month.
              </p>
            )}
          </div>
        </div>
      </div>

      {(!hasAnyFilter || columns.some((c) => c.tasks.length > 0)) ? (
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:h-2">
          {columns.map((column) => (
            <section key={column.id} className="flex w-[240px] shrink-0 flex-col">
              <div className="flex items-center gap-2 px-1 pb-2">
                <span className={`size-2 shrink-0 rounded-full ${column.dot}`} />
                <h2 className="truncate text-[13px] font-medium text-gray-700 dark:text-white/70">
                  {column.title}
                </h2>
                <span className="text-[12px] text-gray-400 dark:text-white/35">{column.tasks.length}</span>
              </div>

              <QAKanbanBoard
                tasks={column.tasks}
                emptyMessage={column.emptyMessage}
                targetStatus={column.statuses[0]}
                onDropTask={handleDropTask}
                draggingTaskId={draggingTaskId}
                onDragStateChange={setDraggingTaskId}
                onOpenTask={setSelectedTask}
              />
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#E8E0D8] px-6 py-16 text-center dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tasks match the current filters or search.
          </p>
        </div>
      )}

      <TaskDetailSheet
        task={selectedTask}
        actions={selectedTask ? actionsFor(selectedTask) : []}
        onClose={() => setSelectedTask(null)}
        onMoved={(taskId) => {
          setStatusOverride((m) => {
            const next = { ...m };
            delete next[taskId];
            return next;
          });
          setSelectedTask((current) => {
            if (!current || current.id !== taskId) return current;
            return tasks.find((t) => t.id === taskId) ?? current;
          });
        }}
      />
    </div>
  );
}
