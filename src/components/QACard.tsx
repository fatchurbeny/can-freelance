'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, FileText, MoreHorizontal, Copy, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { duplicateTaskAction, deleteTaskAction } from '@/app/actions/qa';

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

/** Notion-ish property pill. Cloudflare style with subtle border and translucent fill. */
function Pill({ label, color }: { label: string; color?: string | null }) {
  const tint = color || '#666666';
  return (
    <span
      className="inline-flex items-center rounded-[4px] border px-1.5 py-0.5 font-sans text-[10px] font-semibold leading-none tracking-tight transition-colors"
      style={{
        backgroundColor: `${tint}18`,
        borderColor: `${tint}40`,
        color: tint,
      }}
    >
      {label}
    </span>
  );
}

export default function QACard({ task, onOpen, dimmed = false, onDragStateChange }: Props) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setIsDuplicating(true);
    try {
      const res = await duplicateTaskAction(task.id);
      if (res.success) {
        toast.success('Task berhasil diduplikasi');
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal menduplikasi task');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menduplikasi task');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteTaskAction(task.id);
      if (res.success) {
        toast.success('Task berhasil dihapus');
        setIsDeleteModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal menghapus task');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus task');
    } finally {
      setIsDeleting(false);
    }
  };

  const commentCount = task.comments?.length ?? 0;

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          if (dragging || isMenuOpen) return;
          onOpen(task);
        }}
        className={`relative group cursor-pointer p-3.5 bg-white dark:bg-[#0d0e12] hover:bg-gray-50/80 dark:hover:bg-[#16181d]/80 transition-colors ${
          dragging ? 'cursor-grabbing opacity-50' : 'cursor-grab active:cursor-grabbing'
        } ${dimmed && !dragging ? 'opacity-40' : ''}`}
      >
        {/* Hover Action Trigger (Cloudflare style 3-dots icon at top-right) */}
        <div className="absolute right-2.5 top-2.5 z-10" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            aria-label="Task options"
            className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100/90 dark:bg-[#16181d] border border-gray-200/80 dark:border-[#272a34] shadow-sm hover:bg-gray-200 dark:hover:bg-[#20232b] text-gray-700 dark:text-gray-300 transition-all cursor-pointer ${
              isMenuOpen ? 'opacity-100 ring-1 ring-[#ff5e1f] bg-gray-200 dark:bg-[#20232b]' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                }}
              />
              <div
                className="absolute right-0 top-8 z-30 w-36 bg-white dark:bg-[#16181d] border border-gray-200 dark:border-[#272a34] rounded-xl shadow-xl p-1.5 font-sans text-xs flex flex-col gap-0.5 animate-in fade-in-50 zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={isDuplicating || isDeleting}
                  onClick={handleDuplicate}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#20232b] transition-colors cursor-pointer font-medium disabled:opacity-50"
                >
                  {isDuplicating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff5e1f]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  )}
                  <span>Duplicate</span>
                </button>

                <button
                  type="button"
                  disabled={isDuplicating || isDeleting}
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer font-medium disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Title */}
        <div className="flex items-start gap-2 pr-9">
          <FileText className="mt-0.5 w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
          <h3 className="min-w-0 flex-1 text-xs font-medium leading-snug text-gray-900 dark:text-gray-100 group-hover:text-[#ff5e1f] transition-colors">
            {task.name || 'Untitled Task'}
          </h3>
        </div>

        {/* Properties */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-[4px] border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-1.5 py-0.5 font-sans text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-none">
            {Number(task.qtySubmit || 0)}
          </span>

          {task.designer && <Pill label={task.designer.displayName} color={task.designer.avatarColor} />}

          {task.pages != null && (
            <span className="inline-flex items-center rounded-[4px] border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] px-1.5 py-0.5 font-sans text-[10px] font-bold text-gray-500 dark:text-gray-400 leading-none">
              @{Number(task.pages)}p
            </span>
          )}

          {task.taskAccounts.map((ta) => (
            <Pill key={ta.account.id} label={ta.account.displayName} color={ta.account.color || '#ff5e1f'} />
          ))}

          {task.languages?.map((language) => (
            <Pill key={language} label={language} color="#6366f1" />
          ))}

          {task.doctype && <Pill label={task.doctype.displayName} color="#ec4899" />}

          {task.priority && (
            <Pill
              label={task.priority}
              color={
                task.priority.toLowerCase() === 'urgent'
                  ? '#a855f7'
                  : task.priority.toLowerCase() === 'high'
                  ? '#f43f5e'
                  : task.priority.toLowerCase() === 'medium'
                  ? '#f59e0b'
                  : '#10b981'
              }
            />
          )}

          {task.license && (
            <Pill
              label={task.license}
              color={task.license.toLowerCase() === 'pro' ? '#10b981' : '#8b5cf6'}
            />
          )}

          {commentCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 font-sans text-[10px] font-medium text-gray-400 dark:text-gray-500">
              <MessageSquare className="w-3 h-3" />
              {commentCount}
            </span>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans"
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeleting) setIsDeleteModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] rounded-xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Hapus Task Ini?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-[#16181d] p-3 rounded-lg border border-[#f0f0f0] dark:border-[#272a34]">
              Task <strong className="text-gray-900 dark:text-white">&quot;{task.name || 'Untitled Task'}&quot;</strong> akan dihapus dari aplikasi dan diarsipkan pada Notion.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#20232b] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isDeleting ? 'Menerapkan...' : 'Ya, Hapus Task'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

