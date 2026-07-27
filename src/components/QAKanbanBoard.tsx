'use client';

import { useState } from 'react';
import QACard from './QACard';
import CommentModal from './CommentModal';

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
}

interface Props {
  tasks: QATask[];
  emptyMessage: string;
  showActions?: boolean;
  compact?: boolean;
  transparentBg?: boolean;
}

export default function QAKanbanBoard({ tasks, emptyMessage, showActions = false, compact = false, transparentBg = false }: Props) {
  const [commentTarget, setCommentTarget] = useState<{ taskId: string; taskName: string } | null>(null);

  return (
    <>
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-[#111827]">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">All Clear</h3>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          tasks.map((task) => (
            <QACard
              key={task.id}
              task={task}
              showActions={showActions}
              compact={compact}
              transparentBg={transparentBg}
              onAddComment={() => setCommentTarget({ taskId: task.id, taskName: task.name || 'Untitled' })}
            />
          ))
        )}
      </div>

      {commentTarget && (
        <CommentModal
          taskId={commentTarget.taskId}
          taskName={commentTarget.taskName}
          onClose={() => setCommentTarget(null)}
        />
      )}
    </>
  );
}
