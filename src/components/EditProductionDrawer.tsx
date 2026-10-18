'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Files, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  updateProductionUnitAction,
  checkNotionDatabaseAction,
  addMissingDatabasePropertiesAction,
} from '@/app/actions/production-unit';
import StepSchema from './production-wizard/StepSchema';
import StepOutput from './production-wizard/StepOutput';
import { INITIAL_DATA } from './production-wizard/types';

export interface EditableUnit {
  id: string;
  name: string;
  slug: string;
  notionTaskDbId: string;
  dropboxRoot: string | null;
  platform: { id: string; name: string; outputType: string };
  _count: { tasks: number };
}

interface Report {
  matched: string[];
  aliased: { expected: string; found: string }[];
  missing: string[];
  typeMismatch: { name: string; expected: string; found: string }[];
}

interface Props {
  unit: EditableUnit | null;
  onClose: () => void;
}

const LABEL = 'w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center font-sans font-bold text-gray-500 dark:text-gray-400 select-none';
const INPUT = 'w-full min-w-0 flex-1 min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors';
const SECTION = 'px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/50 dark:bg-[#16181d]/50';

/** Drawer edit production: bagian sama dengan wizard setup (Info, Notion Database, Skema Field, Output). */
export default function EditProductionDrawer({ unit, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [dropboxRoot, setDropboxRoot] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!unit) return;
    setName(unit.name);
    setDatabaseId(unit.notionTaskDbId);
    setDropboxRoot(unit.dropboxRoot ?? '');
    setReport(null);
    setMessage('');
    setError('');
  }, [unit]);

  if (!unit || typeof window === 'undefined') return null;

  const databaseChanged = databaseId.trim() !== unit.notionTaskDbId;
  const reportOk = report && report.missing.length === 0 && report.typeMismatch.length === 0;

  const check = async () => {
    setBusy(true); setMessage('');
    const res = await checkNotionDatabaseAction({ databaseId });
    setBusy(false);
    if (!res.success || !res.report) { setReport(null); return setMessage(res.error ?? 'Gagal memeriksa database.'); }
    setReport(res.report as Report);
  };

  const addMissing = async () => {
    setBusy(true); setMessage('');
    const res = await addMissingDatabasePropertiesAction({ databaseId, platformId: unit.platform.id });
    setBusy(false);
    if (!res.success || !res.report) return setMessage(res.error ?? 'Gagal menambahkan properti.');
    setReport(res.report as Report);
    setMessage(`Ditambahkan: ${res.added?.length ?? 0} properti.`);
  };

  const save = async () => {
    setError('');
    setSaving(true);
    const res = await updateProductionUnitAction({ unitId: unit.id, name, databaseId, dropboxRoot });
    setSaving(false);
    if (!res.success) { setError(res.error || 'Gagal menyimpan.'); return; }
    toast.success(res.databaseChanged ? 'Production disimpan, sync Notion dijalankan.' : 'Production disimpan.');
    window.dispatchEvent(new Event('production-units-changed'));
    onClose();
    router.refresh();
  };

  return createPortal(
    <div className="fixed inset-0 z-70">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/40 cursor-pointer" aria-label="Close modal" />
      <div className="absolute right-0 top-0 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 mr-3">
            <div className="w-8 h-8 border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] flex items-center justify-center shrink-0"><Files className="w-4 h-4" /></div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">Edit Production</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{unit.platform.name} · {unit._count.tasks} task</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal" className="flex size-8 shrink-0 items-center justify-center border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          <div className={SECTION}>1 · Info Dasar</div>
          <div className="flex items-stretch text-xs min-h-[44px]">
            <div className={LABEL}>Nama</div>
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama production" />
          </div>
          <div className="flex items-stretch text-xs min-h-[44px]">
            <div className={LABEL}>Slug URL</div>
            <div className="flex-1 px-5 flex items-center font-mono text-xs text-gray-500">/production/{unit.slug}<span className="ml-2 font-sans text-[10px] uppercase tracking-wider text-gray-400">Terkunci</span></div>
          </div>
          <div className="flex items-stretch text-xs min-h-[44px]">
            <div className={LABEL}>Platform</div>
            <div className="flex-1 px-5 flex items-center text-xs font-bold text-gray-900 dark:text-white">{unit.platform.name}<span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Terkunci</span></div>
          </div>

          <div className={SECTION}>2 · Notion Database</div>
          <div className="flex items-stretch text-xs min-h-[44px]">
            <div className={LABEL}>Database ID</div>
            <input className={`${INPUT} font-mono`} value={databaseId} onChange={(e) => { setDatabaseId(e.target.value); setReport(null); }} aria-label="Database ID" />
            <button type="button" onClick={check} disabled={busy || !databaseId.trim()} className="px-4 shrink-0 border-l border-[#f0f0f0] dark:border-[#272a34] text-xs font-bold cursor-pointer disabled:opacity-50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#16181d]">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Periksa'}
            </button>
          </div>
          {(report || message || databaseChanged) && (
            <div className="px-5 py-3 space-y-2 text-xs">
              {databaseChanged && <p className="flex items-start gap-2 text-amber-600"><AlertTriangle className="w-4 h-4 shrink-0" /> Database diganti: skema akan divalidasi saat disimpan. Task dari database lama dibersihkan oleh sync full berikutnya.</p>}
              {report && (
                <div className={`flex items-center gap-2 font-semibold ${reportOk ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {reportOk ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {reportOk ? `Skema lengkap — ${report.matched.length} properti cocok` : 'Skema belum lengkap'}
                </div>
              )}
              {report && report.missing.length > 0 && <p className="text-gray-500">Hilang: {report.missing.join(', ')}</p>}
              {report && report.typeMismatch.length > 0 && <p className="text-gray-500">Tipe beda: {report.typeMismatch.map((m) => `${m.name} (${m.found}≠${m.expected})`).join(', ')}</p>}
              {report && report.missing.length > 0 && (
                <button type="button" onClick={addMissing} disabled={busy} className="h-9 px-4 bg-[#ff5e1f] text-white text-xs font-semibold cursor-pointer disabled:opacity-50">Tambahkan properti yang hilang</button>
              )}
              {message && <p className="text-gray-500 dark:text-gray-400">{message}</p>}
            </div>
          )}

          <div className={SECTION}>3 · Skema Field</div>
          <div className="p-4"><StepSchema /></div>

          <div className={SECTION}>4 · Output</div>
          <div className="p-4">
            <StepOutput
              data={{ ...INITIAL_DATA, dropboxRoot }}
              platform={{ id: unit.platform.id, name: unit.platform.name, slug: unit.slug, outputType: unit.platform.outputType }}
              onChange={(patch) => { if (patch.dropboxRoot !== undefined) setDropboxRoot(patch.dropboxRoot); }}
            />
          </div>
          {error && <p className="px-5 py-3 text-xs font-bold text-rose-500">{error}</p>}
        </div>

        <div className="grid grid-cols-[1fr_1.4fr] shrink-0 border-t border-[#f0f0f0] dark:border-[#272a34] divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
          <button type="button" onClick={onClose} disabled={saving} className="py-3.5 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 cursor-pointer disabled:opacity-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="py-3.5 bg-[#ff5e1f] hover:bg-[#ff7038] text-xs font-bold uppercase tracking-wider text-white cursor-pointer disabled:opacity-50">{saving ? 'Saving…' : 'Save Production'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
