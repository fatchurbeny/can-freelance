'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, Loader2, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createProductionFieldAction } from '@/app/actions/production-field';
import { CREATABLE_FIELD_TYPES, fieldTypeInfo } from '@/lib/notion-field-types';

interface Props {
  open: boolean;
  unitId: string;
  unitName: string;
  platformName: string;
  onClose: () => void;
  onCreated: () => void;
}

const LABEL = 'w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center font-bold text-gray-500 dark:text-gray-400 select-none';
const INPUT = 'w-full min-w-0 flex-1 min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f]';
const SECTION = 'px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/50 dark:bg-[#16181d]/50';
const SEG = 'min-h-[44px] text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors';

/** Drawer bersusun "Tambah Field": membuat properti baru di database Notion production lalu mendaftarkannya. */
export default function AddFieldDrawer({ open, unitId, unitName, platformName, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState('select');
  const [options, setOptions] = useState<string[]>(['']);
  const [scope, setScope] = useState<'unit' | 'platform'>('unit');
  const [visible, setVisible] = useState(true);
  const [editable, setEditable] = useState(true);
  const [filterable, setFilterable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(''); setType('select'); setOptions(['']); setScope('unit');
    setVisible(true); setEditable(true); setFilterable(false);
  }, [open]);

  // Escape hanya menutup drawer ini, bukan drawer Edit Production di bawahnya
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || saving) return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, saving, onClose]);

  if (!open || typeof window === 'undefined') return null;

  const info = fieldTypeInfo(type)!;
  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);

  const submit = async () => {
    setSaving(true);
    const res = await createProductionFieldAction({
      unitId,
      scope,
      name,
      type,
      options: info.hasOptions ? cleanOptions.map((o) => ({ name: o })) : [],
      visible,
      editable,
      filterable,
    });
    setSaving(false);
    if (!res.success) { toast.error(res.error || 'Gagal membuat field.'); return; }
    if (res.failed?.length) toast.error(`Gagal di: ${res.failed.map((f: { unit: string }) => f.unit).join(', ')}`);
    toast.success(`Field "${name.trim()}" dibuat di Notion.`);
    onCreated();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-80">
      <button type="button" onClick={() => !saving && onClose()} className="absolute inset-0 bg-black/20 cursor-pointer" aria-label="Tutup Tambah Field" />
      <div role="dialog" aria-modal="true" aria-label="Tambah Field" className="absolute right-0 top-0 h-full w-full max-w-[540px] bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 mr-3">
            <div className="w-8 h-8 border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] flex items-center justify-center shrink-0"><Plus className="w-4 h-4" /></div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">Tambah Field</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{unitName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Tutup" className="flex size-8 shrink-0 items-center justify-center border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          <div className="flex items-stretch text-xs min-h-[44px]">
            <label htmlFor="new-field-name" className={LABEL}>Nama Field</label>
            <input id="new-field-name" className={INPUT} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="mis. Tipe Klien" autoFocus />
          </div>

          <div className={SECTION}>Tipe</div>
          <div className="grid grid-cols-4 border-b border-[#f0f0f0] dark:border-[#272a34]">
            {CREATABLE_FIELD_TYPES.map((t) => {
              const selected = t === type;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setType(t)}
                  className={`min-h-[56px] px-3 flex flex-col items-start justify-center gap-0.5 text-left border-r border-b border-[#f0f0f0] dark:border-[#272a34] cursor-pointer ${selected ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#16181d]'}`}
                >
                  <span className="text-xs font-bold">{fieldTypeInfo(t)!.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">{t}</span>
                </button>
              );
            })}
          </div>

          {info.hasOptions && (
            <>
              <div className={SECTION}>Opsi</div>
              {options.map((option, i) => (
                <div key={i} className="flex items-stretch text-xs min-h-[44px]">
                  <label htmlFor={`opt-${i}`} className={LABEL}>Opsi {i + 1}</label>
                  <input
                    id={`opt-${i}`}
                    className={INPUT}
                    value={option}
                    onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setOptions((prev) => [...prev, '']); } }}
                  />
                  {options.length > 1 && (
                    <button type="button" aria-label={`Hapus opsi ${i + 1}`} onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))} className="w-11 shrink-0 border-l border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center text-gray-500 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setOptions((prev) => [...prev, ''])} className="w-full min-h-[44px] px-5 text-left text-xs font-bold text-[#c2410c] hover:bg-gray-50 dark:hover:bg-[#16181d] cursor-pointer">+ Tambah opsi</button>
            </>
          )}

          <div className={SECTION}>Pengaturan</div>
          <div className="flex items-stretch text-xs min-h-[44px]">
            <div className={LABEL}>Berlaku untuk</div>
            <div className="flex-1 grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
              <button type="button" aria-pressed={scope === 'unit'} onClick={() => setScope('unit')} className={`${SEG} ${scope === 'unit' ? 'bg-[#615fff] text-white' : 'bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#16181d]'}`}>Production ini</button>
              <button type="button" aria-pressed={scope === 'platform'} onClick={() => setScope('platform')} className={`${SEG} ${scope === 'platform' ? 'bg-[#615fff] text-white' : 'bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#16181d]'}`}>Semua {platformName}</button>
            </div>
          </div>
          <label className="flex items-stretch text-xs min-h-[44px] cursor-pointer">
            <span className={LABEL}>Tampil di drawer</span>
            <span className="flex-1 flex items-center gap-2.5 px-5 font-bold text-gray-900 dark:text-white"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="w-4 h-4 accent-gray-900" />Ya</span>
          </label>
          <label className="flex items-stretch text-xs min-h-[44px] cursor-pointer">
            <span className={LABEL}>Bisa diedit</span>
            <span className="flex-1 flex items-center gap-2.5 px-5 font-bold text-gray-900 dark:text-white"><input type="checkbox" checked={editable} onChange={(e) => setEditable(e.target.checked)} className="w-4 h-4 accent-gray-900" />Ya, sync 2 arah</span>
          </label>
          <div className="flex items-stretch text-xs min-h-[44px]">
            <span className={LABEL}>Pakai sbg filter</span>
            {info.filterable ? (
              <label className="flex-1 flex items-center gap-2.5 px-5 font-bold text-gray-900 dark:text-white cursor-pointer"><input type="checkbox" checked={filterable} onChange={(e) => setFilterable(e.target.checked)} className="w-4 h-4 accent-gray-900" />Tampilkan di toolbar filter board</label>
            ) : (
              <span className="flex-1 flex items-center px-5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Hanya untuk Select, Multi-select, Status, dan Checkbox</span>
            )}
          </div>

          <div className="m-5 p-4 border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 flex gap-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            <Info className="w-4 h-4 shrink-0 text-[#c2410c] mt-0.5" />
            <p>
              Properti <strong>{name.trim() || '…'}</strong> ({info.label}) akan dibuat di database Notion {scope === 'platform' ? <>semua production aktif di platform <strong>{platformName}</strong></> : <strong>{unitName}</strong>}. Kalau nama yang sama sudah ada dengan tipe yang sama, properti itu dipakai dan tidak dibuat duplikat.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 shrink-0 border-t border-[#f0f0f0] dark:border-[#272a34] divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
          <button type="button" onClick={onClose} disabled={saving} className="py-3.5 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 cursor-pointer disabled:opacity-50">Batal</button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !name.trim() || (info.hasOptions && cleanOptions.length === 0)}
            className="py-3.5 bg-[#ff5e1f] hover:bg-[#ff7038] text-xs font-bold uppercase tracking-wider text-white cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Buat di Notion
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
