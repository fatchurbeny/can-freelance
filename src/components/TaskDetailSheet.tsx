'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, ExternalLink, Send, Clock, Trash2, FileText, MessageSquare, CheckCircle,
  AlarmClock, CalendarDays, Gauge, Users, BookOpen, Building2, Languages, KeyRound, CircleDot,
} from 'lucide-react';
import { updateTaskStatusAction, addCommentAction, getTaskCommentsAction, deleteCommentAction } from '@/app/actions/qa';
import type { CardAction } from './QACard';

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
  priority?: string | null;
  taskMonth?: string | null;
  lastEditedTime?: string | number | null;
}

interface Props {
  task: QATask | null;
  actions?: CardAction[];
  onClose: () => void;
  onMoved?: (taskId: string) => void;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
}

function PropRow({
  icon: Icon,
  label,
  value,
  tint,
  pill = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: React.ReactNode;
  tint?: string;
  pill?: boolean;
}) {
  return (
    <div className="flex items-stretch text-xs font-mono">
      <div className="w-[140px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3.5 py-2 flex items-center gap-2 text-gray-500 dark:text-gray-400 font-bold select-none">
        <Icon className="w-3.5 h-3.5 shrink-0 text-gray-400" />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex-1 px-3.5 py-2 flex items-center gap-2 text-gray-900 dark:text-gray-200 min-w-0 bg-white dark:bg-[#0d0e12]">
        {tint ? (
          <span
            className={`px-2 py-0.5 text-[11px] font-bold ${pill ? 'rounded-full' : 'rounded'} whitespace-nowrap`}
            style={{ backgroundColor: `${tint}25`, color: tint }}
          >
            {value}
          </span>
        ) : (
          <span className="font-bold">{value}</span>
        )}
      </div>
    </div>
  );
}

export default function TaskDetailSheet({ task, actions = [], onClose, onMoved }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [content, setContent] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const taskId = task?.id;

  useEffect(() => {
    if (!taskId) return;
    setDone(null);
    setPending(null);
    setComments([]);
    setLoaded(false);
    setContent('');
    getTaskCommentsAction(taskId).then(setComments).finally(() => setLoaded(true));
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [taskId, onClose]);

  if (!task) return null;

  const runAction = async (cardAction: CardAction) => {
    setPending(cardAction.target);
    const result = await updateTaskStatusAction(task.id, cardAction.target);
    if (result.success) {
      setDone(cardAction.doneLabel);
      onMoved?.(task.id);
    } else {
      setPending(null);
      alert(result.error || `Failed to move task to ${cardAction.target}`);
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSending(true);
    const result = await addCommentAction(task.id, trimmed);
    if (result.success) {
      setContent('');
      const updated = await getTaskCommentsAction(task.id);
      setComments(updated);
    } else {
      alert(result.error || 'Failed to add comment');
    }
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const result = await deleteCommentAction(commentId);
    if (!result.success) {
      alert(result.error || 'Failed to delete comment');
      const updated = await getTaskCommentsAction(task.id);
      setComments(updated);
    }
  };

  const commentCount = task.comments?.length ?? comments.length;

  const lastEditedLabel = (() => {
    if (!task.lastEditedTime) return '—';
    const d = new Date(task.lastEditedTime);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  })();

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Task details: ${task.name || 'Untitled Task'}`}
        className="absolute inset-y-0 right-0 flex w-full max-w-[500px] flex-col border-l border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] shadow-none"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] dark:border-[#272a34] px-5 py-4 bg-white dark:bg-[#0d0e12]">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <FileText className="w-4 h-4 text-[#ff5e1f] shrink-0" />
            <h2 className="truncate text-sm font-mono font-bold text-gray-900 dark:text-white">
              {task.name || 'Untitled Task'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {task.notionUrl && (
              <a
                href={task.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Notion"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close task details"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader Metadata */}
        <div className="px-5 py-2.5 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-bold">
            <AlarmClock className="w-3.5 h-3.5 text-gray-400" />
            <span>Last Edited Time</span>
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-300">{lastEditedLabel}</span>
        </div>

        {/* Main Content Area */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {done && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              {done}
            </div>
          )}

          {/* 2-Column Symmetric Properties Table */}
          <div className="rounded-xl overflow-hidden border border-[#f0f0f0] dark:border-[#272a34] divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
            {task.designStatus && (
              <PropRow icon={CircleDot} label="Design Status" tint="#3b7bff" value={task.designStatus.displayName} pill />
            )}
            {task.designer && (
              <PropRow icon={Users} label="Designer" tint={task.designer.avatarColor || '#ec4899'} value={task.designer.displayName} />
            )}
            {task.doctype && (
              <PropRow icon={BookOpen} label="Doctype" tint="#ec4899" value={task.doctype.displayName} />
            )}
            <PropRow icon={FileText} label="QTY Submit" value={Number(task.qtySubmit || 0)} />
            <PropRow icon={FileText} label="Pages" value={`@${Number(task.pages || 0)}p`} />
            {task.languages && task.languages.length > 0 && (
              <PropRow icon={Languages} label="IND/ENG" tint="#7c3aed" value={task.languages.join(' / ')} />
            )}
            {task.priority && <PropRow icon={Gauge} label="Priority" tint="#e05c5e" value={task.priority} />}
            {task.license && <PropRow icon={KeyRound} label="License" tint="#22c55e" value={task.license} />}
            {task.taskMonth && <PropRow icon={CalendarDays} label="Task Month" tint="#ff5e1f" value={task.taskMonth} />}
            {task.taskAccounts.length > 0 && (
              <PropRow
                icon={Building2}
                label="Brand"
                tint="#06b6d4"
                value={task.taskAccounts.map((ta) => ta.account.displayName).join(' / ')}
              />
            )}
          </div>

          {/* Status actions */}
          {actions.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                NEXT ACTION
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {actions.map((cardAction) => (
                  <button
                    key={cardAction.target}
                    type="button"
                    onClick={() => runAction(cardAction)}
                    disabled={pending !== null}
                    aria-label={`${cardAction.label} ${task.name || 'untitled task'}`}
                    className="px-3.5 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-xs font-mono font-bold text-gray-700 dark:text-gray-200 hover:bg-[#ff5e1f] hover:text-white dark:hover:bg-[#ff5e1f] dark:hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {pending === cardAction.target ? 'Updating...' : cardAction.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Canva Template Link */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              CANVA TEMPLATE LINK
            </h3>
            <div className="flex flex-col gap-1.5">
              {task.canvaLinks.length > 0 ? (
                task.canvaLinks.map((link, index) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.url}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-xs font-mono font-bold text-[#ff5e1f] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Template-{index + 1}
                  </a>
                ))
              ) : (
                <p className="text-xs font-mono text-gray-400 dark:text-gray-500">No template link.</p>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              COMMENTS {commentCount > 0 && `(${commentCount})`}
            </h3>
            <div className="space-y-2.5">
              {!loaded ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 animate-spin rounded-full border-2 border-[#ff5e1f] border-t-transparent" />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-4 text-center text-xs font-mono text-gray-400 dark:text-gray-500">
                  No comments yet
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="group relative rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 p-3.5">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="absolute right-2.5 top-2.5 p-1 rounded text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all cursor-pointer"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-xs font-mono text-gray-800 dark:text-gray-200 pr-6 whitespace-pre-wrap">{c.content}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-gray-400">
                      <Clock className="w-3 h-3" />
                      {new Date(c.createdAt).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Comment input */}
        <div className="flex shrink-0 items-center gap-2 border-t border-[#f0f0f0] dark:border-[#272a34] p-4 bg-white dark:bg-[#0d0e12]">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            placeholder="Type your comment..."
            rows={2}
            className="min-w-0 flex-1 resize-none rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-transparent px-3 py-2 text-xs font-mono text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#ff5e1f] transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={sending || !content.trim()}
            className="flex shrink-0 items-center gap-1.5 self-center rounded-lg bg-[#ff5e1f] px-5 py-2.5 text-xs font-mono font-bold text-white transition-colors hover:bg-[#e04e15] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
