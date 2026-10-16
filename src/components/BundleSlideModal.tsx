'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Package, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { saveBundleAction, deleteBundleAction } from '@/app/actions/bundle';
import PlatformSelectCell from './PlatformSelectCell';
import DatePickerCell from './DatePickerCell';

export interface BundleItemView {
  productionUnitId: string;
  doctypeId: string;
  pages: number;
  productionUnit?: { name: string; platform?: { name: string } };
  doctype?: { displayName: string };
}

export interface BundleView {
  id: string;
  name: string;
  price: number | string;
  effectiveFrom?: string | null;
  notes?: string | null;
  isActive: boolean;
  updatedAt: string | Date;
  items: BundleItemView[];
}

export interface BundleUnitOption { id: string; name: string; platformId: string }
export interface BundleDoctypeOption { id: string; displayName: string; platformId: string; pages?: number | null }

interface Props {
  open: boolean;
  onClose: () => void;
  bundle?: BundleView | null;
  units: BundleUnitOption[];
  doctypes: BundleDoctypeOption[];
}

interface Row { productionUnitId: string; doctypeId: string; pages: string }

const LABEL = 'w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap';
const INPUT = 'w-full min-w-0 flex-1 h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors';

export default function BundleSlideModal({ open, onClose, bundle, units, doctypes }: Props) {
  const router = useRouter();
  const isEditing = Boolean(bundle);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const emptyRow = (): Row => ({ productionUnitId: '', doctypeId: '', pages: '1' });

  useEffect(() => {
    if (!open) return;
    if (bundle) {
      setName(bundle.name);
      setPrice(String(Number(bundle.price)));
      setEffectiveFrom(bundle.effectiveFrom ? String(bundle.effectiveFrom).slice(0, 10) : '');
      setNotes(bundle.notes || '');
      setIsActive(bundle.isActive);
      setRows(bundle.items.map((i) => ({ productionUnitId: i.productionUnitId, doctypeId: i.doctypeId, pages: String(i.pages) })));
    } else {
      setName(''); setPrice(''); setEffectiveFrom(''); setNotes(''); setIsActive(true);
      setRows([emptyRow(), emptyRow()]);
    }
    setError('');
  }, [open, bundle]);

  if (!open || typeof window === 'undefined') return null;

  const updateRow = (idx: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const save = async () => {
    setError('');
    setIsSaving(true);
    const res = await saveBundleAction({
      id: bundle?.id,
      name,
      price: Number(price),
      effectiveFrom: effectiveFrom || null,
      notes,
      isActive,
      items: rows.map((r) => ({ productionUnitId: r.productionUnitId, doctypeId: r.doctypeId, pages: Number(r.pages) })),
    });
    setIsSaving(false);
    if (!res.success) {
      setError(res.error || 'Gagal menyimpan bundle.');
      toast.error(res.error || 'Gagal menyimpan bundle.');
      return;
    }
    toast.success(`Bundle "${name.trim()}" disimpan.`);
    onClose();
    router.refresh();
  };

  const remove = async () => {
    if (!bundle || !window.confirm(`Hapus bundle "${bundle.name}"?`)) return;
    const res = await deleteBundleAction(bundle.id);
    if (!res.success) {
      setError(res.error || 'Gagal menghapus.');
      toast.error(res.error || 'Gagal menghapus.');
      return;
    }
    toast.success('Bundle dihapus.');
    onClose();
    router.refresh();
  };

  return createPortal(
    <div className="fixed inset-0 z-70">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/40 cursor-pointer" aria-label="Close modal" />
      <div className="absolute right-0 top-0 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 mr-3">
            <div className="w-8 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">{isEditing ? 'Edit Bundle' : 'Add Bundle'}</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Kontrak multi-platform dengan satu harga paket</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal" className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          <div className="flex items-stretch text-xs min-h-[44px]">
            <div className={LABEL}>Nama Bundle</div>
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Canva 12 + PPT 20" />
          </div>
          <div className="flex items-stretch text-xs min-h-[44px]">
            <div className={LABEL}>Harga Paket</div>
            <input className={INPUT} type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="115000" />
          </div>
          <div className="flex items-stretch text-xs min-h-[44px]">
            <div className={LABEL}>Berlaku Mulai</div>
            <div className="flex-1 min-w-0 flex items-stretch bg-white dark:bg-[#0d0e12]">
              <DatePickerCell fullWidth value={effectiveFrom} onChange={setEffectiveFrom} placeholder="Pilih Tanggal..." />
            </div>
          </div>
          <div className="flex items-stretch text-xs min-h-[44px]">
            <div className={LABEL}>Status</div>
            <div className="flex-1 grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
              {[true, false].map((v) => (
                <button key={String(v)} type="button" onClick={() => setIsActive(v)}
                  className={`min-h-[44px] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${isActive === v ? 'bg-emerald-600 text-white' : 'bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
                  {v ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-stretch text-xs min-h-[88px]">
            <div className={LABEL}>Catatan</div>
            <textarea className={`${INPUT} py-3 resize-none`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Syarat khusus, mis. hanya untuk agency" />
          </div>

          <div className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/50 dark:bg-[#16181d]/50">Komponen (satu task per board · QTY Submit 1 template)</div>
          <div className="flex items-stretch min-h-[32px] divide-x divide-[#f0f0f0] dark:divide-[#272a34] text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-[#16181d]/50 select-none">
            <div className="flex-1 min-w-0 px-4 flex items-center">Production Board</div>
            <div className="flex-1 min-w-0 px-4 flex items-center">Doctype</div>
            <div className="w-[72px] shrink-0 flex items-center justify-center">Pages</div>
            <div className="w-11 shrink-0" />
          </div>
          {rows.map((row, idx) => {
            const unit = units.find((u) => u.id === row.productionUnitId);
            const doctypeOptions = doctypes.filter((d) => d.platformId === unit?.platformId);
            return (
              <div key={idx} className="flex items-stretch text-xs min-h-[44px] divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
                <div className="flex-1 min-w-0">
                  <PlatformSelectCell
                    showSearch
                    value={row.productionUnitId}
                    options={units.map((u) => ({ slug: u.id, name: u.name }))}
                    placeholder="Pilih Board..."
                    onChange={(id) => updateRow(idx, { productionUnitId: id, doctypeId: '' })}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <PlatformSelectCell
                    showSearch
                    value={row.doctypeId}
                    options={doctypeOptions.map((d) => ({ slug: d.id, name: d.displayName }))}
                    placeholder={unit ? 'Pilih Doctype...' : 'Pilih board dulu'}
                    onChange={(id) => {
                      const picked = doctypes.find((d) => d.id === id);
                      updateRow(idx, { doctypeId: id, pages: String(picked?.pages && picked.pages > 0 ? picked.pages : 1) });
                    }}
                  />
                </div>
                <input className="w-[72px] shrink-0 min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-2 text-center font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors" type="number" min="0" step="1" value={row.pages} onChange={(e) => updateRow(idx, { pages: e.target.value })} title="Jumlah pages per task (default dari doctype)" />
                <button type="button" onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))} aria-label="Hapus komponen" className="w-11 shrink-0 flex items-center justify-center text-gray-400 hover:text-rose-500 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow()])} className="w-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold text-[#ff5e1f] hover:bg-[#ff5e1f]/10 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Tambah Komponen
          </button>
          {error && <p className="px-5 py-3 text-xs font-bold text-rose-500">{error}</p>}
        </div>

        <div className="grid shrink-0 border-t border-[#f0f0f0] dark:border-[#272a34] divide-x divide-[#f0f0f0] dark:divide-[#272a34]" style={{ gridTemplateColumns: isEditing ? '1fr 1fr 1.4fr' : '1fr 1.4fr' }}>
          <button type="button" onClick={onClose} disabled={isSaving} className="py-3.5 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 cursor-pointer disabled:opacity-50">Cancel</button>
          {isEditing && (
            <button type="button" onClick={remove} disabled={isSaving} className="py-3.5 bg-white dark:bg-[#0d0e12] hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold uppercase tracking-wider text-rose-500 cursor-pointer disabled:opacity-50">Delete</button>
          )}
          <button type="button" onClick={save} disabled={isSaving} className="py-3.5 bg-[#ff5e1f] hover:bg-[#ff7038] text-xs font-bold uppercase tracking-wider text-white cursor-pointer disabled:opacity-50">{isSaving ? 'Saving…' : isEditing ? 'Save Bundle' : 'Create Bundle'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
