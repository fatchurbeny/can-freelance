'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { isTaskInPeriods } from '@/lib/period-utils';
import { SortKey } from './SortControl';
import ProductionToolbar from './ProductionToolbar';
import QAKanbanBoard from './QAKanbanBoard';
import { BoardFilters, EMPTY_FILTERS, FilterFacets } from './board-filters';
import { updateTaskStatusAction } from '@/app/actions/qa';
import toast from 'react-hot-toast';
import TaskDetailSheet from './TaskDetailSheet';
import { useSyncQueue } from '@/context/SyncQueueContext';
import { COLUMNS, STATUS_CARDS, monthSortKey, currentTaskMonth } from './kanban/kanban-config';
import KanbanBoardHeader from './kanban/KanbanBoardHeader';

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
  const priorities = new Set<string>(['Urgent', 'High', 'Medium', 'Low']);
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

import { saveBoardFiltersToStorage, getSavedBoardFiltersFromStorage } from '@/lib/use-persisted-filter';

export default function SortableTaskLists({ tasks, selectedMonths }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('lastEdited');
  const [query, setQuery] = useState(() => {
    const saved = getSavedBoardFiltersFromStorage();
    return (saved && typeof saved.query === 'string') ? saved.query : '';
  });

  const [filters, setFilters] = useState<BoardFilters>(() => {
    const saved = getSavedBoardFiltersFromStorage();
    const baseMonths = selectedMonths && selectedMonths.length > 0 ? selectedMonths : [];
    if (saved && typeof saved === 'object') {
      const { query: _, ...savedFilters } = saved;
      return {
        ...EMPTY_FILTERS,
        ...savedFilters,
        taskMonths: selectedMonths && selectedMonths.length > 0 ? selectedMonths : (savedFilters.taskMonths || []),
      };
    }
    return {
      ...EMPTY_FILTERS,
      taskMonths: baseMonths,
    };
  });

  useEffect(() => {
    if (selectedMonths && selectedMonths.length > 0) {
      setFilters((prev) => ({ ...prev, taskMonths: selectedMonths }));
    } else {
      setFilters((prev) => ({ ...prev, taskMonths: [] }));
    }
  }, [selectedMonths]);

  const handleFiltersChange = (newFilters: BoardFilters) => {
    setFilters(newFilters);
    saveBoardFiltersToStorage({ ...newFilters, query });
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    saveBoardFiltersToStorage({ ...filters, query: newQuery });
  };

  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<QATask | null>(null);

  const effectiveStatus = (task: QATask) => statusOverride[task.id] ?? task.designStatus?.notionKey ?? 'Draft';

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

  const actionsFor = (task: QATask) =>
    COLUMNS.find((c) => c.statuses.includes(effectiveStatus(task)))?.actions ?? [];

  const { enqueueAction } = useSyncQueue();

  const handleDropTask = async (taskId: string, targetNotionKey: string) => {
    if (statusOverride[taskId] === targetNotionKey) return true;
    const taskObj = tasks.find((t) => t.id === taskId);
    const taskLabel = taskObj?.name || taskId;

    return await enqueueAction(`Pindah Status Task "${taskLabel}"`, async () => {
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
      }
    });
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
      <div className="sticky top-[101px] z-30 flex flex-col bg-white dark:bg-[#0d0e12]">
        <ProductionToolbar
          facets={facets}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          query={query}
          onQueryChange={handleQueryChange}
          sortKey={sortKey}
          onSortChange={setSortKey}
        />

        {(!hasAnyFilter || columns.some((c) => c.tasks.length > 0)) && (
          <KanbanBoardHeader
            columns={columns}
            headerScrollRef={headerScrollRef}
            onHeaderScroll={handleHeaderScroll}
          />
        )}
      </div>

      {(!hasAnyFilter || columns.some((c) => c.tasks.length > 0)) ? (
        <div
          ref={contentScrollRef}
          onScroll={handleContentScroll}
          className="w-full flex flex-col overflow-x-auto [&::-webkit-scrollbar]:h-2"
        >
          <div className="min-w-max flex flex-col">
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
          <p className="text-sm font-sans font-medium text-gray-500 dark:text-gray-400">
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
