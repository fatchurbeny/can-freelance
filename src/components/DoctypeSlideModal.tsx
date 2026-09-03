'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Layers,
  FileText,
  Code,
  FolderGit2,
  Maximize2,
  Ratio,
  Sparkles,
  Percent,
  Copy,
  DollarSign,
  Calculator,
  AlignLeft,
  CheckCircle2,
  Save
} from 'lucide-react';
import { createDoctypeAction, updateDoctypeRateCardAction } from '@/app/actions/rate-card';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import CategorySelectCell from './CategorySelectCell';

export interface DoctypeItem {
  id: string;
  notionKey: string;
  displayName: string;
  poolRate: number;
  pages: number | null;
  category?: string | null;
  dimensions?: string | null;
  aspectRatio?: string | null;
  notes?: string | null;
  isActive?: boolean;
  updatedAt: Date | string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  doctypeToEdit?: DoctypeItem | null;
  contractRate?: number;
}

const ASPECT_RATIOS = ['16:9', '1:1', '4:5', '9:16'];

function detectAspectRatio(dimStr: string): string | null {
  if (!dimStr) return null;
  const match = dimStr.match(/(\d+)\s*[\timesxX\*\:\/]\s*(\d+)/);
  if (!match) return null;
  const w = parseFloat(match[1]);
  const h = parseFloat(match[2]);
  if (!w || !h || h === 0) return null;
  const ratio = w / h;

  const candidates = [
    { name: '16:9', val: 16 / 9 },
    { name: '1:1', val: 1 / 1 },
    { name: '4:5', val: 4 / 5 },
    { name: '9:16', val: 9 / 16 },
  ];

  let bestMatch: string | null = null;
  let minDiff = 0.08;

  for (const c of candidates) {
    const diff = Math.abs(ratio - c.val);
    if (diff < minDiff) {
      minDiff = diff;
      bestMatch = c.name;
    }
  }
  return bestMatch;
}

export default function DoctypeSlideModal({
  open,
  onClose,
  doctypeToEdit,
  contractRate = 15000,
}: Props) {
  const isEditing = Boolean(doctypeToEdit);
  const router = useRouter();

  const [name, setName] = useState('');
  const [notionKey, setNotionKey] = useState('');
  const [category, setCategory] = useState('Infografis');
  const [dimensions, setDimensions] = useState('1920×1080 px');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [poolRate, setPoolRate] = useState('1.5');
  const [pages, setPages] = useState('1');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (doctypeToEdit) {
      setName(doctypeToEdit.displayName || '');
      setNotionKey(doctypeToEdit.notionKey || '');
      setCategory(doctypeToEdit.category || 'Infografis');
      setDimensions(doctypeToEdit.dimensions || '1920×1080 px');
      setAspectRatio(doctypeToEdit.aspectRatio || '16:9');
      setPoolRate(String(doctypeToEdit.poolRate ?? 1.5));
      setPages(String(doctypeToEdit.pages ?? 1));
      setNotes(doctypeToEdit.notes || '');
      setIsActive(doctypeToEdit.isActive ?? true);
    } else {
      setName('');
      setNotionKey('');
      setCategory('Infografis');
      setDimensions('1920×1080 px');
      setAspectRatio('16:9');
      setPoolRate('1.5');
      setPages('1');
      setNotes('');
      setIsActive(true);
    }
    setError('');
  }, [doctypeToEdit, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && (!notionKey || notionKey === name.toUpperCase().replace(/\s+/g, '_'))) {
      setNotionKey(val.toUpperCase().replace(/\s+/g, '_'));
    }
  };

  const handleDimensionsChange = (val: string) => {
    setDimensions(val);
    const autoRatio = detectAspectRatio(val);
    if (autoRatio) {
      setAspectRatio(autoRatio);
    }
  };

  const numericPoolRate = Number(poolRate) || 0;
  const numericPages = Number(pages) || 0;
  const totalPayout = numericPoolRate * numericPages * contractRate;

  const handleSave = async () => {
    const nextName = name.trim();
    const nextNotionKey = notionKey.trim() || nextName.toUpperCase().replace(/\s+/g, '_');

    if (!nextName) {
      setError('Nama format doctype wajib diisi.');
      toast.error('Nama format doctype wajib diisi.');
      return;
    }

    if (numericPoolRate < 0 || numericPages < 1) {
      setError('Pool Score dan QTY Halaman tidak valid.');
      toast.error('Pool Score dan QTY Halaman tidak valid.');
      return;
    }

    setError('');
    setIsSaving(true);

    if (isEditing && doctypeToEdit) {
      const res = await updateDoctypeRateCardAction(doctypeToEdit.id, {
        name: nextName,
        notionKey: nextNotionKey,
        category,
        dimensions,
        aspectRatio,
        poolRate: numericPoolRate,
        pages: numericPages,
        notes,
        isActive,
      });
      setIsSaving(false);

      if (!res.success) {
        setError(res.error || 'Gagal memperbarui doctype.');
        toast.error(res.error || 'Gagal memperbarui doctype.');
        return;
      }

      toast.success(`Doctype "${nextName}" berhasil diperbarui!`);
    } else {
      const res = await createDoctypeAction({
        name: nextName,
        notionKey: nextNotionKey,
        category,
        dimensions,
        aspectRatio,
        poolRate: numericPoolRate,
        pages: numericPages,
        notes,
        isActive,
      });
      setIsSaving(false);

      if (!res.success) {
        setError(res.error || 'Gagal membuat doctype.');
        toast.error(res.error || 'Gagal membuat doctype.');
        return;
      }

      toast.success(`Doctype "${nextName}" berhasil ditambahkan!`);
    }

    onClose();
    router.refresh();
  };

  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-70">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 cursor-pointer"
        aria-label="Close modal"
      />

      {/* Slide-over Container (Cloudflare Symmetrical Table Style) */}
      <div className="absolute right-0 top-0 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
            <div className="w-8 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-sans text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">
                {isEditing ? 'Edit Doctype & Rate Card' : 'Add Doctype & Rate Card'}
              </h2>
              <p className="text-[10px] font-sans text-gray-500 dark:text-gray-400 truncate">
                Konfigurasi format template, bobot Pool Score, dan tarif freelance per halaman
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

            {/* Row 1: Nama Format Doctype */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap">
                <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Nama Format</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="ex: Instagram Carousel"
                  className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                />
              </div>
            </div>

            {/* Row 2: Kode Format / Identifier */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap">
                <Code className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Kode Identifier</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <input
                  type="text"
                  value={notionKey}
                  onChange={(e) => setNotionKey(e.target.value)}
                  placeholder="ex: INSTAGRAM_CAROUSEL"
                  className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-[#ff5e1f] outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                />
              </div>
            </div>

            {/* Row 3: Kategori Cloudflare Dropdown Cell */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap">
                <FolderGit2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Kategori</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <CategorySelectCell
                  value={category}
                  onChange={setCategory}
                  placeholder="Pilih Kategori..."
                />
              </div>
            </div>

            {/* Row 4: Dimensi Canvas */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap">
                <Maximize2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Dimensi Canvas</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <input
                  type="text"
                  value={dimensions}
                  onChange={(e) => handleDimensionsChange(e.target.value)}
                  placeholder="1920×1080 px"
                  className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                />
              </div>
            </div>

            {/* Row 5: Aspek Rasio Segmented Buttons */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Ratio className="w-3.5 h-3.5 text-gray-400" />
                <span>Aspek Rasio</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="grid grid-cols-4 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                  {ASPECT_RATIOS.map((ar) => {
                    const isSelected = aspectRatio === ar;
                    return (
                      <button
                        key={ar}
                        type="button"
                        onClick={() => setAspectRatio(ar)}
                        className={`h-full min-h-[44px] px-2 font-sans text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#ff5e1f] text-white font-bold'
                            : 'bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {ar}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 6: Section Divider — SKEMA TARIF KONTRAK FREELANCE */}
            <div className="px-5 py-3 bg-[#ff5e1f]/5 dark:bg-[#ff5e1f]/10 border-y border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between text-xs font-sans">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[#ff5e1f]">
                <Sparkles className="w-4 h-4 text-[#ff5e1f]" />
                <span>SKEMA TARIF KONTRAK FREELANCE</span>
              </div>
              <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500">
                (PoolRate × Pages × Rate/Page)
              </span>
            </div>

            {/* Row 7: Pool Rate (Bobot) Segmented Options */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Percent className="w-3.5 h-3.5 text-gray-400" />
                <span>Pool Score (Bobot)</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="grid grid-cols-3 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                  <button
                    type="button"
                    onClick={() => setPoolRate('1.5')}
                    className={`h-full min-h-[44px] px-3 font-sans text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      poolRate === '1.5'
                        ? 'bg-[#ff5e1f] text-white font-bold'
                        : 'bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>1.5x (Infografis/Deck)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoolRate('1.0')}
                    className={`h-full min-h-[44px] px-3 font-sans text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      poolRate === '1.0' || poolRate === '1'
                        ? 'bg-[#615fff] text-white font-bold'
                        : 'bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>1.0x (Lainnya)</span>
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={poolRate}
                    onChange={(e) => setPoolRate(e.target.value)}
                    placeholder="Custom"
                    className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-3 text-center font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f]"
                  />
                </div>
              </div>
            </div>

            {/* Row 8: Default QTY Halaman / Slides */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Copy className="w-3.5 h-3.5 text-gray-400" />
                <span>Default Slides</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                />
              </div>
            </div>

            {/* Row 9: Rate / Pages (Rp) */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                <span>Rate / Pages</span>
              </div>
              <div className="flex-1 px-5 py-3 flex items-center bg-gray-50/50 dark:bg-[#16181d]/50 font-sans text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>Rp {contractRate.toLocaleString('id-ID')} (Standar Kontrak)</span>
              </div>
            </div>

            {/* Row 10: Live Calculation Summary Cell */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Calculator className="w-3.5 h-3.5 text-gray-400" />
                <span>Kalkulasi Payout</span>
              </div>
              <div className="flex-1 px-5 py-3 flex items-center justify-between bg-white dark:bg-[#0d0e12]">
                <span className="text-gray-500 dark:text-gray-400">
                  {numericPoolRate}x × {numericPages} hal × Rp {contractRate.toLocaleString('id-ID')}
                </span>
                <span className="font-sans text-xs font-bold text-[#ff5e1f]">
                  Total: Rp {totalPayout.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Row 11: Catatan Produksi & Panduan Template */}
            <div className="flex items-stretch text-xs font-sans min-h-[80px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-3 flex items-start gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <AlignLeft className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                <span>Catatan Produksi</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[80px] bg-white dark:bg-[#0d0e12]">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan layout, pedoman text anchor, atau spesifikasi Canva..."
                  className="w-full h-full min-h-[80px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 p-4 font-sans text-xs font-normal text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors resize-y"
                />
              </div>
            </div>

            {/* Row 12: Status Format Selection Grid (Image 2 Color Standard: Active Green / Inactive Gray) */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Status Format</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`h-full min-h-[44px] px-3 font-sans text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-[#00a67d] text-white font-bold'
                        : 'bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>ACTIVE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`h-full min-h-[44px] px-3 font-sans text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      !isActive
                        ? 'bg-[#6e7687] text-white font-bold'
                        : 'bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>INACTIVE</span>
                  </button>
                </div>
              </div>
            </div>

            {error ? (
              <div className="p-4 bg-rose-500/10 border-t border-rose-500/20 text-xs font-sans font-bold text-rose-500">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer Action Table Row (Symmetrical 2-Column Footer) */}
        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-t border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full py-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] font-sans text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 cursor-pointer text-center"
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="w-full py-4 bg-[#ff5e1f] hover:bg-[#ff7038] font-sans text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            {isEditing ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'SAVING…' : isEditing ? 'SAVE DOCTYPE' : 'CREATE DOCTYPE'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
