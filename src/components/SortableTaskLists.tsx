'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { isTaskInPeriods } from '@/lib/period-utils';
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
  selectedMonths?: string[];
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
    statuses: ['QA', 'qa', 'Q&A', 'q&a', 'In QA', 'in qa', 'QA Process', 'Quality Assurance', 'Testing/QA', 'QA/Testing'],
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
  { label: 'QA', statuses: ['QA', 'qa', 'Q&A', 'q&a', 'In QA', 'in qa', 'QA Process', 'Quality Assurance', 'Testing/QA', 'QA/Testing'], Icon: Hourglass, chip: 'bg-[#3B7BFF]/25' },
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
  if (filters.taskMonths.length && !isTaskInPeriods(task.taskMonth, filters.taskMonths)) return false;
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

export default function SortableTaskLists({ tasks, selectedMonths }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('lastEdited');
  const [filters, setFilters] = useState<BoardFilters>(() => ({
    ...EMPTY_FILTERS,
    taskMonths: selectedMonths && selectedMonths.length > 0 ? selectedMonths : [currentTaskMonth()],
  }));

  useEffect(() => {
    if (selectedMonths && selectedMonths.length > 0) {
      setFilters((prev) => ({ ...prev, taskMonths: selectedMonths }));
    }
  }, [selectedMonths]);
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

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const handleHeaderScroll = () => {
    if (headerScrollRef.current && contentScrollRef.current) {
      contentScrollRef.current.scrollLeft = headerScrollRef.current.scrollLeft;
    }
  };

  const handleContentScroll = () => {
    if (contentScrollRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = contentScrollRef.current.scrollLeft;
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Toaster position="bottom-center" />
      
      {/* Unified Sticky Header Container (Toolbar + Column Headers glued together) */}
      <div className="sticky top-[101px] z-30 flex flex-col bg-white dark:bg-[#0d0e12]">
        <ProductionToolbar
          facets={facets}
          filters={filters}
          onFiltersChange={setFilters}
          query={query}
          onQueryChange={setQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
        />

        {(!hasAnyFilter || columns.some((c) => c.tasks.length > 0)) && (
          <div
            ref={headerScrollRef}
            onScroll={handleHeaderScroll}
            className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden border-b border-[#f0f0f0] dark:border-[#272a34] bg-[#f8f9fa] dark:bg-[#0d0e12]"
          >
            <div className="min-w-max flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className="w-[260px] shrink-0 px-4 py-2.5 flex items-center justify-between text-xs font-mono font-bold"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`size-2 shrink-0 rounded-full ${column.dot}`} />
                    <span className="truncate text-gray-700 dark:text-gray-300">{column.title}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-700 dark:text-gray-300 shadow-none">
                    {column.tasks.length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(!hasAnyFilter || columns.some((c) => c.tasks.length > 0)) ? (
        <div
          ref={contentScrollRef}
          onScroll={handleContentScroll}
          className="w-full flex flex-col overflow-x-auto [&::-webkit-scrollbar]:h-2"
        >
          <div className="min-w-max flex flex-col">
            {/* 8 Column Content Grid */}
            <div className="flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12] min-h-[550px]">
              {columns.map((column) => (
                <div key={column.id} className="w-[260px] shrink-0 flex flex-col">
                  <QAKanbanBoard
                    tasks={column.tasks}
                    emptyMessage={column.emptyMessage}
                    targetStatus={column.statuses[0]}
                    onDropTask={handleDropTask}
                    draggingTaskId={draggingTaskId}
                    onDragStateChange={setDraggingTaskId}
                    onOpenTask={setSelectedTask}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center">
          <p className="text-sm font-mono text-gray-500 dark:text-gray-400">
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
