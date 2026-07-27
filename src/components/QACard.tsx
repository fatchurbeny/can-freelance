'use client';

import { useState } from 'react';
import { ExternalLink, MessageSquare, ArrowRight, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { updateTaskStatusAction } from '@/app/actions/qa';

interface QATask {
  id: string;
  name: string | null;
  notionUrl: string | null;
  designer: { id: string; displayName: string; avatarColor: string | null } | null;
  doctype: { id: string; displayName: string } | null;
  designStatus: { id: string; notionKey: string; displayName: string } | null;
  taskAccounts: { account: { id: string; displayName: string; color: string | null } }[];
  canvaLinks: { id: string; url: string }[];
  qtySubmit: string | number | null;
}

interface Props {
  task: QATask;
  onAddComment: () => void;
  showActions?: boolean;
  compact?: boolean;
  transparentBg?: boolean;
}

export default function QACard({ task, onAddComment, showActions = false, compact = false, transparentBg = false }: Props) {
  const [moving, setMoving] = useState(false);
  const [moved, setMoved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const initials = task.designer?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const handleMoveToReview = async () => {
    setMoving(true);
    const result = await updateTaskStatusAction(task.id, 'In Review');
    if (result.success) {
      setMoved(true);
    } else {
      setMoving(false);
      alert(result.error || 'Failed to update status');
    }
  };

  if (moved) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-6 flex items-center gap-3 text-emerald-700 dark:text-emerald-400 transition-all duration-300">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Moved to In Review</span>
      </div>
    );
  }

  return (
    <div 
      className={`cursor-pointer group rounded-2xl border transition-all duration-200 ${
        transparentBg
          ? 'border-[#DAD9D6] shadow-none hover:bg-white dark:hover:bg-white'
          : 'border-gray-100 bg-white shadow-sm hover:shadow-md dark:border-gray-800 dark:bg-[#111827]'
      } ${
        compact && !isExpanded
          ? 'px-4 py-2.5'
          : 'p-6'
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="space-y-4">
        {/* Header: Task Name */}
        <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {task.name || 'Untitled Task'}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Status badge */}
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            task.designStatus?.notionKey === 'QA'
              ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-400'
              : task.designStatus?.notionKey === 'In Progress'
                ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-950/30 dark:text-indigo-400'
                : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400'
          }`}>
            {task.designStatus?.displayName || task.designStatus?.notionKey || 'Unknown'}
          </span>
          {/* Chevron */}
            <button 
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
        </div>
      </div>

      </div>

      {/* Detail row */}
      {isExpanded && (
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {/* Designer Avatar */}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: task.designer?.avatarColor || '#6366F1' }}
            >
              {initials}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {task.designer?.displayName || 'Unknown'}
            </span>
          </div>

          <span className="text-gray-300 dark:text-gray-600">·</span>

          {/* Doctype */}
          {task.doctype && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
              {task.doctype.displayName}
            </span>
          )}

          {/* Brand badges */}
          {task.taskAccounts.map((ta) => (
            <span
              key={ta.account.id}
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: (ta.account.color || '#6366F1') + '18',
                color: ta.account.color || '#6366F1',
                borderColor: (ta.account.color || '#6366F1') + '30',
              }}
            >
              {ta.account.displayName}
            </span>
          ))}

          {/* QTY Submit pill */}
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 flex items-center justify-center min-w-[24px]">
            {Number(task.qtySubmit || 0)} Templates
          </span>
        </div>
      )}

      {/* Canva Links and Actions (Collapsible) */}
      {isExpanded && (
        <div 
          className="space-y-4 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Canva Links */}
          {task.canvaLinks.length > 0 && (
            <div className="flex flex-col gap-3">
                {task.canvaLinks.map((link, index) => {
                  return (
                    <div key={link.id} className="flex items-center gap-2 group">
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        Template-{index + 1}
                      </span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 truncate hover:underline ml-1"
                      >
                        {link.url}
                      </a>
                    </div>
                  );
                })}
              </div>
          )}

          {showActions && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleMoveToReview}
                disabled={moving}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                {moving ? 'Moving...' : 'Move to In Review'}
              </button>
              <button
                onClick={onAddComment}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Add Comment
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
