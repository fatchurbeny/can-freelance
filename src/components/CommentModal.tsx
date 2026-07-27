'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Clock, Trash2 } from 'lucide-react';
import { addCommentAction, getTaskCommentsAction, deleteCommentAction } from '@/app/actions/qa';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
}

interface Props {
  taskId: string;
  taskName: string;
  onClose: () => void;
}

export default function CommentModal({ taskId, taskName, onClose }: Props) {
  const [content, setContent] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getTaskCommentsAction(taskId).then(setComments).finally(() => setLoaded(true));
  }, [taskId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSending(true);
    const result = await addCommentAction(taskId, trimmed);
    if (result.success) {
      setContent('');
      const updated = await getTaskCommentsAction(taskId);
      setComments(updated);
    } else {
      alert(result.error || 'Failed to add comment');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    
    // Optimistic update
    setComments(prev => prev.filter(c => c.id !== commentId));
    
    const result = await deleteCommentAction(commentId);
    if (!result.success) {
      alert(result.error || 'Failed to delete comment');
      // Revert if failed
      const updated = await getTaskCommentsAction(taskId);
      setComments(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Add Comment</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{taskName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comments List */}
        <div className="px-6 py-4 max-h-60 overflow-y-auto space-y-3">
          {!loaded ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No comments yet
            </p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 group relative"
              >
                <button
                  onClick={() => handleDelete(c.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete comment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap pr-6">
                  {c.content}
                </p>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                  <Clock className="w-3 h-3" />
                  {new Date(c.createdAt).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your comment... (Cmd+Enter to send)"
              rows={2}
              className="flex-1 text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 resize-none transition-all"
            />
            <button
              onClick={handleSubmit}
              disabled={sending || !content.trim()}
              className="self-end p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
