'use client';

import { Suspense, useMemo, useState } from 'react';
import SortControl, { SortKey } from './SortControl';
import QAKanbanBoard from './QAKanbanBoard';

function QAKanbanSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-[#111827]"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-3/5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-gray-700" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface QATask {
  id: string;
  name: string | null;
  notionUrl: string | null;
  lastEditedTime?: number | null;
  designer: { id: string; displayName: string; avatarColor: string | null } | null;
  doctype: { id: string; displayName: string } | null;
  designStatus: { id: string; notionKey: string; displayName: string } | null;
  taskAccounts: { account: { id: string; displayName: string; color: string | null } }[];
  canvaLinks: { id: string; url: string }[];
  comments?: { id: string; content: string; createdAt: string }[];
  qtySubmit: string | number | null;
}

interface Props {
  tasks: QATask[];
}

const STATUS_ORDER: Record<string, number> = {
  'In Progress': 0,
  'Not Started': 1,
};

export default function SortableTaskLists({ tasks }: Props) {
  const [qaSort, setQaSort] = useState<SortKey>('lastEditedDesc');
  const [inProgressSort, setInProgressSort] = useState<SortKey>('lastEditedDesc');
  const [draftSort, setDraftSort] = useState<SortKey>('lastEditedDesc');

  const qaTasks = useMemo(
    () => tasks.filter((t) => t.designStatus?.notionKey === 'QA'),
    [tasks],
  );

  const inProgressTasks = useMemo(
    () =>
      tasks.filter((t) =>
        ['In Progress', 'Not Started'].includes(t.designStatus?.notionKey ?? ''),
      ),
    [tasks],
  );

  const draftTasks = useMemo(
    () => tasks.filter((t) => t.designStatus?.notionKey === 'Draft'),
    [tasks],
  );

  const sortTasks = (taskList: QATask[], sortKey: SortKey) => {
    return [...taskList].sort((a, b) => {
      switch (sortKey) {
        case 'lastEditedAsc':
          return (a.lastEditedTime || 0) - (b.lastEditedTime || 0);
        case 'nameAsc':
          return (a.name || '').localeCompare(b.name || '');
        case 'nameDesc':
          return (b.name || '').localeCompare(a.name || '');
        case 'lastEditedDesc':
        default:
          return (b.lastEditedTime || 0) - (a.lastEditedTime || 0);
      }
    });
  };

  // For In Progress column: first sort by status order, then by selected sort key
  const sortedInProgressTasks = useMemo(() => {
    return [...inProgressTasks].sort((a, b) => {
      const statusDiff =
        (STATUS_ORDER[a.designStatus?.notionKey ?? ''] ?? 99) -
        (STATUS_ORDER[b.designStatus?.notionKey ?? ''] ?? 99);
      if (statusDiff !== 0) return statusDiff;

      switch (inProgressSort) {
        case 'lastEditedAsc':
          return (a.lastEditedTime || 0) - (b.lastEditedTime || 0);
        case 'nameAsc':
          return (a.name || '').localeCompare(b.name || '');
        case 'nameDesc':
          return (b.name || '').localeCompare(a.name || '');
        case 'lastEditedDesc':
        default:
          return (b.lastEditedTime || 0) - (a.lastEditedTime || 0);
      }
    });
  }, [inProgressTasks, inProgressSort]);

  const sortedQaTasks = useMemo(() => sortTasks(qaTasks, qaSort), [qaTasks, qaSort]);
  const sortedDraftTasks = useMemo(() => sortTasks(draftTasks, draftSort), [draftTasks, draftSort]);

  const columnClass = 'min-w-0 space-y-4';

  return (
    <div className="flex flex-col gap-x-8 gap-y-10 lg:flex-row">
      {/* Column 1: QA — 40% */}
      <section className={`${columnClass} lg:w-2/5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Task Need Review
            </h2>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {sortedQaTasks.length}
            </span>
          </div>
          <SortControl
            value={qaSort}
            onChange={setQaSort}
            disabled={sortedQaTasks.length < 2}
          />
        </div>
        <Suspense
          fallback={
            <div className="space-y-4">
              <QAKanbanSkeleton />
            </div>
          }
        >
          <QAKanbanBoard
            tasks={sortedQaTasks}
            emptyMessage="No tasks are currently in QA."
            showActions
          />
        </Suspense>
      </section>

      {/* Column 2: In Progress — 30% (In Progress on top, Not Started below) */}
      <section className={`${columnClass} lg:w-[30%]`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Task in Progress
            </h2>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              {sortedInProgressTasks.length}
            </span>
          </div>
          <SortControl
            value={inProgressSort}
            onChange={setInProgressSort}
            disabled={sortedInProgressTasks.length < 2}
          />
        </div>
        <Suspense
          fallback={
            <div className="space-y-4">
              <QAKanbanSkeleton />
            </div>
          }
        >
          <QAKanbanBoard
            tasks={sortedInProgressTasks}
            emptyMessage="No In Progress or Not Started tasks."
            compact
            transparentBg
          />
        </Suspense>
      </section>

      {/* Column 3: Draft — 30% */}
      <section className={`${columnClass} lg:w-[30%]`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Draft
            </h2>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {sortedDraftTasks.length}
            </span>
          </div>
          <SortControl
            value={draftSort}
            onChange={setDraftSort}
            disabled={sortedDraftTasks.length < 2}
          />
        </div>
        <Suspense
          fallback={
            <div className="space-y-4">
              <QAKanbanSkeleton />
            </div>
          }
        >
          <QAKanbanBoard
            tasks={sortedDraftTasks}
            emptyMessage="No Draft tasks."
            compact
            transparentBg
          />
        </Suspense>
      </section>
    </div>
  );
}
