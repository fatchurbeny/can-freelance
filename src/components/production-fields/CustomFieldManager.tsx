'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Loader2, Pencil, Plus, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  recreateProductionFieldAction,
  refreshProductionFieldsAction,
  removeMissingProductionFieldAction,
  updateProductionFieldAction,
} from '@/app/actions/production-field';
import { CREATABLE_FIELD_TYPES, fieldTypeInfo } from '@/lib/notion-field-types';

export interface ProductionFieldRow {
  id: string;
  name: string;
  type: string;
  source: string;
  visible: boolean;
  editable: boolean;
  filterable: boolean;
  missingInNotion: boolean;
}

interface Props {
  unitId: string;
  fields: ProductionFieldRow[];
  onAdd: () => void;
  onChanged: () => void;
}

const BTN = 'h-8 px-3 border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] cursor-pointer disabled:opacity-50 flex items-center gap-1.5';
const ICON_BTN = 'size-8 shrink-0 border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer disabled:opacity-50 flex items-center justify-center';

/** Daftar field tambahan production: tampil/edit, ganti nama, baca ulang skema Notion, buat ulang yang hilang. */
export default function CustomFieldManager({ unitId, fields, onAdd, onChanged }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const run = async (id: string, action: () => Promise<{ success: boolean; error?: string }>, done?: string) => {
    setBusyId(id);
    const res = await action();
    setBusyId(null);
    if (!res.success) { toast.error(res.error || 'Gagal.'); return false; }
    if (done) toast.success(done);
    onChanged();
    return true;
  };

  const refresh = async () => {
    setRefreshing(true);
    const res = await refreshProductionFieldsAction(unitId);
    setRefreshing(false);
    if (!res.success) { toast.error(res.error || 'Gagal membaca skema Notion.'); return; }
    toast.success(res.added || res.missing ? `Skema dibaca: ${res.added} field baru, ${res.missing} hilang dari Notion.` : 'Skema dibaca, tidak ada perubahan.');
    onChanged();
  };

  const saveRename = async () => {
    if (!renaming) return;
    const ok = await run(renaming.id, () => updateProductionFieldAction({ id: renaming.id, name: renaming.name }), 'Nama field diubah di app & Notion.');
    if (ok) setRenaming(null);
  };

  return (
    <div className="font-sans">
      <div className="flex items-center justify-end gap-2 px-5 py-2.5 bg-white dark:bg-[#0d0e12]">
        <button type="button" onClick={refresh} disabled={refreshing} className={BTN}>
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Baca ulang skema
        </button>
        <button type="button" onClick={onAdd} className="h-8 px-3 bg-[#ff5e1f] hover:bg-[#ff7038] text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />Tambah field
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 border-t border-[#f0f0f0] dark:border-[#272a34]">
          Belum ada field tambahan. Tambah field baru, atau klik &ldquo;Baca ulang skema&rdquo; untuk memakai properti yang sudah ada di Notion.
        </p>
      ) : (
        <div className="border-t border-[#f0f0f0] dark:border-[#272a34] divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          {fields.map((field) => {
            const info = fieldTypeInfo(field.type);
            const busy = busyId === field.id;
            const isNew = field.source === 'notion' && !field.visible && !field.missingInNotion;
            return (
              <div key={field.id} className={`px-5 py-2.5 text-xs ${field.missingInNotion ? 'bg-amber-50/60 dark:bg-amber-500/5' : isNew ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}>
                <div className="flex items-center gap-2 min-h-8">
                  {renaming?.id === field.id ? (
                    <>
                      <input
                        aria-label="Nama baru"
                        autoFocus
                        value={renaming.name}
                        onChange={(e) => setRenaming({ id: field.id, name: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') { e.stopPropagation(); setRenaming(null); } }}
                        className="flex-1 min-w-0 h-8 px-3 border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 text-xs font-bold outline-none focus:ring-1 focus:ring-[#ff5e1f]"
                      />
                      <button type="button" onClick={saveRename} disabled={busy || !renaming.name.trim()} aria-label="Simpan nama" className={ICON_BTN}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}</button>
                      <button type="button" onClick={() => setRenaming(null)} aria-label="Batal ganti nama" className={ICON_BTN}><X className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <span className={`font-bold truncate ${field.missingInNotion ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`} title={field.name}>{field.name}</span>
                      <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400 shrink-0">{field.type}</span>
                      {isNew && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#615fff] text-white shrink-0">Baru di Notion</span>}
                      {field.missingInNotion && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 shrink-0 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Tidak ada di Notion</span>}
                      <span className="ml-auto text-[10px] text-gray-500 dark:text-gray-400 shrink-0">{field.source === 'app' ? 'Dibuat di app' : 'Dari Notion'}</span>
                    </>
                  )}
                </div>

                {renaming?.id !== field.id && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {field.missingInNotion ? (
                      <>
                        {CREATABLE_FIELD_TYPES.includes(field.type) && (
                          <button type="button" disabled={busy} onClick={() => run(field.id, () => recreateProductionFieldAction(field.id), 'Field dibuat ulang di Notion.')} className={BTN}>Buat ulang</button>
                        )}
                        <button type="button" disabled={busy} onClick={() => run(field.id, () => removeMissingProductionFieldAction(field.id))} className={BTN}>Hapus dari daftar</button>
                      </>
                    ) : (
                      <>
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          <input type="checkbox" checked={field.visible} disabled={busy} onChange={(e) => run(field.id, () => updateProductionFieldAction({ id: field.id, visible: e.target.checked }))} className="w-4 h-4 accent-gray-900" />Tampil
                        </label>
                        {info?.editable ? (
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={field.editable} disabled={busy} onChange={(e) => run(field.id, () => updateProductionFieldAction({ id: field.id, editable: e.target.checked }))} className="w-4 h-4 accent-gray-900" />Bisa diedit
                          </label>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{info ? 'Hanya baca' : 'Tipe belum didukung'}</span>
                        )}
                        {info?.filterable && (
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={field.filterable} disabled={busy} onChange={(e) => run(field.id, () => updateProductionFieldAction({ id: field.id, filterable: e.target.checked }))} className="w-4 h-4 accent-gray-900" />Filter
                          </label>
                        )}
                        <button type="button" disabled={busy} onClick={() => setRenaming({ id: field.id, name: field.name })} aria-label={`Ganti nama ${field.name}`} className={`${ICON_BTN} ml-auto`}>
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="px-5 py-3 text-[11px] text-gray-500 dark:text-gray-400 border-t border-[#f0f0f0] dark:border-[#272a34]">
        Field disembunyikan dari app, bukan dihapus. Hapus properti langsung di Notion bila benar-benar tidak dipakai.
      </p>
    </div>
  );
}
