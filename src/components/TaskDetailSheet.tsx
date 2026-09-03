'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, ExternalLink, Send, Clock, Trash2, FileText, MessageSquare, CheckCircle,
  AlarmClock, CalendarDays, Gauge, Users, BookOpen, Building2, Languages, KeyRound,
  CircleDot, Edit2, Save, Plus, Link as LinkIcon, Loader2, ChevronDown, Check
} from 'lucide-react';
import {
  updateTaskStatusAction, addCommentAction, getTaskCommentsAction,
  deleteCommentAction, updateTaskFieldsAction, fetchTaskMetadataOptionsAction,
  TaskUpdatePayload
} from '@/app/actions/qa';
import { validateTemplateLink } from '@/lib/validate-template-link';
import type { CardAction } from './QACard';
import toast from 'react-hot-toast';

import CustomSelectCell from './CustomSelectCell';
import MonthCalendarPicker from './MonthCalendarPicker';
import TaskBodyEditor from './TaskBodyEditor';
import { PRIORITY_OPTIONS, LICENSE_OPTIONS, getPagesForDoctype } from './task-form-utils';

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
  bodyText?: string | null;
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

interface OptionItem {
  id: string;
  displayName: string;
  avatarColor?: string | null;
  color?: string | null;
  notionKey?: string;
  pages?: number | null;
  poolRate?: number | null;
}



export default function TaskDetailSheet({ task, actions = [], onClose, onMoved }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [content, setContent] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [isEditingAll, setIsEditingAll] = useState(false);
  const [activeEditingField, setActiveEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

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
    setSelectedAccountIds(task.taskAccounts?.map(ta => ta.account.id) || []);
    setCanvaUrls(task.canvaLinks?.map(cl => cl.url) || []);
    setNewCanvaUrl('');
    setCanvaLinkError('');

    getTaskCommentsAction(task.id).then(setComments).finally(() => setLoaded(true));
    
    fetchTaskMetadataOptionsAction().then((res) => {
      if (res.success && res.data) {
        setDesigners(res.data.designers || []);
        setDoctypes(res.data.doctypes || []);
        setDesignStatuses(res.data.designStatuses || []);
        setAccounts(res.data.accounts || []);
      }
      setOptionsLoaded(true);
    });

    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, onClose]);

  if (!task) return null;

  const saveFieldChanges = async (fieldPayload: TaskUpdatePayload, fieldName: string) => {
    setSavingField(fieldName);
    const res = await updateTaskFieldsAction(task.id, fieldPayload);
    setSavingField(null);
    if (res.success) {
      toast.success(`${fieldName} updated successfully!`);
      setActiveEditingField(null);
    } else {
      toast.error(res.error || `Failed to update ${fieldName}`);
    }
  };

  const saveAllChanges = async () => {
    setSavingField('all');
    const payload: TaskUpdatePayload = {
      name: taskName,
      designerId: designerId || null,
      doctypeId: doctypeId || null,
      designStatusId: designStatusId || null,
      qtySubmit: qtySubmit !== '' ? Number(qtySubmit) : null,
      pages: pages !== '' ? Number(pages) : null,
      languages,
      priority: priority || null,
      license: license || null,
      taskMonth: taskMonth || null,
      accountIds: selectedAccountIds,
      canvaLinks: canvaUrls.filter(u => u.trim().length > 0),
    };

    const res = await updateTaskFieldsAction(task.id, payload);
    setSavingField(null);
    if (res.success) {
      toast.success('All task properties updated!');
      setIsEditingAll(false);
      setActiveEditingField(null);
    } else {
      toast.error(res.error || 'Failed to save task properties');
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

  const handleSubmitComment = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSending(true);
    const result = await addCommentAction(task.id, trimmed);
    if (result.success) {
      setContent('');
      const updated = await getTaskCommentsAction(task.id);
      setComments(updated);
    } else {
      toast.error(result.error || 'Failed to add comment');
    }
    setSending(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const result = await deleteCommentAction(commentId);
    if (!result.success) {
      toast.error(result.error || 'Failed to delete comment');
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

  const activeDesigner = designers.find(d => d.id === designerId) || task.designer;
  const activeDoctype = doctypes.find(d => d.id === doctypeId) || task.doctype;
  const activeStatus = designStatuses.find(s => s.id === designStatusId) || task.designStatus;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Task details: ${taskName || 'Untitled Task'}`}
        className="absolute inset-y-0 right-0 flex w-full max-w-[540px] flex-col h-full max-h-screen border-l border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-2xl overflow-hidden font-sans"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] dark:border-[#272a34] p-4 sm:p-5 bg-gray-50/50 dark:bg-[#16181d]/50 gap-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <FileText className="w-4 h-4 text-[#ff5e1f] shrink-0" />
            {isEditingAll || activeEditingField === 'name' ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Task Name"
                  className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] px-3 py-1.5 font-sans text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff5e1f]"
                />
                {!isEditingAll && (
                  <button
                    onClick={() => saveFieldChanges({ name: taskName }, 'Task Name')}
                    disabled={savingField === 'Task Name'}
                    className="p-1.5 bg-[#ff5e1f] text-white hover:bg-[#ff7038] transition-colors cursor-pointer"
                    title="Save Title"
                  >
                    {savingField === 'Task Name' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ) : (
              <h2
                onClick={() => setActiveEditingField('name')}
                className="truncate text-sm font-sans font-bold text-gray-900 dark:text-white hover:text-[#ff5e1f] transition-colors cursor-pointer flex items-center gap-1.5 group"
                title="Click to edit title"
              >
                <span>{taskName || 'Untitled Task'}</span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {task.notionUrl && (
              <a
                href={task.notionUrl}
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

        <div className="px-5 py-3 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 flex items-center justify-between text-xs font-sans shrink-0">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-bold">
            <AlarmClock className="w-3.5 h-3.5 text-gray-400" />
            <span>Last Edited: <strong className="text-gray-700 dark:text-gray-300">{lastEditedLabel}</strong></span>
          </div>
        </div>

        {/* Main Content Area — Full Edge-to-Edge Continuous Container with Smooth Vertical Scrolling */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-24 divide-y divide-[#f0f0f0] dark:divide-[#272a34] p-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#272a34]">
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
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {isEditingAll || activeEditingField === 'designStatus' ? (
                  <CustomSelectCell
                    value={designStatusId}
                    placeholder="Select Status"
                    options={designStatuses.map((s) => ({ id: s.id, label: s.displayName }))}
                    onChange={(nextId) => {
                      setDesignStatusId(nextId);
                      if (!isEditingAll) saveFieldChanges({ designStatusId: nextId }, 'Design Status');
                    }}
                  />
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
                {isEditingAll || activeEditingField === 'designer' ? (
                  <CustomSelectCell
                    value={designerId}
                    placeholder="Select Designer"
                    options={designers.map((d) => ({ id: d.id, label: d.displayName }))}
                    onChange={(nextId) => {
                      setDesignerId(nextId);
                      if (!isEditingAll) saveFieldChanges({ designerId: nextId }, 'Designer');
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
                {isEditingAll || activeEditingField === 'doctype' ? (
                  <CustomSelectCell
                    value={doctypeId}
                    placeholder="Select Doctype"
                    options={doctypes.map((dt) => ({ id: dt.id, label: dt.displayName }))}
                    onChange={(nextId) => {
                      setDoctypeId(nextId);
                      const selectedDoc = doctypes.find((d) => d.id === nextId);
                      const autoPages = getPagesForDoctype(selectedDoc);
                      setPages(autoPages);
                      const payloadToSave: any = { doctypeId: nextId, pages: autoPages };
                      if (!isEditingAll) saveFieldChanges(payloadToSave, 'Doctype');
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
                {isEditingAll || activeEditingField === 'qtySubmit' ? (
                  <div className="flex items-stretch w-full h-full min-h-[44px]">
                    <input
                      type="number"
                      min="0"
                      value={qtySubmit}
                      onChange={(e) => setQtySubmit(e.target.value)}
                      className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {!isEditingAll && (
                      <button
                        onClick={() => saveFieldChanges({ qtySubmit: Number(qtySubmit) }, 'QTY Submit')}
                        className="h-full min-h-[44px] px-5 bg-[#ff5e1f] text-white hover:bg-[#ff7038] transition-colors cursor-pointer flex items-center justify-center border-l border-[#f0f0f0] dark:border-[#272a34]"
                        title="Save QTY Submit"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                {isEditingAll || activeEditingField === 'pages' ? (
                  <div className="flex items-stretch w-full h-full min-h-[44px]">
                    <input
                      type="number"
                      min="0"
                      value={pages}
                      onChange={(e) => setPages(e.target.value)}
                      className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {!isEditingAll && (
                      <button
                        onClick={() => saveFieldChanges({ pages: Number(pages) }, 'Pages')}
                        className="h-full min-h-[44px] px-5 bg-[#ff5e1f] text-white hover:bg-[#ff7038] transition-colors cursor-pointer flex items-center justify-center border-l border-[#f0f0f0] dark:border-[#272a34]"
                        title="Save Pages"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    )}
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
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Languages className="w-3.5 h-3.5 text-gray-400" />
                <span>IND/ENG</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {isEditingAll || activeEditingField === 'languages' ? (
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
                            if (!isEditingAll) saveFieldChanges({ languages: next }, 'Languages');
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

            {/* Priority Row */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Gauge className="w-3.5 h-3.5 text-gray-400" />
                <span>Priority</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {isEditingAll || activeEditingField === 'priority' ? (
                  <CustomSelectCell
                    value={priority}
                    placeholder="Select Priority"
                    options={PRIORITY_OPTIONS}
                    onChange={(nextP) => {
                      setPriority(nextP);
                      if (!isEditingAll) saveFieldChanges({ priority: nextP }, 'Priority');
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

            {/* License Row */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                <span>License</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {isEditingAll || activeEditingField === 'license' ? (
                  <CustomSelectCell
                    value={license}
                    placeholder="Select License"
                    options={LICENSE_OPTIONS}
                    onChange={(nextL) => {
                      setLicense(nextL);
                      if (!isEditingAll) saveFieldChanges({ license: nextL }, 'License');
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

            {/* Task Month Row */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                <span>Task Month</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {isEditingAll || activeEditingField === 'taskMonth' ? (
                  <MonthCalendarPicker
                    value={taskMonth}
                    placeholder="Select Month"
                    onChange={(nextM) => {
                      setTaskMonth(nextM);
                      if (!isEditingAll) saveFieldChanges({ taskMonth: nextM }, 'Task Month');
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

            {/* Brand (Accounts) Row */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Brand</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {isEditingAll || activeEditingField === 'brand' ? (
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
                            if (!isEditingAll) saveFieldChanges({ accountIds: next }, 'Brand');
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
                      {task.taskAccounts.length > 0
                        ? task.taskAccounts.map((ta) => ta.account.displayName).join(' / ')
                        : 'Unassigned'}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400 shrink-0" />
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Canva Template Link Continuous Section */}
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
                      className="flex-1 truncate inline-flex items-center gap-2 text-xs font-sans font-bold text-[#ff5e1f] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Template-{idx + 1}: {url}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const next = canvaUrls.filter((_, i) => i !== idx);
                        setCanvaUrls(next);
                        saveFieldChanges({ canvaLinks: next }, 'Canva Links');
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
                      saveFieldChanges({ canvaLinks: next }, 'Canva Links');
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

          {/* Task Body Content / Wireframe Editor Section */}
          <div className="bg-white dark:bg-[#0d0e12] border-t border-[#f0f0f0] dark:border-[#272a34] p-5">
            <TaskBodyEditor
              value={bodyText}
              onChange={(nextText) => {
                setBodyText(nextText);
                saveFieldChanges({ bodyText: nextText }, 'Content Wireframe & References');
              }}
            />
          </div>

          {/* Comments Continuous Section */}
          <div className="flex flex-col bg-white dark:bg-[#0d0e12]">
            <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-[#16181d]/50 border-b border-[#f0f0f0] dark:border-[#272a34]">
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                COMMENTS {commentCount > 0 && `(${commentCount})`}
              </h3>
            </div>
            <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
              {!loaded ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[#ff5e1f]" />
                </div>
              ) : comments.length === 0 ? (
                <p className="px-5 py-4 text-center text-xs font-sans text-gray-400 dark:text-gray-500">
                  No comments yet
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="group relative px-5 py-3.5 bg-white dark:bg-[#0d0e12] hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="absolute right-4 top-3.5 p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all cursor-pointer"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-xs font-sans text-gray-800 dark:text-gray-200 pr-6 whitespace-pre-wrap">{c.content}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-sans text-gray-400">
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

        {/* Comment Input Symmetrical 2-Column Footer */}
        <div className="grid grid-cols-[1fr_auto] border-t border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] items-stretch h-14 shrink-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitComment();
            }}
            placeholder="Type your comment... (Cmd/Ctrl + Enter to send)"
            rows={1}
            className="w-full h-full border-0 bg-transparent px-5 py-3.5 font-sans text-xs text-gray-900 dark:text-white placeholder:text-gray-400 outline-none resize-none focus:ring-0"
          />
          <button
            onClick={handleSubmitComment}
            disabled={sending || !content.trim()}
            className="h-full px-6 bg-[#ff5e1f] hover:bg-[#ff7038] font-sans text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 border-l border-[#f0f0f0] dark:border-[#272a34]"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>SEND</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
