'use client';

import { useEffect, useState } from 'react';
import {
  X, Plus, FileText, CircleDot, Users, Gauge,
  CalendarDays, Link as LinkIcon, BookOpen, Building2,
  Languages, KeyRound, ExternalLink, Trash2, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createTaskAction, fetchTaskMetadataOptionsAction } from '@/app/actions/qa';
import CustomSelectCell from './CustomSelectCell';
import MonthCalendarPicker from './MonthCalendarPicker';
import DesignBriefPreview from './task-detail/DesignBriefPreview';
import CustomFieldsSection from './task-detail/CustomFieldsSection';
import { type CustomFieldDef, isEmptyFieldValue } from './custom-fields/FieldValueDisplay';
import DesignBriefEditorDrawer, { BRIEF_EDITOR_SHIFT_CLASS, mergePaletteMarkdown } from './task-detail/DesignBriefEditorDrawer';
import { mergeAssetsMarkdown } from '@/lib/asset-brief';
import { shufflePaletteMarkdown } from './task-detail/brief-parser';
import { PRIORITY_OPTIONS, LICENSE_OPTIONS, getPagesForDoctype } from './task-form-utils';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { parseTaskMonthToKey, currentTaskMonth } from '@/lib/period-utils';

interface Props {
  productionUnitId: string;
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface OptionItem {
  id: string;
  displayName: string;
  pages?: number | null;
  poolRate?: number | null;
}

export default function CreateTaskSlideModal({ productionUnitId, open, onClose, onCreated }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [name, setName] = useState('');
  const [designStatusId, setDesignStatusId] = useState('');
  const [designerId, setDesignerId] = useState('');
  const [doctypeId, setDoctypeId] = useState('');
  const [qtySubmit, setQtySubmit] = useState('1');
  const [pages, setPages] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [priority, setPriority] = useState('');
  const [license, setLicense] = useState('');
  const [taskMonth, setTaskMonth] = useState(currentTaskMonth());
  const [bodyText, setBodyText] = useState('');
  const [notionUrl, setNotionUrl] = useState('');
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [canvaLinks, setCanvaLinks] = useState<string[]>([]);
  const [newCanvaUrl, setNewCanvaUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [briefEditing, setBriefEditing] = useState(false);

  const [designers, setDesigners] = useState<OptionItem[]>([]);
  const [doctypes, setDoctypes] = useState<OptionItem[]>([]);
  const [designStatuses, setDesignStatuses] = useState<OptionItem[]>([]);
  const [accounts, setAccounts] = useState<OptionItem[]>([]);

  const [outputType, setOutputType] = useState<string>('canva_link');
  // Field tambahan production + field inti yang dimatikan
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [disabledFields, setDisabledFields] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const isOff = (key: string) => disabledFields.includes(key);

  useEffect(() => {
    if (!open) return;
    fetchTaskMetadataOptionsAction(productionUnitId).then((res) => {
      if (res.success && res.data) {
        setDesigners(res.data.designers || []);
        setDoctypes(res.data.doctypes || []);
        setDesignStatuses(res.data.designStatuses || []);
        setAccounts(res.data.accounts || []);
        setOutputType(res.data.outputType || 'canva_link');
        setCustomFieldDefs(res.data.fields || []);
        setDisabledFields(res.data.disabledFields || []);
      }
    });

    if (open) {
      setName('');
      setDesignStatusId('');
      setDesignerId('');
      setDoctypeId('');
      setQtySubmit('1');
      setPages('');
      setLanguages([]);
      setPriority('');
      setLicense('');
      setTaskMonth(currentTaskMonth());
      setBodyText('');
      setNotionUrl('');
      setAccountIds([]);
      setCanvaLinks([]);
      setNewCanvaUrl('');
      setSaving(false);
      setBriefEditing(false);
      setCustomValues({});
    }
  }, [open, productionUnitId]);

  const handleDoctypeChange = (newDoctypeId: string) => {
    setDoctypeId(newDoctypeId);
    const selectedDoc = doctypes.find((d) => d.id === newDoctypeId);
    if (selectedDoc) {
      const autoPages = getPagesForDoctype(selectedDoc);
      setPages(autoPages.toString());
      if (!qtySubmit || qtySubmit === '0') {
        setQtySubmit('1');
      }
    }
  };

  if (!open) return null;

  const handleAddCanvaLink = () => {
    const trimmed = newCanvaUrl.trim();
    if (!trimmed) return;
    if (canvaLinks.includes(trimmed)) {
      toast.error('Link already added');
      return;
    }
    setCanvaLinks([...canvaLinks, trimmed]);
    setNewCanvaUrl('');
  };

  const handleRemoveCanvaLink = (index: number) => {
    setCanvaLinks(canvaLinks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Task name is required');

    // Hanya kirim field tambahan yang terisi (checkbox false = default)
    const filledCustomFields = Object.fromEntries(
      Object.entries(customValues).filter(([, v]) => !isEmptyFieldValue(v) && v !== false)
    );

    setSaving(true);
    const res = await createTaskAction({
      productionUnitId,
      name,
      designerId: designerId || null,
      doctypeId: doctypeId || null,
      designStatusId: designStatusId || null,
      qtySubmit: qtySubmit ? Number(qtySubmit) : 1,
      pages: pages ? Number(pages) : null,
      languages,
      priority: priority || null,
      license: license || null,
      taskMonth: taskMonth || null,
      bodyText: bodyText.trim() || undefined,
      notionUrl: notionUrl.trim() || null,
      accountIds,
      canvaLinks: canvaLinks.length > 0 ? canvaLinks : undefined,
      customFields: Object.keys(filledCustomFields).length > 0 ? filledCustomFields : undefined,
    });
    setSaving(false);

    if (res.success) {
      toast.success('Task created successfully');
      if (taskMonth) {
        const monthKey = parseTaskMonthToKey(taskMonth);
        if (monthKey && searchParams) {
          const currentPeriods = searchParams.get('period')?.split(',').filter(Boolean) || [];
          if (currentPeriods.length > 0 && !currentPeriods.includes(monthKey)) {
            const updatedPeriods = [monthKey, ...currentPeriods].join(',');
            const params = new URLSearchParams(searchParams.toString());
            params.set('period', updatedPeriods);
            router.push(`${pathname}?${params.toString()}`);
          }
        }
      }
      onCreated?.();
      onClose();
    } else {
      toast.error(res.error || 'Failed to create task');
    }
  };

  return (
    <div className="fixed inset-0 z-70">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/40 cursor-pointer" aria-label="Close modal" />
      <div className={`absolute right-0 top-0 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out] transition-[right] duration-200 ease-out ${briefEditing ? BRIEF_EDITOR_SHIFT_CLASS : ''}`}>
        
        {/* Header Bar — Title Input + Close Button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50">
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
            <div className="w-8 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New Task Title..."
              className="w-full border-0 bg-transparent p-0 font-sans text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Form Body — Edge-to-Edge Continuous 2-Column Symmetrical Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-24 divide-y divide-[#f0f0f0] dark:divide-[#272a34] p-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#272a34]">
          <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">

            {/* Row 1: Design Status */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <CircleDot className="w-3.5 h-3.5 text-gray-400" />
                <span>Design Status</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <CustomSelectCell
                  value={designStatusId}
                  placeholder="Select Status"
                  options={designStatuses.map((s) => ({ id: s.id, label: s.displayName }))}
                  onChange={setDesignStatusId}
                />
              </div>
            </div>

            {/* Row 2: Designer */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>Designer</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <CustomSelectCell
                  value={designerId}
                  placeholder="Unassigned"
                  options={designers.map((d) => ({ id: d.id, label: d.displayName }))}
                  onChange={setDesignerId}
                />
              </div>
            </div>

            {/* Row 3: Doctype */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                <span>Doctype</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <CustomSelectCell
                  value={doctypeId}
                  placeholder="Select Doctype"
                  options={doctypes.map((d) => ({ id: d.id, label: d.displayName }))}
                  onChange={handleDoctypeChange}
                />
              </div>
            </div>

            {/* Row 4: QTY Submit */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span>QTY Submit</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <input
                  type="number"
                  min="0"
                  value={qtySubmit}
                  onChange={(e) => setQtySubmit(e.target.value)}
                  placeholder="1"
                  className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Row 5: Pages */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span>Pages</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <input
                  type="number"
                  min="0"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="12"
                  className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Row 6: IND/ENG Languages */}
            {!isOff('languages') && (
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Languages className="w-3.5 h-3.5 text-gray-400" />
                <span>IND/ENG</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                  {['IND', 'ENG'].map((lang) => {
                    const isSelected = languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          setLanguages((prev) =>
                            prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
                          );
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
              </div>
            </div>

            )}

            {/* Row 7: Priority */}
            {!isOff('priority') && (
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Gauge className="w-3.5 h-3.5 text-gray-400" />
                <span>Priority</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <CustomSelectCell
                  value={priority}
                  placeholder="Select Priority"
                  options={PRIORITY_OPTIONS.map((p) => ({ id: p.id, label: p.displayName }))}
                  onChange={setPriority}
                />
              </div>
            </div>

            )}

            {/* Row 8: License */}
            {!isOff('license') && (
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                <span>License</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <CustomSelectCell
                  value={license}
                  placeholder="Select License"
                  options={LICENSE_OPTIONS.map((l) => ({ id: l.id, label: l.displayName }))}
                  onChange={setLicense}
                />
              </div>
            </div>

            )}

            {/* Row 9: Task Month */}
            {!isOff('taskMonth') && (
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                <span>Task Month</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <MonthCalendarPicker
                  value={taskMonth}
                  placeholder="Select Month"
                  onChange={setTaskMonth}
                />
              </div>
            </div>

            )}

            {/* Row 10: Brand / Account */}
            {!isOff('brand') && (
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Brand</span>
              </div>
              <div className="flex-1 px-5 py-2.5 flex items-center min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="flex flex-wrap gap-2">
                  {accounts.map((acc) => {
                    const selected = accountIds.includes(acc.id);
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() =>
                          setAccountIds((prev) =>
                            prev.includes(acc.id) ? prev.filter((id) => id !== acc.id) : [...prev, acc.id]
                          )
                        }
                        className={`px-2.5 py-1 text-[11px] font-sans font-bold uppercase rounded border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/30'
                            : 'bg-gray-50 dark:bg-[#16181d] text-gray-500 dark:text-gray-400 border-[#f0f0f0] dark:border-[#272a34] hover:bg-gray-100 dark:hover:bg-[#20232b]'
                        }`}
                      >
                        {acc.displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            )}

          </div>

          {outputType === 'dropbox_link' ? (
            <div className="p-5 bg-white dark:bg-[#0d0e12] font-sans text-xs text-gray-600 dark:text-gray-300">
              <span className="font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Output Dropbox</span>
              <p className="mt-2">Upload Request Dropbox dibuat otomatis per task setelah Fase 6. Link Canva tidak dipakai untuk platform ini.</p>
            </div>
          ) : isOff('canvaLink') ? null : (
          /* Canva Template Link Section */
          <div className="p-5 space-y-3 bg-white dark:bg-[#0d0e12]">
            <div className="flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Canva Template Link</span>
            </div>

            {canvaLinks.length > 0 && (
              <div className="space-y-2">
                {canvaLinks.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 p-3 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 text-xs font-sans"
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#ff5e1f] hover:underline truncate flex items-center gap-1.5 min-w-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Template-{index + 1}: {url}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveCanvaLink(index)}
                      className="text-gray-400 hover:text-rose-500 transition-colors p-1"
                      title="Remove Link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="url"
                value={newCanvaUrl}
                onChange={(e) => setNewCanvaUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCanvaLink();
                  }
                }}
                placeholder="https://canva.com/design/..."
                className="flex-1 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3.5 py-2 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff5e1f] transition-colors"
              />
              <button
                type="button"
                onClick={handleAddCanvaLink}
                className="px-4 py-2 bg-[#ff5e1f] hover:bg-[#ff7038] text-white font-sans text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>
          </div>

          )}

          {/* Field tambahan per production (Notion) — dikirim saat Save Task */}
          <CustomFieldsSection
            fields={customFieldDefs}
            values={customValues}
            onChange={(name, value) => setCustomValues((prev) => ({ ...prev, [name]: value }))}
          />

          {/* Design Brief — preview di sini, edit di drawer bersusun sebelah kanan */}
          <div className="flex flex-col gap-4 bg-[#f8f9fb] dark:bg-[#16181d]/60 px-5 pt-5 pb-8 border-t border-[#f0f0f0] dark:border-[#272a34]">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Design Brief</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Wireframe, referensi &amp; palet untuk designer</p>
              </div>
              <button
                type="button"
                onClick={() => setBriefEditing((v) => !v)}
                className={`flex items-center gap-1.5 h-8 px-3 border text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  briefEditing
                    ? 'bg-[#ff5e1f] border-[#ff5e1f] text-white hover:bg-[#ff7038]'
                    : 'bg-white dark:bg-[#0d0e12] border-[#f0f0f0] dark:border-[#272a34] text-gray-700 dark:text-gray-300 hover:border-[#ff5e1f]'
                }`}
              >
                <Edit3 className={`w-3.5 h-3.5 ${briefEditing ? '' : 'text-[#ff5e1f]'}`} />
                <span>{briefEditing ? 'Editing' : 'Edit'}</span>
              </button>
            </div>
            <DesignBriefPreview
              bodyText={bodyText}
              onShufflePalette={() => setBodyText((prev) => shufflePaletteMarkdown(prev) ?? prev)}
            />
          </div>

        </div>

        {/* Action Footer — 2-Column Symmetrical Row */}
        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-12 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] font-sans text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="h-12 bg-[#ff5e1f] hover:bg-[#ff7038] disabled:opacity-50 disabled:cursor-not-allowed font-sans text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Save Task</span>
          </button>
        </div>

      </div>

      {briefEditing && (
        <DesignBriefEditorDrawer
          value={bodyText}
          onChange={setBodyText}
          onInsertPalette={(paletteMarkdown) => setBodyText((prev) => mergePaletteMarkdown(prev, paletteMarkdown))}
          onInsertAssets={(sectionMarkdown) => setBodyText((prev) => mergeAssetsMarkdown(prev, sectionMarkdown))}
          productionUnitId={productionUnitId}
          onClose={() => setBriefEditing(false)}
          subtitle="Tersimpan saat Save Task · preview di kiri"
          zClassName="z-80"
        />
      )}
    </div>
  );
}
