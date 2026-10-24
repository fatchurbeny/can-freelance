'use client';

import { useState, useEffect, useRef } from 'react';
import { Edit3, Copy, Check, Clock, Trash2, Send, Loader2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import DesignBriefPreview from './DesignBriefPreview';
import { useAccess } from '@/context/AccessContext';
import DesignBriefEditorDrawer, { mergePaletteMarkdown } from './DesignBriefEditorDrawer';
import { mergeAssetsMarkdown } from '@/lib/asset-brief';
import { NOTES_HEADING, shufflePaletteMarkdown } from './brief-parser';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
}

interface Props {
  bodyText: string;
  onBodyTextChange: (nextText: string) => void;
  comments: Comment[];
  commentsLoaded: boolean;
  onAddComment: (content: string) => Promise<boolean>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
  sendingComment: boolean;
  /** Dipanggil saat drawer Edit Brief (kanan) dibuka/ditutup, agar drawer task bergeser ke kiri. */
  onEditorOpenChange?: (open: boolean) => void;
}

const BODY_DEBOUNCE_MS = 1500;

export default function DesignBriefSection({
  bodyText,
  onBodyTextChange,
  comments,
  commentsLoaded,
  onAddComment,
  onDeleteComment,
  sendingComment,
  onEditorOpenChange,
}: Props) {
  const access = useAccess();
  // Brief hanya diubah oleh role manajemen (task.edit); designer hanya membaca & berkomentar.
  const canEditBrief = !access.enabled || access.permissions.includes('task.edit');
  const [activeTab, setActiveTab] = useState<'brief' | 'comments'>('brief');
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [draftBody, setDraftBody] = useState(bodyText);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);
  const saveRef = useRef(onBodyTextChange);
  saveRef.current = onBodyTextChange;

  useEffect(() => {
    if (pendingRef.current === null) setDraftBody(bodyText);
  }, [bodyText]);

  const flush = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (pendingRef.current !== null) {
      const text = pendingRef.current;
      pendingRef.current = null;
      saveRef.current(text);
    }
  };

  // Save any pending brief edits when the drawer closes
  useEffect(() => () => flush(), []);

  const handleDraftChange = (next: string) => {
    setDraftBody(next);
    pendingRef.current = next;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, BODY_DEBOUNCE_MS);
  };

  const switchTab = (tab: 'brief' | 'comments') => {
    flush();
    setActiveTab(tab);
  };

  const toggleMode = () => {
    if (viewMode === 'edit') flush();
    setViewMode(viewMode === 'edit' ? 'preview' : 'edit');
  };

  const editorOpen = canEditBrief && viewMode === 'edit';

  useEffect(() => {
    onEditorOpenChange?.(editorOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorOpen]);

  const handleCopyBrief = () => {
    if (!draftBody.trim()) {
      toast.error('Brief masih kosong');
      return;
    }
    navigator.clipboard.writeText(draftBody);
    setCopiedBrief(true);
    toast.success('Design Brief disalin');
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  const handleInsertPalette = (paletteMarkdown: string) => {
    const next = mergePaletteMarkdown(draftBody, paletteMarkdown);
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = null;
    setDraftBody(next);
    onBodyTextChange(next);
  };

  const handleInsertAssets = (sectionMarkdown: string) => {
    const next = mergeAssetsMarkdown(draftBody, sectionMarkdown);
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = null;
    setDraftBody(next);
    onBodyTextChange(next);
  };

  const handleShufflePalette = () => {
    const next = shufflePaletteMarkdown(draftBody);
    if (!next) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = null;
    setDraftBody(next);
    onBodyTextChange(next);
  };

  const handleAddNotes = () => {
    const next = `${(draftBody || '').trim()}\n\n## ${NOTES_HEADING}\n`.trim() + '\n';
    handleDraftChange(next);
    setViewMode('edit');
  };

  const handleSendComment = async () => {
    const trimmed = commentInput.trim();
    if (!trimmed) return;
    if (await onAddComment(trimmed)) setCommentInput('');
  };

  const tabClass = (active: boolean) =>
    `h-[46px] flex items-center justify-center gap-2 font-sans text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
      active
        ? 'text-[#ff5e1f] border-[#ff5e1f]'
        : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
    }`;

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-[#0d0e12] border-t border-[#f0f0f0] dark:border-[#272a34]">
      {/* Tabs */}
      <div role="tablist" className="grid grid-cols-2 border-b border-[#f0f0f0] dark:border-[#272a34] shrink-0">
        <button type="button" role="tab" aria-selected={activeTab === 'brief'} onClick={() => switchTab('brief')} className={tabClass(activeTab === 'brief')}>
          Design Brief
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'comments'} onClick={() => switchTab('comments')} className={`${tabClass(activeTab === 'comments')} border-l border-l-[#f0f0f0] dark:border-l-[#272a34]`}>
          Comments ({comments.length})
        </button>
      </div>

      {activeTab === 'brief' && (
        <div className="flex flex-1 flex-col gap-4 bg-[#f8f9fb] dark:bg-[#16181d]/60 px-5 pt-5 pb-24">
          {/* Brief toolbar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Design Brief</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Wireframe, referensi &amp; palet untuk designer</p>
            </div>
            <button
              type="button"
              onClick={handleCopyBrief}
              className="flex items-center gap-1.5 h-8 px-3 border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:text-[#ff5e1f] transition-colors cursor-pointer"
            >
              {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBrief ? 'Tersalin' : 'Copy'}</span>
            </button>
            {canEditBrief && (
            <button
              type="button"
              onClick={toggleMode}
              className={`flex items-center gap-1.5 h-8 px-3 border text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                viewMode === 'edit'
                  ? 'bg-[#ff5e1f] border-[#ff5e1f] text-white hover:bg-[#ff7038]'
                  : 'bg-white dark:bg-[#0d0e12] border-[#f0f0f0] dark:border-[#272a34] text-gray-700 dark:text-gray-300 hover:border-[#ff5e1f]'
              }`}
            >
              <Edit3 className={`w-3.5 h-3.5 ${viewMode === 'edit' ? '' : 'text-[#ff5e1f]'}`} />
              <span>{viewMode === 'edit' ? 'Editing' : 'Edit'}</span>
            </button>
            )}
          </div>

          <DesignBriefPreview
            bodyText={draftBody}
            onAddNotes={canEditBrief ? handleAddNotes : undefined}
            onShufflePalette={canEditBrief ? handleShufflePalette : undefined}
          />
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="flex flex-1 flex-col">
          <div className="flex-1 divide-y divide-[#f0f0f0] dark:divide-[#272a34] min-h-[240px]">
            {!commentsLoaded ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-[#ff5e1f]" />
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <MessageSquare className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Belum ada komentar</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="group relative px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
                  <button
                    type="button"
                    onClick={() => onDeleteComment(c.id)}
                    aria-label="Hapus komentar"
                    className="absolute right-4 top-3 p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <p className="pr-6 text-xs leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{c.content}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] items-stretch h-11 border-t border-[#f0f0f0] dark:border-[#272a34]">
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment();
              }}
              aria-label="Tulis komentar"
              placeholder="Tulis komentar... (Cmd/Ctrl + Enter untuk kirim)"
              rows={1}
              className="h-full w-full resize-none border-0 bg-transparent px-5 py-3 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
            />
            <button
              type="button"
              onClick={handleSendComment}
              disabled={sendingComment || !commentInput.trim()}
              className="flex h-full items-center justify-center gap-1.5 bg-[#ff5e1f] px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Kirim</span>
            </button>
          </div>
        </div>
      )}
      {editorOpen && (
        <DesignBriefEditorDrawer
          value={draftBody}
          onChange={handleDraftChange}
          onInsertPalette={handleInsertPalette}
          onInsertAssets={handleInsertAssets}
          onClose={toggleMode}
          subtitle="Tersimpan otomatis · preview di drawer task"
        />
      )}
    </div>
  );
}
