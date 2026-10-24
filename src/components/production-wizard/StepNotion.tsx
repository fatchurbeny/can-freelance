'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Plus } from 'lucide-react';
import {
  checkNotionDatabaseAction,
  addMissingDatabasePropertiesAction,
  listParentPagesAction,
} from '@/app/actions/production-unit';
import { addNotionPageAction } from '@/app/actions/notion-config';
import PortalSelect from '../production-fields/PortalSelect';
import type { WizardData } from './types';

interface Report {
  matched: string[];
  aliased: { expected: string; found: string }[];
  missing: string[];
  typeMismatch: { name: string; expected: string; found: string }[];
}

interface Props {
  data: WizardData;
  platformId: string;
  onChange: (patch: Partial<WizardData>) => void;
  onReadyChange: (ready: boolean) => void;
}

const fieldClass =
  'w-full h-11 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] px-3 font-sans text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-[#ff5e1f]';

export default function StepNotion({ data, platformId, onChange, onReadyChange }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pages, setPages] = useState<{ pageId: string; name: string; isDefault: boolean }[] | null>(null);
  const [otherPage, setOtherPage] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const [savingPage, setSavingPage] = useState(false);

  // Page induk dari Notion Config → Pages; page default terpilih otomatis bila belum diisi
  useEffect(() => {
    listParentPagesAction().then((res) => {
      const list = res?.success ? res.pages : [];
      setPages(list);
      const current = data.parentPageId.trim().replace(/-/g, '').toLowerCase();
      if (!current && list.length > 0) onChange({ parentPageId: (list.find((p) => p.isDefault) ?? list[0]).pageId });
      else if (current && !list.some((p) => p.pageId === current)) setOtherPage(true);
      if (list.length === 0) setOtherPage(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePage() {
    setSavingPage(true);
    setMessage(null);
    const res = await addNotionPageAction({ page: data.parentPageId, makeDefault });
    setSavingPage(false);
    if (!res.success || !res.page) { setMessage(res.error ?? 'Gagal menyimpan page.'); return; }
    const saved = res.page;
    setPages((prev) => [...(prev ?? []).map((p) => (makeDefault ? { ...p, isDefault: false } : p)).filter((p) => p.pageId !== saved.pageId), saved]);
    onChange({ parentPageId: saved.pageId });
    setOtherPage(false);
    setMakeDefault(false);
    setMessage(`Page "${saved.name}" disimpan ke daftar page${saved.isDefault ? ' sebagai default' : ''}.`);
  }

  // Mode create: cukup isi parent page. Mode connect: harus lolos validasi skema.
  useEffect(() => {
    if (data.notionMode === 'create') {
      onReadyChange(data.parentPageId.trim().length > 0);
      return;
    }
    const ok = !!report && report.missing.length === 0 && report.typeMismatch.length === 0;
    onReadyChange(ok);
  }, [data.notionMode, data.parentPageId, report, onReadyChange]);

  async function check() {
    setBusy(true);
    setMessage(null);
    const res = await checkNotionDatabaseAction({ databaseId: data.databaseId });
    setBusy(false);
    if (!res.success || !res.report) {
      setReport(null);
      setMessage(res.error ?? 'Gagal memeriksa database.');
      return;
    }
    setReport(res.report);
  }

  async function addMissing() {
    setBusy(true);
    setMessage(null);
    const res = await addMissingDatabasePropertiesAction({ databaseId: data.databaseId, platformId });
    setBusy(false);
    if (!res.success || !res.report) {
      setMessage(res.error ?? 'Gagal menambahkan properti.');
      return;
    }
    setReport(res.report);
    setMessage(`Ditambahkan: ${res.added?.length ?? 0} properti.`);
  }

  return (
    <div className="border border-[#f0f0f0] dark:border-[#272a34] font-sans">
      <div className="grid grid-cols-2 border-b border-[#f0f0f0] dark:border-[#272a34]">
        {(['create', 'connect'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => { onChange({ notionMode: mode }); setReport(null); setMessage(null); }}
            className={`h-11 text-xs font-semibold cursor-pointer transition-colors ${
              data.notionMode === mode
                ? 'bg-[#ff5e1f] text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#16181d]/60'
            }`}
          >
            {mode === 'create' ? 'Buat Database Baru' : 'Hubungkan Database'}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {data.notionMode === 'create' ? (
          <>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Database Task baru dibuat di dalam page Notion yang dipilih. Daftar page diatur di Notion Config → Pages &amp; Databases; pastikan page sudah di-share ke integrasi (••• → Connections).
            </p>
            {pages === null ? (
              <p className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-4 h-4 animate-spin" />Memuat daftar page…</p>
            ) : (
              <>
                {pages.length > 0 && (
                  <div className="border border-[#f0f0f0] dark:border-[#272a34]">
                    <PortalSelect
                      ariaLabel="Page induk"
                      value={otherPage ? '__other' : data.parentPageId}
                      options={[
                        ...pages.map((p) => ({ value: p.pageId, label: p.isDefault ? `${p.name} (default)` : p.name, hint: p.pageId })),
                        { value: '__other', label: 'Page lain…', hint: 'Tempel link atau ID page Notion' },
                      ]}
                      onChange={(value) => {
                        setMessage(null);
                        if (value === '__other') { setOtherPage(true); onChange({ parentPageId: '' }); return; }
                        setOtherPage(false);
                        onChange({ parentPageId: value });
                      }}
                    />
                  </div>
                )}
                {otherPage && (
                  <>
                    <input
                      className={fieldClass}
                      aria-label="Parent page ID"
                      placeholder="Link page Notion atau ID 32 karakter"
                      value={data.parentPageId}
                      onChange={(e) => onChange({ parentPageId: e.target.value })}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={savePage}
                        disabled={savingPage || !data.parentPageId.trim()}
                        className="h-9 px-3 border border-[#f0f0f0] dark:border-[#272a34] text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {savingPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Simpan ke daftar page
                      </button>
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="w-4 h-4 accent-gray-900" />Jadikan default
                      </label>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Tanpa disimpan, page ini hanya dipakai untuk production ini.</p>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Masukkan ID database Notion yang sudah ada. Skema akan diperiksa sebelum bisa dilanjutkan.
            </p>
            <div className="flex gap-2">
              <input
                className={fieldClass}
                placeholder="Database ID"
                value={data.databaseId}
                onChange={(e) => { onChange({ databaseId: e.target.value }); setReport(null); }}
              />
              <button
                type="button"
                onClick={check}
                disabled={busy || !data.databaseId.trim()}
                className="h-11 px-4 shrink-0 border border-[#f0f0f0] dark:border-[#272a34] text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Periksa'}
              </button>
            </div>
            {report && <ReportView report={report} />}
            {report && report.missing.length > 0 && (
              <button
                type="button"
                onClick={addMissing}
                disabled={busy}
                className="h-10 px-4 bg-[#ff5e1f] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Tambahkan properti yang hilang
              </button>
            )}
          </>
        )}
        {message && <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>}
      </div>
    </div>
  );
}

function ReportView({ report }: { report: Report }) {
  const ok = report.missing.length === 0 && report.typeMismatch.length === 0;
  return (
    <div className="border border-[#f0f0f0] dark:border-[#272a34] p-3 space-y-2 text-xs">
      <div className={`flex items-center gap-2 font-semibold ${ok ? 'text-emerald-600' : 'text-rose-500'}`}>
        {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {ok ? `Skema lengkap — ${report.matched.length} properti cocok` : 'Skema belum lengkap'}
      </div>
      {report.aliased.length > 0 && (
        <p className="text-gray-500">Alias: {report.aliased.map((a) => `${a.expected} ← ${a.found}`).join(', ')}</p>
      )}
      {report.missing.length > 0 && <p className="text-gray-500">Hilang: {report.missing.join(', ')}</p>}
      {report.typeMismatch.length > 0 && (
        <p className="text-gray-500">Tipe beda: {report.typeMismatch.map((m) => `${m.name} (${m.found}≠${m.expected})`).join(', ')}</p>
      )}
    </div>
  );
}
