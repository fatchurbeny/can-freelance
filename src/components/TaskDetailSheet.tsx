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
  children,
  tint,
  badge,
  pill = false,
  bordered = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
  children?: React.ReactNode;
  tint?: string;
  badge?: string;
  pill?: boolean;
  bordered?: boolean;
}) {
  const badgeCls = bordered
    ? 'border border-[#E8E0D8] dark:border-[#262936] rounded-[6px] w-[42px] justify-center items-center flex flex-col px-1.5 py-0.5 text-xs font-medium leading-normal text-gray-900 dark:text-white whitespace-nowrap'
    : `flex items-center justify-center px-2 py-0.5 ${pill ? 'rounded-[80px]' : 'rounded-[6px]'} text-xs font-medium leading-normal text-white whitespace-nowrap`;
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-gray-500 dark:text-white/80" />
      {label && (
        <span className="w-[96px] shrink-0 text-xs font-medium leading-normal text-gray-500 dark:text-[#6b7280] capitalize">
          {label}
        </span>
      )}
      <span className={badgeCls} style={bordered ? undefined : { background: tint || '#6b7280' }}>
        {badge ?? children}
      </span>
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Task details: ${task.name || 'Untitled Task'}`}
        className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-[#E8E0D8] bg-white shadow-2xl dark:border-[#262936] dark:bg-[#12141a]"
      >
        {/* Header */}
        <div className="flex shrink-0 flex-col gap-2.5 border-b border-[#E8E0D8] px-4 py-3 dark:border-[#262936]">
          <div className="flex items-center gap-2">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-[rgba(59,123,255,0.25)]">
              <FileText className="size-3.5 text-white" />
            </div>
            <h2 className="min-w-0 flex-1 truncate text-[15px] font-medium leading-normal text-gray-900 dark:text-white">
              {task.name || 'Untitled Task'}
            </h2>
            {task.notionUrl && (
              <a
                href={task.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Notion"
                className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-700 dark:text-[#6b7280] dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close task details"
              className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-700 dark:text-[#6b7280] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <AlarmClock className="size-3.5 shrink-0 text-gray-400 dark:text-white/80" />
            <span className="w-[96px] shrink-0 text-xs font-medium leading-normal text-gray-500 capitalize dark:text-white">
              Last edited time
            </span>
            <span className="shrink-0 rounded-[80px] border border-[#E8E0D8] px-2 py-0.5 text-xs font-medium leading-normal text-gray-700 whitespace-nowrap dark:border-[#262936] dark:text-white">
              {lastEditedLabel}
            </span>
          </div>
        </div>

        {/* Properties */}
        <div className="flex shrink-0 flex-col gap-2.5 border-b border-[#E8E0D8] px-4 py-3 dark:border-[#262936]">
          {task.designStatus && <PropRow icon={CircleDot} label="Design Status" tint="#3b7bff" badge={task.designStatus.displayName} pill />}
          {task.designer && <PropRow icon={Users} label="Designer" tint={task.designer.avatarColor || '#ec4899'} badge={task.designer.displayName} />}
          {task.doctype && (
            <PropRow icon={BookOpen} label="Doctype" tint="#6b7280" badge={task.doctype.displayName} />
          )}
          <PropRow icon={FileText} label="QTY Submit" bordered>{Number(task.qtySubmit || 0)}</PropRow>
          <PropRow icon={FileText} label="Pages" bordered>{Number(task.pages || 0)}</PropRow>
          {task.languages && task.languages.length > 0 && (
            <PropRow icon={Languages} label="IND/ENG" tint="#6646b1" badge={task.languages.join(' / ')} />
          )}
          {task.priority && <PropRow icon={Gauge} label="Priority" tint="#e05c5e" badge={task.priority} />}
          {task.license && <PropRow icon={KeyRound} label="License" tint="#22c35d" badge={task.license} />}
          {task.taskMonth && <PropRow icon={CalendarDays} label="Task month" tint="#f0a848" badge={task.taskMonth} />}
          {task.taskAccounts.length > 0 && (
            <PropRow
              icon={Building2}
              label="Brand"
              tint="#6646b1"
              badge={task.taskAccounts.map((ta) => ta.account.displayName).join(' / ')}
            />
          )}
        </div>

        {/* Body scroller */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {done && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-[12px] font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
              <CheckCircle className="size-4" />
              {done}
            </div>
          )}

          {/* Status actions */}
          {actions.length > 0 && (
            <section className="mb-5 flex flex-col gap-2.5">
              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-[#6b7280]">
                Next Action
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-[#E8E0D8] dark:border-[#262936]">
                {actions.map((cardAction) => (
                  <button
                    key={cardAction.target}
                    type="button"
                    onClick={() => runAction(cardAction)}
                    disabled={pending !== null}
                    aria-label={`${cardAction.label} ${task.name || 'untitled task'}`}
                    className="rounded-[80px] border border-[#E8E0D8] px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-black/[0.04] hover:text-gray-900 disabled:cursor-wait disabled:opacity-50 dark:border-[#262936] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    {pending === cardAction.target ? 'Updating...' : cardAction.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Canva Template Link */}
          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-[#6b7280]">
              <FileText className="size-3.5" />
              Canva Template Link
            </h3>
            <div className="flex flex-col gap-1 pl-[26px]">
              {task.canvaLinks.length > 0 ? (
                task.canvaLinks.map((link, index) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.url}
                    className="flex items-center gap-1.5 text-xs font-medium capitalize text-[#615fff] transition-opacity hover:opacity-80"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    Template-{index + 1}
                  </a>
                ))
              ) : (
                <p className="text-sm text-gray-400 dark:text-[#6b7280]">No template link.</p>
              )}
            </div>
          </section>

          {/* Comments */}
          <section className="mt-4">
            <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-[#6b7280]">
              <MessageSquare className="size-3.5" />
              Comments{commentCount > 0 && ` (${commentCount})`}
            </h3>
            <div className="mt-3 space-y-3">
              {!loaded ? (
                <div className="flex justify-center py-6">
                  <div className="size-5 animate-spin rounded-full border-2 border-[#615FFF] border-t-transparent" />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-3 text-center text-[12px] text-gray-400 dark:text-[#6b7280]">No comments yet</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="group relative rounded-xl border border-[#E8E0D8] bg-gray-50 px-4 py-3 dark:border-[#262936] dark:bg-[#12141a]">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-[#6b7280] dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      title="Delete comment"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <p className="text-[13px] whitespace-pre-wrap text-gray-700 pr-6 dark:text-white/80">{c.content}</p>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400 dark:text-[#6b7280]">
                      <Clock className="size-3" />
                      {new Date(c.createdAt).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Comment input */}
        <div className="flex shrink-0 items-center gap-2 border-t border-[#E8E0D8] px-4 py-3 dark:border-[#262936]">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            placeholder="Type your comment"
            rows={2}
            className="min-w-0 flex-1 resize-none rounded-[8px] border border-[#E8E0D8] bg-transparent px-3 py-2 text-xs text-gray-900 placeholder-gray-400 transition-colors focus:border-[#615FFF] focus:outline-none dark:border-[#262936] dark:text-white dark:placeholder-[#6b7280]"
          />
          <button
            onClick={handleSubmit}
            disabled={sending || !content.trim()}
            className="flex shrink-0 items-center gap-1 self-center rounded-[10px] bg-[#615FFF] px-6 py-[10px] text-sm font-medium text-white transition-colors hover:bg-[#4f4ae6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="size-[18px]" />
            send
          </button>
        </div>
      </aside>
    </div>
  );
}
