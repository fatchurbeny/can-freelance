'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sliders,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Save,
  FileText,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getSyncSubjectTriggersAction,
  saveSyncSubjectTriggersAction
} from '@/app/actions/email-notification';

export interface SubjectTriggerItem {
  id?: string;
  subject: string;
  isActive: boolean;
  description?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const PRESET_SUBJECTS = [
  {
    subject: "We've found some issues with your template",
    label: 'Isu Template (Bermasalah)',
  },
  {
    subject: 'Your template has not been added to Canva',
    label: 'Template Ditolak (Not Added)',
  },
  {
    subject: 'Your template has been added to the Canva library!',
    label: 'Template Disetujui (Library)',
  },
  {
    subject: 'issues with your template',
    label: 'Keyword: issues with your template',
  },
];

const normalizeSubject = (str: string) =>
  str.toLowerCase().replace(/[\u2018\u2019]/g, "'").trim();

export default function SyncSubjectSettingsSlideModal({
  open,
  onClose,
  onSaved,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [triggers, setTriggers] = useState<SubjectTriggerItem[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      loadTriggers();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const loadTriggers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getSyncSubjectTriggersAction();
      if (res.success && res.triggers) {
        setTriggers(res.triggers);
      } else if (!res.success) {
        setError(res.error || 'Gagal memuat daftar subject trigger');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar subject trigger');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = (subjectText?: string) => {
    const textToAdd = (subjectText || newSubject).trim();
    if (!textToAdd) return;

    if (triggers.some((t) => normalizeSubject(t.subject) === normalizeSubject(textToAdd))) {
      toast.error('Subject trigger sudah ada di daftar');
      return;
    }

    setTriggers((prev) => [
      ...prev,
      {
        subject: textToAdd,
        isActive: true,
        description: null,
      },
    ]);
    if (!subjectText) {
      setNewSubject('');
    }
  };

  const handleToggleActive = (index: number) => {
    setTriggers((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, isActive: !t.isActive } : t))
    );
  };

  const handleSubjectChange = (index: number, val: string) => {
    setTriggers((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, subject: val } : t))
    );
  };

  const handleDelete = (index: number) => {
    setTriggers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    const validItems = triggers.filter((t) => t.subject && t.subject.trim());
    if (validItems.length === 0) {
      setError('Minimal harus ada 1 subject trigger.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const res = await saveSyncSubjectTriggersAction(validItems);
      if (!res.success) {
        throw new Error(res.error || 'Gagal menyimpan subject trigger');
      }

      toast.success('Subject trigger sinkronisasi berhasil disimpan!');
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat menyimpan data');
      toast.error(err?.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !mounted) return null;

  const activeCount = triggers.filter((t) => t.isActive).length;

  return createPortal(
    <div className="fixed inset-0 z-70 flex justify-end font-sans">
      {/* 1. Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity cursor-pointer animate-[fadeIn_150ms_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Slide-over Panel Container */}
      <div className="relative z-10 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-sans text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">
                Sync Subject Triggers
              </h2>
              <p className="text-[10px] font-sans text-gray-500 dark:text-gray-400 truncate">
                Pattern subjek email Canva pemicu sinkronisasi ({loading ? 'Memuat...' : `${activeCount} Aktif`})
              </p>
            </div>
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
        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#f0f0f0] dark:divide-[#272a34] p-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#272a34]">
          <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">

            {/* Row 1: Input Tambah Subject Baru */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Tambah Baru</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubject();
                    }
                  }}
                  placeholder="Ketik pattern subjek email baru..."
                  className="flex-1 h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-4 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubject()}
                  disabled={!newSubject.trim()}
                  className="h-full min-h-[44px] px-4 bg-[#ff5e1f] hover:bg-[#ff7038] text-white font-sans text-xs font-bold uppercase transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
                >
                  + ADD
                </button>
              </div>
            </div>

            {/* Row 2: Preset Pilihan Cepat */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Preset Canva</span>
              </div>
              <div className="flex-1 p-2.5 flex flex-wrap items-center gap-1.5 min-h-[44px] bg-white dark:bg-[#0d0e12]">
                {PRESET_SUBJECTS.map((preset) => {
                  const isAlreadyAdded = triggers.some(
                    (t) => normalizeSubject(t.subject) === normalizeSubject(preset.subject)
                  );
                  return (
                    <button
                      key={preset.subject}
                      type="button"
                      disabled={isAlreadyAdded}
                      onClick={() => handleAddSubject(preset.subject)}
                      className={`px-2.5 py-1 text-[11px] font-sans font-semibold border transition-all cursor-pointer ${
                        isAlreadyAdded
                          ? 'border-gray-200 dark:border-[#272a34] bg-gray-100 dark:bg-[#16181d] text-gray-400 dark:text-gray-500 opacity-60 cursor-default'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Divider / Label Header */}
            <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-[#16181d]/50 flex items-center justify-between border-y border-[#f0f0f0] dark:border-[#272a34]">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Daftar Pattern Subject Trigger ({loading ? '...' : triggers.length})
              </span>
              <span className="text-[10px] font-sans text-gray-400">
                Pencarian mencocokkan subjek email yang mengandung teks ini
              </span>
            </div>

            {/* Trigger List Rows */}
            {loading ? (
              <div className="p-8 text-center text-xs font-sans text-gray-400">
                Memuat daftar trigger...
              </div>
            ) : triggers.length === 0 ? (
              <div className="p-8 text-center text-xs font-sans text-gray-400">
                Belum ada trigger terdaftar. Tambahkan subjek baru di atas.
              </div>
            ) : (
              triggers.map((item, index) => {
                return (
                  <div
                    key={item.id || index}
                    className="flex items-stretch text-xs font-sans min-h-[44px] hover:bg-gray-50/30 dark:hover:bg-[#16181d]/30 transition-colors"
                  >
                    {/* Status Toggle Button (Left Cell) */}
                    <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] p-0 flex items-stretch">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(index)}
                        className={`w-full h-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-sans font-bold transition-colors cursor-pointer ${
                          item.isActive
                            ? 'bg-[#00a67d] text-white'
                            : 'bg-[#6e7687] text-white hover:bg-gray-600'
                        }`}
                        title={item.isActive ? 'Status: Aktif (Klik untuk nonaktifkan)' : 'Status: Nonaktif (Klik untuk aktifkan)'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.isActive ? 'ACTIVE' : 'DISABLED'}</span>
                      </button>
                    </div>

                    {/* Subject Text Input (Middle Cell) */}
                    <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                      <input
                        type="text"
                        value={item.subject}
                        onChange={(e) => handleSubjectChange(index, e.target.value)}
                        className="w-full h-full min-h-[44px] rounded-none border-0 bg-transparent px-4 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-gray-50 dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                      />
                    </div>

                    {/* Delete Action (Far-Right Cell) */}
                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      className="w-12 shrink-0 border-l border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Hapus subject trigger ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}

            {error ? (
              <div className="p-4 bg-rose-500/10 border-t border-rose-500/20 text-xs font-sans font-bold text-rose-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

          </div>
        </div>

        {/* Footer Action Table Row (Symmetrical 2-Column Footer) */}
        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-t border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-full py-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] font-sans text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 cursor-pointer text-center"
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="w-full py-4 bg-[#ff5e1f] hover:bg-[#ff7038] font-sans text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'SAVING…' : 'SAVE TRIGGERS'}</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
