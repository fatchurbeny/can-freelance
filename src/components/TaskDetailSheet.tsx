'use client';

import { useAccess } from '@/context/AccessContext';
import { useEffect, useRef, useState } from 'react';
import {
  X, ExternalLink, Clock, Trash2, FileText, CheckCircle,
  AlarmClock, CalendarDays, Gauge, Users, BookOpen, Building2, Languages, KeyRound,
  CircleDot, Edit2, Plus, Link as LinkIcon, Loader2, Check, Globe
} from 'lucide-react';
import {
  updateTaskStatusAction, addCommentAction, getTaskCommentsAction,
  deleteCommentAction, updateTaskFieldsAction, fetchTaskMetadataOptionsAction,
  toggleChecklistItemAction, createMissingNotionPageAction, scanTaskDropboxAction, TaskUpdatePayload
} from '@/app/actions/qa';
import { readSnapshot, type DropboxFileInfo } from '@/lib/dropbox-files';
import { isMissingNotionPage } from '@/lib/notion-link';
import { validateTemplateLink } from '@/lib/validate-template-link';
import type { CardAction } from './QACard';
import toast from 'react-hot-toast';

import CustomSelectCell from './CustomSelectCell';
import MonthCalendarPicker from './MonthCalendarPicker';
import DesignBriefSection, { type BriefTab } from './task-detail/DesignBriefSection';
import ChecklistQASection, { CHECKLIST_TONE_CLASS, type ChecklistStage } from './task-detail/ChecklistQASection';
import {
  checklistGateError, checklistTone, extractChecklistSection, isApprovedStatus, isInReviewStatus,
  isPreWorkStatus, isQaStatus, mergeChecklistSection, parseChecklistSection,
} from '@/lib/checklist-qa';
import CustomFieldsSection from './task-detail/CustomFieldsSection';
import TaskShareButton from './task-detail/TaskShareButton';
import type { CustomFieldDef } from './custom-fields/FieldValueDisplay';
import { PRIORITY_OPTIONS, LICENSE_OPTIONS, getPagesForDoctype } from './task-form-utils';

interface QATask {
  id: string;
  name: string | null;
  notionUrl: string | null;
  /** `app_created_…` = belum punya halaman Notion (lib/notion-link.ts). */
  notionPageId?: string;
  designer: { id: string; displayName: string; avatarColor: string | null } | null;
  doctype: { id: string; displayName: string; qaChecklist?: string[] } | null;
  designStatus: { id: string; notionKey: string; displayName: string } | null;
  taskAccounts: { account: { id: string; displayName: string; color: string | null } }[];
  canvaLinks: { id: string; url: string }[];
  uploadRequestUrl?: string | null;
  outputUrl?: string | null;
  /** Snapshot folder Dropbox (lib/dropbox-files.ts) */
  dropboxFiles?: unknown;
  dropboxScannedAt?: string | Date | null;
  customFields?: Record<string, unknown> | null;
  productionUnitId?: string;
  productionUnit?: { platform: { outputType: string } } | null;
  comments?: { id: string; content: string; createdAt: string }[];
  qtySubmit: string | number | null;
  pages: string | number | null;
  languages?: string[];
  license?: string | null;
  priority?: string | null;
  taskMonth?: string | null;
  bodyText?: string | null;
  lastEditedTime?: string | number | null;
  /** Diisi bila task bagian dari order bundle; designer-nya mengikuti order. */
  bundleOrderId?: string | null;
}

interface Props {
  task: QATask | null;
  actions?: CardAction[];
  onClose: () => void;
  onMoved?: (taskId: string) => void;
  /** Tab yang dibuka (mis. dari indikator checklist di kartu); default mengikuti status task. */
  initialTab?: BriefTab;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
}

interface OptionItem {
  id: string;
  displayName: string;
  avatarColor?: string | null;
  color?: string | null;
  notionKey?: string;
  pages?: number | null;
  poolRate?: number | null;
  qaChecklist?: string[];
}



export default function TaskDetailSheet({ task, actions = [], onClose, onMoved, initialTab }: Props) {
  const access = useAccess();
  const canEditChecklist = !access.enabled || access.permissions.includes('task.edit');
  const canCreateTask = !access.enabled || access.permissions.includes('task.create');
  // Halaman Notion yang baru dibuat lewat "Buat di Notion" (task prop belum ter-refresh)
  const [createdNotionUrl, setCreatedNotionUrl] = useState<string | null>(null);
  const [creatingNotionPage, setCreatingNotionPage] = useState(false);
  const [dropboxFiles, setDropboxFiles] = useState<DropboxFileInfo[] | null>(null);
  const [dropboxScannedAt, setDropboxScannedAt] = useState<string | null>(null);
  const [openTab, setOpenTab] = useState<BriefTab>('brief');
  // Privasi per role: freelance tidak melihat brand/akun; Dropbox Link hanya untuk yang berhak.
  const canSeeBrand = !access.enabled || access.permissions.includes('account.view');
  const canSeeDropbox = !access.enabled || access.permissions.includes('dropboxLink.view');
  const canShare = !access.enabled || access.permissions.includes('task.share');
  // Task punya link publik aktif (dilaporkan TaskShareButton) → badge "Public view".
  const [isPublic, setIsPublic] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [briefEditing, setBriefEditing] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [content, setContent] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [isEditingAll, setIsEditingAll] = useState(false);
  const [activeEditingField, setActiveEditingField] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [taskName, setTaskName] = useState('');
  const [designerId, setDesignerId] = useState<string>('');
  const [doctypeId, setDoctypeId] = useState<string>('');
  const [designStatusId, setDesignStatusId] = useState<string>('');
  const [qtySubmit, setQtySubmit] = useState<number | string>('');
  const [pages, setPages] = useState<number | string>('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [priority, setPriority] = useState<string>('');
  const [license, setLicense] = useState<string>('');
  const [taskMonth, setTaskMonth] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [canvaUrls, setCanvaUrls] = useState<string[]>([]);
  const [newCanvaUrl, setNewCanvaUrl] = useState('');
  const [canvaLinkError, setCanvaLinkError] = useState('');

  const [designers, setDesigners] = useState<OptionItem[]>([]);
  const [doctypes, setDoctypes] = useState<OptionItem[]>([]);
  const [designStatuses, setDesignStatuses] = useState<OptionItem[]>([]);
  const [accounts, setAccounts] = useState<OptionItem[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  // Field tambahan production + field inti yang dimatikan
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [disabledFields, setDisabledFields] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const isOff = (key: string) => disabledFields.includes(key);

  const taskId = task?.id;

  useEffect(() => {
    if (!task) return;
    setDone(null);
    setPending(null);
    setComments([]);
    setLoaded(false);
    setContent('');
    setIsEditingAll(false);
    setActiveEditingField(null);

    setTaskName(task.name || '');
    setDesignerId(task.designer?.id || '');
    setDoctypeId(task.doctype?.id || '');
    setDesignStatusId(task.designStatus?.id || '');
    setQtySubmit(task.qtySubmit != null ? Number(task.qtySubmit) : '');
    setPages(task.pages != null ? Number(task.pages) : '');
    setLanguages(task.languages || []);
    setPriority(task.priority || '');
    setLicense(task.license || '');
    setTaskMonth(task.taskMonth || '');
    setBodyText(task.bodyText || '');
    setCreatedNotionUrl(null);
    setDropboxFiles(readSnapshot(task.dropboxFiles)?.files ?? null);
    setDropboxScannedAt(task.dropboxScannedAt ? new Date(task.dropboxScannedAt).toISOString() : null);
    // Status QA → buka tab Checklist QA (hanya bila task punya checklist; dicek di DesignBriefSection)
    setOpenTab(initialTab ?? (isQaStatus(task.designStatus) ? 'checklist' : 'brief'));
    setSelectedAccountIds(task?.taskAccounts?.map(ta => ta.account.id) || []);
    setCanvaUrls(task?.canvaLinks?.map(cl => cl.url) || []);
    setNewCanvaUrl('');
    setCanvaLinkError('');
    setCustomValues({ ...(task.customFields ?? {}) });
    setCustomFieldDefs([]);
    setDisabledFields([]);

    getTaskCommentsAction(task.id).then(setComments).finally(() => setLoaded(true));
    
    fetchTaskMetadataOptionsAction(task.productionUnitId).then((res) => {
      if (res.success && res.data) {
        setDesigners(res.data.designers || []);
        setDoctypes(res.data.doctypes || []);
        setDesignStatuses(res.data.designStatuses || []);
        setAccounts(res.data.accounts || []);
        setCustomFieldDefs(res.data.fields || []);
        setDisabledFields(res.data.disabledFields || []);
      }
      setOptionsLoaded(true);
    });

    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, onClose, initialTab]);

  if (!task) return null;


  const triggerAutoSave = async (patch: Partial<TaskUpdatePayload>) => {
    if (!task?.id) return;
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    try {
      const res = await updateTaskFieldsAction(task.id, patch);
      if (res.success) {
        setSaveStatus('saved');
        saveTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2500);
      } else {
        setSaveStatus('error');
        toast.error(res.error || 'Failed to auto-save field');
      }
    } catch (err: any) {
      setSaveStatus('error');
      toast.error(err?.message || 'Error auto-saving');
    }
  };

  const runAction = async (cardAction: CardAction) => {
    setPending(cardAction.target);
    const result = await updateTaskStatusAction(task.id, cardAction.target);
    if (result.success) {
      setDone(cardAction.doneLabel);
      onMoved?.(task.id);
    } else {
      setPending(null);
      toast.error(result.error || `Failed to move task to ${cardAction.target}`);
    }
  };

  const handleAddComment = async (commentText: string): Promise<boolean> => {
    const trimmed = commentText.trim();
    if (!trimmed) return false;
    setSending(true);
    const result = await addCommentAction(task.id, trimmed);
    setSending(false);
    if (result.success) {
      const updated = await getTaskCommentsAction(task.id);
      setComments(updated);
      return true;
    } else {
      toast.error(result.error || 'Failed to add comment');
      return false;
    }
  };

  const handleDeleteComment = async (commentId: string): Promise<boolean> => {
    if (!confirm('Delete this comment?')) return false;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const result = await deleteCommentAction(commentId);
    if (!result.success) {
      toast.error(result.error || 'Failed to delete comment');
      const updated = await getTaskCommentsAction(task.id);
      setComments(updated);
      return false;
    }
    return true;
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

  const activeDesigner = designers.find(d => d.id === designerId) || task.designer;
  const activeDoctype = doctypes.find(d => d.id === doctypeId) || task.doctype;
  const activeStatus = designStatuses.find(s => s.id === designStatusId) || task.designStatus;

  // Checklist QA: production Dropbox + Doctype yang punya daftar item
  const isDropbox = task.productionUnit?.platform.outputType === 'dropbox_link';
  const requiredChecklist =
    (doctypes.find((d) => d.id === doctypeId) ?? (task.doctype?.id === doctypeId ? task.doctype : null))?.qaChecklist ?? [];
  const hasChecklist = isDropbox && requiredChecklist.length > 0;
  const checklistState = parseChecklistSection(bodyText, requiredChecklist);
  const checklistStage: ChecklistStage = isQaStatus(activeStatus)
    ? 'qa'
    : isInReviewStatus(activeStatus) || isApprovedStatus(activeStatus)
      ? 'done'
      : isPreWorkStatus(activeStatus) ? 'pre' : 'progress';
  const inReviewLocked = hasChecklist && isQaStatus(activeStatus) && checklistState.done < checklistState.total;

  const notionUrl = createdNotionUrl ?? task.notionUrl;
  const missingNotionPage = !createdNotionUrl && isMissingNotionPage(task.notionPageId);

  const handleCreateNotionPage = async () => {
    setCreatingNotionPage(true);
    const res = await createMissingNotionPageAction(task.id);
    setCreatingNotionPage(false);
    if (res.success && 'notionUrl' in res) {
      setCreatedNotionUrl(res.notionUrl ?? '');
      toast.success('Halaman Notion dibuat');
    } else {
      toast.error(res.error || 'Gagal membuat halaman Notion');
    }
  };

  const handleRescanDropbox = async () => {
    const res = await scanTaskDropboxAction(task.id);
    if (res.success && 'dropboxScannedAt' in res) {
      if (res.bodyText !== undefined) setBodyText(res.bodyText ?? '');
      setDropboxFiles(res.dropboxFiles?.files ?? []);
      setDropboxScannedAt(res.dropboxScannedAt ?? null);
      toast.success('Folder Dropbox diperiksa');
    } else {
      toast.error(res.error || 'Gagal memeriksa folder Dropbox');
    }
  };

  const handleToggleChecklist = async (label: string, checked: boolean) => {
    const res = await toggleChecklistItemAction(task.id, label, checked);
    if (res.success && res.bodyText !== undefined) setBodyText(res.bodyText);
    else toast.error(res.error || 'Gagal mengubah Checklist QA');
  };

  const handleMoveToInReview = async () => {
    const target = designStatuses.find((s) => isInReviewStatus(s));
    const res = await updateTaskStatusAction(task.id, target?.notionKey || 'In Review');
    if (res.success) {
      if (target) setDesignStatusId(target.id);
      toast.success('Task dipindah ke In Review');
      onMoved?.(task.id);
    } else {
      toast.error(res.error || 'Gagal memindah task ke In Review');
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Task details: ${taskName || 'Untitled Task'}`}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[540px] transition-[right] duration-200 ease-out ${briefEditing ? 'min-[1100px]:right-[540px]' : ''} flex-col h-full max-h-screen border-l border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-2xl overflow-hidden font-sans`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] dark:border-[#272a34] p-4 sm:p-5 bg-gray-50/50 dark:bg-[#16181d]/50 gap-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <FileText className="w-4 h-4 text-[#ff5e1f] shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                onBlur={() => {
                  if (taskName !== (task.name || '')) {
                    triggerAutoSave({ name: taskName });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Task Name"
                className="w-full rounded-none border border-transparent bg-transparent hover:bg-white dark:hover:bg-[#0d0e12] focus:bg-white dark:focus:bg-[#0d0e12] focus:border-[#ff5e1f] px-2 py-1 font-sans text-sm font-bold text-gray-900 dark:text-white outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canShare && <TaskShareButton taskId={task.id} onActiveChange={setIsPublic} />}
            {notionUrl && (
              <a
                href={notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Notion"
                className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Open in Notion"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close task details"
              className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-2.5 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 flex items-center justify-between text-xs font-sans shrink-0">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-bold">
            <AlarmClock className="w-3.5 h-3.5 text-gray-400" />
            <span>Last Edited: <strong className="text-gray-700 dark:text-gray-300">{lastEditedLabel}</strong></span>
            {isPublic && (
              <span
                title="Task ini punya link publik view-only yang aktif"
                className="ml-1 flex items-center gap-1 border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
              >
                <Globe className="w-3 h-3" />
                Public view
              </span>
            )}
          </div>

          {/* Auto-save Status Indicator */}
          <div className="flex items-center gap-1.5 font-sans text-[11px] font-bold">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Menyimpan…</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check className="w-3 h-3" />
                <span>Tersimpan ✓</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-500">
                <span>Gagal menyimpan</span>
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="text-gray-400 dark:text-gray-500 text-[10px]">
                Auto-save aktif
              </span>
            )}
          </div>
        </div>

        {/* Task tersimpan tanpa halaman Notion (pembuatan halaman gagal saat task dibuat) */}
        {missingNotionPage && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#FED7AA] bg-[#FFF7ED] dark:border-orange-900/60 dark:bg-orange-950/30 px-5 py-2.5 font-sans text-xs">
            <span className="text-[#C2410C] dark:text-orange-400">
              Task ini belum ada di Notion; perubahan hanya tersimpan di app.
            </span>
            {canCreateTask && (
              <button
                type="button"
                onClick={handleCreateNotionPage}
                disabled={creatingNotionPage}
                className="flex shrink-0 items-center gap-1.5 h-7 px-3 bg-[#ff5e1f] text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {creatingNotionPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Buat di Notion
              </button>
            )}
          </div>
        )}

        {/* Main Content Area — Full Edge-to-Edge Continuous Container with Smooth Vertical Scrolling */}
        <div className="min-h-0 flex-1 overflow-y-auto flex flex-col divide-y divide-[#f0f0f0] dark:divide-[#272a34] p-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#272a34]">
          {done && (
            <div className="flex items-center gap-2 border-b border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-5 py-3 text-xs font-sans font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              {done}
            </div>
          )}

          {/* 2-Column Continuous Symmetrical Properties Table */}
          <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
            {/* Design Status Row */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <CircleDot className="w-3.5 h-3.5 text-gray-400" />
                <span>Design Status</span>
              </div>
              <div className="flex-1 p-0 flex flex-col justify-center min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {true ? (
                  <>
                  <CustomSelectCell
                    value={designStatusId}
                    placeholder="Select Status"
                    options={designStatuses.map((s) => ({ id: s.id, label: s.displayName }))}
                    onChange={(nextId) => {
                      const gateError = checklistGateError({
                        isDropbox,
                        current: activeStatus,
                        target: designStatuses.find((s) => s.id === nextId),
                        bodyText,
                        required: requiredChecklist,
                      });
                      if (gateError) {
                        toast.error(gateError);
                        return;
                      }
                      setDesignStatusId(nextId);
                      triggerAutoSave({ designStatusId: nextId || null });
                    }}
                  />
                  {inReviewLocked && (
                    <p className="px-5 pb-2 text-[11px] font-semibold text-[#C2410C] dark:text-orange-400">
                      In Review terkunci sampai Checklist QA {checklistState.total}/{checklistState.total}
                    </p>
                  )}
                  </>
                ) : (
                  <div
                    onClick={() => setActiveEditingField('designStatus')}
                    className="flex items-center justify-between w-full px-5 py-2.5 cursor-pointer group hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors"
                  >
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-[#3b7bff]/15 text-[#3b7bff]">
                      {activeStatus?.displayName || 'Not Set'}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Designer Row */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>Designer</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {task.bundleOrderId ? (
                  // Task bundle: designer mengikuti order bundle (ubah lewat Billing Statement → Order Bundle).
                  <div className="flex items-center gap-2 flex-wrap w-full px-5 py-2.5">
                    <span
                      className="px-2.5 py-0.5 text-[11px] font-bold rounded"
                      style={{
                        backgroundColor: `${activeDesigner?.avatarColor || '#ec4899'}25`,
                        color: activeDesigner?.avatarColor || '#ec4899',
                      }}
                    >
                      {activeDesigner?.displayName || 'Unassigned'}
                    </span>
                    <span className="text-[11px] text-gray-400">Mengikuti order bundle · ubah di Billing Statement</span>
                  </div>
                ) : true ? (
                  <CustomSelectCell
                    value={designerId}
                    placeholder="Select Designer"
                    options={designers.map((d) => ({ id: d.id, label: d.displayName }))}
                    onChange={(nextId) => {
                      setDesignerId(nextId);
                      triggerAutoSave({ designerId: nextId || null });
                    }}
                  />
                ) : (
                  <div
                    onClick={() => setActiveEditingField('designer')}
                    className="flex items-center justify-between w-full px-5 py-2.5 cursor-pointer group hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors"
                  >
                    <span
                      className="px-2.5 py-0.5 text-[11px] font-bold rounded"
                      style={{
                        backgroundColor: `${activeDesigner?.avatarColor || '#ec4899'}25`,
                        color: activeDesigner?.avatarColor || '#ec4899',
                      }}
                    >
                      {activeDesigner?.displayName || 'Unassigned'}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Doctype Row */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                <span>Doctype</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {true ? (
                  <CustomSelectCell
                    value={doctypeId}
                    placeholder="Select Doctype"
                    options={doctypes.map((dt) => ({ id: dt.id, label: dt.displayName }))}
                    onChange={(nextId) => {
                      setDoctypeId(nextId);
                      const selectedDoc = doctypes.find((d) => d.id === nextId);
                      const autoPages = getPagesForDoctype(selectedDoc);
                      setPages(autoPages);
                      triggerAutoSave({ doctypeId: nextId || null, pages: autoPages });
                    }}
                  />
                ) : (
                  <div
                    onClick={() => setActiveEditingField('doctype')}
                    className="flex items-center justify-between w-full px-5 py-2.5 cursor-pointer group hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors"
                  >
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded bg-[#ec4899]/15 text-[#ec4899]">
                      {activeDoctype?.displayName || 'Unspecified'}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* QTY Submit Row */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span>QTY Submit</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {true ? (
                  <div className="flex items-stretch w-full h-full min-h-[44px]">
                    <input
                      type="number"
                      min="0"
                      value={qtySubmit}
                      onChange={(e) => setQtySubmit(e.target.value)}
                      onBlur={() => {
                        const val = qtySubmit !== '' ? Number(qtySubmit) : null;
                        if (val !== (task.qtySubmit != null ? Number(task.qtySubmit) : null)) {
                          triggerAutoSave({ qtySubmit: val });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => setActiveEditingField('qtySubmit')}
                    className="flex items-center justify-between w-full px-5 py-2.5 cursor-pointer group hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors font-bold text-gray-900 dark:text-white"
                  >
                    <span>{qtySubmit !== '' ? qtySubmit : '0'}</span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Pages Row */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span>Pages</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {true ? (
                  <div className="flex items-stretch w-full h-full min-h-[44px]">
                    <input
                      type="number"
                      min="0"
                      value={pages}
                      onChange={(e) => setPages(e.target.value)}
                      onBlur={() => {
                        const val = pages !== '' ? Number(pages) : null;
                        if (val !== (task.pages != null ? Number(task.pages) : null)) {
                          triggerAutoSave({ pages: val });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => setActiveEditingField('pages')}
                    className="flex items-center justify-between w-full px-5 py-2.5 cursor-pointer group hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors font-bold text-gray-900 dark:text-white"
                  >
                    <span>@{pages !== '' ? pages : '0'}p</span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* IND/ENG Languages Row */}
            {!isOff('languages') && (
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Languages className="w-3.5 h-3.5 text-gray-400" />
                <span>IND/ENG</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {true ? (
                  <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                    {['IND', 'ENG'].map((lang) => {
                      const isSelected = languages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? languages.filter(l => l !== lang)
                              : [...languages, lang];
                            setLanguages(next);
                            triggerAutoSave({ languages: next });
                          }}
                          className={`h-full min-h-[44px] px-4 font-sans text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#7c3aed] text-white font-bold'
                              : 'bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => setActiveEditingField('languages')}
                    className="flex items-center justify-between w-full px-5 py-2.5 cursor-pointer group hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors"
                  >
                    <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded ${
                      languages.length > 0
                        ? 'bg-[#7c3aed]/15 text-[#7c3aed]'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {languages.length > 0 ? languages.join(' / ') : 'None'}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            )}

            {/* Priority Row */}
            {!isOff('priority') && (
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Gauge className="w-3.5 h-3.5 text-gray-400" />
                <span>Priority</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {true ? (
                  <CustomSelectCell
                    value={priority}
                    placeholder="Select Priority"
                    options={PRIORITY_OPTIONS}
                    onChange={(nextP) => {
                      setPriority(nextP);
                      triggerAutoSave({ priority: nextP || null });
                    }}
                  />
                ) : (
                  <div
                    onClick={() => setActiveEditingField('priority')}
                    className="flex items-center justify-between w-full px-5 py-2.5 cursor-pointer group hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors"
                  >
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded bg-[#e05c5e]/15 text-[#e05c5e]">
                      {priority || 'Normal'}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            )}

            {/* License Row */}
            {!isOff('license') && (
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                <span>License</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {true ? (
                  <CustomSelectCell
                    value={license}
                    placeholder="Select License"
                    options={LICENSE_OPTIONS}
                    onChange={(nextL) => {
                      setLicense(nextL);
                      triggerAutoSave({ license: nextL || null });
                    }}
                  />
                ) : (
                  <div
                    onClick={() => setActiveEditingField('license')}
                    className="flex items-center justify-between w-full px-5 py-2.5 cursor-pointer group hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors"
                  >
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded bg-[#22c55e]/15 text-[#22c55e]">
                      {license || 'Pro'}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            )}

            {/* Task Month Row */}
            {!isOff('taskMonth') && (
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                <span>Task Month</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {true ? (
                  <MonthCalendarPicker
                    value={taskMonth}
                    placeholder="Select Month"
                    onChange={(nextM) => {
                      setTaskMonth(nextM);
                      triggerAutoSave({ taskMonth: nextM || null });
                    }}
                  />
                ) : (
                  <div
                    onClick={() => setActiveEditingField('taskMonth')}
                    className="flex items-center justify-between w-full px-5 py-2.5 cursor-pointer group hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors"
                  >
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded bg-[#ff5e1f]/15 text-[#ff5e1f]">
                      {taskMonth || 'Unassigned'}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            )}

            {/* Brand (Accounts) Row */}
            {canSeeBrand && !isOff('brand') && (
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Brand</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {true ? (
                  <div className="flex flex-wrap gap-1.5 w-full p-2.5 bg-gray-50/50 dark:bg-[#16181d]/50">
                    {accounts.map((acc) => {
                      const isSelected = selectedAccountIds.includes(acc.id);
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? selectedAccountIds.filter(id => id !== acc.id)
                              : [...selectedAccountIds, acc.id];
                            setSelectedAccountIds(next);
                            triggerAutoSave({ accountIds: next });
                          }}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-none border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#06b6d4] border-[#06b6d4] text-white'
                              : 'bg-white dark:bg-[#0d0e12] border-[#f0f0f0] dark:border-[#272a34] text-gray-700 dark:text-gray-300 hover:border-[#06b6d4]'
                          }`}
                        >
                          {acc.displayName}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => setActiveEditingField('brand')}
                    className="flex items-center justify-between w-full px-5 py-2.5 cursor-pointer group hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors min-w-0"
                  >
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded bg-[#06b6d4]/15 text-[#06b6d4] truncate">
                      {(task?.taskAccounts?.length ?? 0) > 0
                        ? task?.taskAccounts.map((ta) => ta.account.displayName).join(' / ')
                        : 'Unassigned'}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400 shrink-0" />
                  </div>
                )}
              </div>
            </div>
            )}
          </div>


          {/* Platform Dropbox: tampilkan Upload & Dropbox Link; selain itu Canva Template Link */}
          {task?.productionUnit?.platform.outputType === 'dropbox_link' ? (
          <div className="flex flex-col bg-white dark:bg-[#0d0e12]">
            <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-[#16181d]/50 border-b border-[#f0f0f0] dark:border-[#272a34]">
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                DROPBOX
              </h3>
            </div>
            <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
              <div className="flex items-center justify-between gap-3 px-5 py-3 text-xs font-sans">
                <span className="text-gray-500 dark:text-gray-400 shrink-0">Upload Link</span>
                {task?.uploadRequestUrl ? (
                  <a href={task.uploadRequestUrl} target="_blank" rel="noopener noreferrer" className="truncate font-bold text-[#ff5e1f] hover:underline inline-flex items-center gap-1.5 min-w-0">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{task.uploadRequestUrl}</span>
                  </a>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">Belum dibuat</span>
                )}
              </div>
              {canSeeDropbox && (
              <div className="flex items-center justify-between gap-3 px-5 py-3 text-xs font-sans">
                <span className="text-gray-500 dark:text-gray-400 shrink-0">Dropbox Link</span>
                {task?.outputUrl ? (
                  <a href={task.outputUrl} target="_blank" rel="noopener noreferrer" className="truncate font-bold text-[#ff5e1f] hover:underline inline-flex items-center gap-1.5 min-w-0">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{task.outputUrl}</span>
                  </a>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">Menunggu file diunggah</span>
                )}
              </div>
              )}
            </div>
          </div>
          ) : isOff('canvaLink') ? null : (
          <div className="flex flex-col bg-white dark:bg-[#0d0e12]">
            <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-[#16181d]/50 border-b border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between">
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                CANVA TEMPLATE LINK
              </h3>
            </div>
            <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
              {canvaUrls.length > 0 ? (
                canvaUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 px-5 py-3 bg-white dark:bg-[#0d0e12]">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 truncate inline-flex items-center gap-2 text-xs font-sans font-bold text-[#ff5e1f] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Template-{idx + 1}: {url}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const next = canvaUrls.filter((_, i) => i !== idx);
                        setCanvaUrls(next);
                        triggerAutoSave({ canvaLinks: next });
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      title="Remove link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-5 py-3 text-xs font-sans text-gray-400 dark:text-gray-500">
                  No template link provided.
                </div>
              )}

              {/* Add New Canva Link Input Row */}
              <div className="flex flex-col gap-1">
                <div className="flex items-stretch h-10 bg-gray-50/50 dark:bg-[#16181d]/50 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
                  <input
                    type="url"
                    value={newCanvaUrl}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setNewCanvaUrl(nextValue);
                      const validation = validateTemplateLink(nextValue);
                      setCanvaLinkError(validation.ok || !nextValue.trim() ? '' : (validation.message || 'Invalid Canva link'));
                    }}
                    placeholder="https://canva.com/design/..."
                    className="flex-1 border-0 bg-transparent px-5 font-sans text-xs text-gray-900 dark:text-white outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const validation = validateTemplateLink(newCanvaUrl);
                      if (!validation.ok) {
                        setCanvaLinkError(validation.message || 'Invalid Canva link');
                        return;
                      }
                      const next = [...canvaUrls, validation.normalizedUrl || newCanvaUrl.trim()];
                      setCanvaUrls(next);
                      setNewCanvaUrl('');
                      setCanvaLinkError('');
                      triggerAutoSave({ canvaLinks: next });
                    }}
                    disabled={!validateTemplateLink(newCanvaUrl).ok}
                    className="px-5 bg-[#ff5e1f] text-white font-sans text-xs font-bold uppercase tracking-wider hover:bg-[#ff7038] transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD LINK</span>
                  </button>
                </div>
                {canvaLinkError && (
                  <p className="px-5 text-[11px] font-sans text-red-500">{canvaLinkError}</p>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Field tambahan per production (Notion) */}
          <CustomFieldsSection
            fields={customFieldDefs}
            values={customValues}
            onChange={(name, value) => {
              setCustomValues((prev) => ({ ...prev, [name]: value }));
              triggerAutoSave({ customFields: { [name]: value } });
            }}
          />

          {/* DESIGN BRIEF & COMMENTS TABBED INTERFACE */}
          <DesignBriefSection
            key={`${task.id}:${openTab}`}
            initialTab={openTab}
            checklist={hasChecklist ? {
              count: `${checklistState.done}/${checklistState.total}`,
              toneClass: CHECKLIST_TONE_CLASS[checklistTone(checklistState.done, checklistState.total)],
              content: (
                <ChecklistQASection
                  state={checklistState}
                  stage={checklistStage}
                  canEdit={canEditChecklist}
                  onToggle={handleToggleChecklist}
                  onMoveToInReview={handleMoveToInReview}
                  files={dropboxFiles}
                  scannedAt={dropboxScannedAt}
                  onRescan={handleRescanDropbox}
                />
              ),
            } : undefined}
            productionUnitId={task.productionUnitId}
            bodyText={bodyText}
            onBodyTextChange={(nextText) => {
              // Editor brief tidak memuat section Checklist QA → pertahankan di state lokal (server melakukan hal yang sama)
              setBodyText((prev) => mergeChecklistSection(nextText, extractChecklistSection(prev)));
              triggerAutoSave({ bodyText: nextText });
            }}
            comments={comments}
            commentsLoaded={loaded}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            sendingComment={sending}
            onEditorOpenChange={setBriefEditing}
          />
        </div>
      </aside>
    </div>
  );
}
