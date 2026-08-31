'use client';

import { useState } from 'react';
import QACard from './QACard';

interface QATask {
  id: string;
  name: string | null;
  notionUrl: string | null;
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
}

interface Props {
  tasks: QATask[];
  emptyMessage: string;
  /** Column's target DesignStatus.notionKey for drops. */
  targetStatus: string;
  onDropTask: (taskId: string, targetNotionKey: string) => Promise<boolean>;
  draggingTaskId: string | null;
  onDragStateChange: (taskId: string | null) => void;
  onOpenTask: (task: QATask) => void;
}

/** Columns can hold hundreds of tasks, so only render a slice until asked otherwise. */
const PAGE_SIZE = 50;

export default function QAKanbanBoard({
  tasks,
  emptyMessage,
  targetStatus,
  onDropTask,
  draggingTaskId,
  onDragStateChange,
  onOpenTask,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const [over, setOver] = useState(false);

  const visibleTasks = showAll ? tasks : tasks.slice(0, PAGE_SIZE);
  const hiddenCount = tasks.length - visibleTasks.length;

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDragEnter={() => setOver(true)}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const taskId = e.dataTransfer.getData('text/plain');
          if (taskId) void onDropTask(taskId, targetStatus);
        }}
        className={`flex flex-col flex-1 divide-y divide-[#f0f0f0] dark:divide-[#272a34] transition-colors ${
          over ? 'bg-[#ff5e1f]/5 dark:bg-[#ff5e1f]/10' : ''
        }`}
      >
        {tasks.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-500 font-mono">{emptyMessage}</p>
        ) : (
          <>
            {visibleTasks.map((task) => (
              <QACard
                key={task.id}
                task={task}
                dimmed={draggingTaskId !== null && draggingTaskId !== task.id}
                onDragStateChange={onDragStateChange}
                onOpen={onOpenTask}
              />
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="p-3 text-center text-xs font-mono font-bold text-[#ff5e1f] hover:bg-gray-50 dark:hover:bg-[#16181d]/50 transition-colors cursor-pointer"
              >
                Show all {tasks.length} tasks
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
