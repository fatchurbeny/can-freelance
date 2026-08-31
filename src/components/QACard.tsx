'use client';

import { useState } from 'react';
import { MessageSquare, FileText } from 'lucide-react';

export interface QATask {
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
  priority?: string | null;
  taskMonth?: string | null;
}

/** A CTA rendered in the detail sheet. `target` is an exact DesignStatus.notionKey. */
export interface CardAction {
  label: string;
  target: string;
  doneLabel: string;
}

interface Props {
  task: QATask;
  onOpen: (task: QATask) => void;
  /** True when another card is being dragged (dim non-dragged cards). */
  dimmed?: boolean;
  /** Reports drag start/end upward for board-level dimming. */
  onDragStateChange?: (taskId: string | null) => void;
}

/** Notion-ish property pill. Colors come from the DB, so tint them rather than fill. */
function Pill({ label, color }: { label: string; color?: string | null }) {
  const tint = color || '#6b7280';
  return (
    <span
      className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-medium leading-none"
      style={{ backgroundColor: `${tint}33`, color: tint }}
    >
      {label}
    </span>
  );
}

export default function QACard({ task, onOpen, dimmed = false, onDragStateChange }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setDragging(true);
    onDragStateChange?.(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragging(false);
    onDragStateChange?.(null);
  };

  const commentCount = task.comments?.length ?? 0;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        if (dragging) return;
        onOpen(task);
      }}
      className={`group cursor-pointer p-3.5 bg-white dark:bg-[#0d0e12] hover:bg-gray-50/80 dark:hover:bg-[#16181d]/80 transition-colors ${
        dragging ? 'cursor-grabbing opacity-50' : 'cursor-grab active:cursor-grabbing'
      } ${dimmed && !dragging ? 'opacity-40' : ''}`}
    >
      {/* Title */}
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
        <h3 className="min-w-0 flex-1 text-xs font-medium leading-snug text-gray-900 dark:text-gray-100 group-hover:text-[#ff5e1f] transition-colors">
          {task.name || 'Untitled Task'}
        </h3>
      </div>

      {/* Properties */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="px-1 text-[11px] font-mono text-gray-500 dark:text-gray-400 font-bold">
          {Number(task.qtySubmit || 0)}
        </span>

        {task.designer && <Pill label={task.designer.displayName} color={task.designer.avatarColor} />}

        {task.pages != null && (
          <span className="px-1 text-[11px] font-mono text-gray-500 dark:text-gray-400 font-bold">
            @{Number(task.pages)}p
          </span>
        )}

        {task.taskAccounts.map((ta) => (
          <Pill key={ta.account.id} label={ta.account.displayName} color={ta.account.color} />
        ))}

        {task.languages?.map((language) => (
          <Pill key={language} label={language} color="#7c3aed" />
        ))}

        {task.doctype && <Pill label={task.doctype.displayName} color="#ec4899" />}

        {task.license && <Pill label={task.license} color="#22c55e" />}

        {commentCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono text-gray-400 dark:text-gray-500">
            <MessageSquare className="w-3 h-3" />
            {commentCount}
          </span>
        )}
      </div>
    </div>
  );
}
