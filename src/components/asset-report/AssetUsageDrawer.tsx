"use client";

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ExternalLink, RefreshCw, X } from 'lucide-react';
import { getAssetUsageAction } from '@/app/actions/asset-report';
import { coverSrc } from '@/components/assets/asset-ui';
import type { AssetUsage, TemplateOutcome } from '@/lib/asset-report';
import { FLAG_VIEW, OUTCOME_VIEW } from './AssetReportClient';

interface Props {
  assetId: string;
  filters: { productionUnitId: string | null; days: number | null };
  onClose: () => void;
}

const th = 'px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400';
const OUTCOMES = ['approved', 'profileOnly', 'reject', 'inProgress'] as const;

/** Drawer Asset Report: template (task) yang memakai aset, status, designer, pages doctype, link template Canva. */
export default function AssetUsageDrawer({ assetId, filters, onClose }: Props) {
  const [usage, setUsage] = useState<AssetUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TemplateOutcome | 'all'>('all');
  const { productionUnitId, days } = filters;

  useEffect(() => {
    let cancelled = false;
    getAssetUsageAction(assetId, { productionUnitId, days }).then((res) => {
      if (cancelled) return;
      if (!res.success) { setError(res.error); return; }
      setUsage(res.usage);
    });
    return () => { cancelled = true; };
  }, [assetId, productionUnitId, days]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = useMemo(() => (usage?.rows ?? []).filter((r) => status === 'all' || r.outcome === status), [usage, status]);

  if (typeof window === 'undefined') return null;
  const cover = usage ? coverSrc(usage.asset.coverUrl, usage.asset.previewUrl) : null;
  const done = usage ? usage.counts.approved + usage.counts.profileOnly + usage.counts.reject : 0;
  const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label="Pemakaian aset">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[860px] flex-col border-l border-[#f0f0f0] bg-white font-sans shadow-2xl animate-[slideInRight_180ms_ease-out] dark:border-[#272a34] dark:bg-[#0d0e12]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#f0f0f0] bg-gray-50/50 px-5 py-4 dark:border-[#272a34] dark:bg-[#16181d]/50">
          <div className="flex min-w-0 items-center gap-3">
            {cover
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={cover} alt="" className="h-12 w-16 shrink-0 border border-[#f0f0f0] object-cover dark:border-[#272a34]" />
              : <span className="h-12 w-16 shrink-0 border border-[#f0f0f0] bg-gray-100 dark:border-[#272a34] dark:bg-[#20232b]" />}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-gray-900 dark:text-white">{usage?.asset.title ?? 'Memuat…'}</h2>
              {usage && (
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {usage.asset.categoryName} · {usage.asset.productionNames.length ? usage.asset.productionNames.join(', ') : 'Semua production Canva'}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {usage && (
              <a href={usage.asset.editUrl || usage.asset.previewUrl} target="_blank" rel="noreferrer"
                className="flex h-8 items-center gap-1.5 border border-[#f0f0f0] bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-gray-700 hover:text-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d] dark:text-gray-300">
                <ExternalLink className="h-3.5 w-3.5" /> Buka aset
              </a>
            )}
            <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-8 items-center justify-center border border-[#f0f0f0] bg-white text-gray-500 hover:text-gray-900 dark:border-[#272a34] dark:bg-[#16181d] dark:hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {error && <div className="px-5 py-4 text-xs font-semibold text-rose-600">{error}</div>}
        {!usage && !error && <div className="flex items-center gap-2 px-5 py-8 text-xs text-gray-500"><RefreshCw className="h-4 w-4 animate-spin text-[#ff5e1f]" /> Memuat pemakaian aset…</div>}

        {usage && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-5 border-b border-[#f0f0f0] dark:border-[#272a34]">
              <div className="border-r border-[#f0f0f0] px-5 py-3 dark:border-[#272a34]">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Applies</div>
                <div className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{usage.counts.applies}</div>
              </div>
              {OUTCOMES.map((k) => (
                <div key={k} className="border-r border-[#f0f0f0] px-5 py-3 last:border-r-0 dark:border-[#272a34]">
                  <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{OUTCOME_VIEW[k].label}</div>
                  <div className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{usage.counts[k]}</div>
                </div>
              ))}
            </div>

            {usage.flag === 'check' && (
              <div className="mx-5 mt-4 flex gap-2.5 border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>Perlu dicek.</strong> {usage.counts.profileOnly + usage.counts.reject} dari {done} template yang memakai aset ini berakhir Profile only / Reject ({pct(usage.problemRate)}), di atas rata-rata kategori {usage.asset.categoryName} ({pct(usage.categoryProblemRate)}). Lihat catatan di bawah untuk polanya.
                </span>
              </div>
            )}
            {usage.flag !== 'check' && (
              <p className="px-5 pt-4 text-xs text-gray-500 dark:text-gray-400">
                <span className={`mr-2 px-2 py-0.5 text-[11px] font-bold ${FLAG_VIEW[usage.flag].className}`}>{FLAG_VIEW[usage.flag].label}</span>
                Bermasalah {pct(usage.problemRate)} · rata-rata kategori {pct(usage.categoryProblemRate)}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2.5 pt-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Template yang memakai aset ini</h3>
              <div className="flex flex-wrap gap-1">
                {(['all', ...OUTCOMES] as const).map((k) => {
                  const count = k === 'all' ? usage.counts.applies : usage.counts[k];
                  if (k !== 'all' && count === 0) return null;
                  return (
                    <button key={k} type="button" onClick={() => setStatus(k)}
                      className={`h-8 border px-3 text-xs cursor-pointer ${status === k ? 'border-gray-900 bg-gray-900 font-bold text-white dark:border-white dark:bg-white dark:text-gray-900' : 'border-[#f0f0f0] bg-white font-semibold text-gray-600 hover:text-gray-900 dark:border-[#272a34] dark:bg-[#0d0e12] dark:text-gray-300'}`}>
                      {k === 'all' ? 'Semua' : OUTCOME_VIEW[k].label} {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="border-t border-[#f0f0f0] px-5 py-10 text-center text-xs text-gray-400 dark:border-[#272a34]">Belum ada brief yang memakai aset ini di periode / production ini.</p>
            ) : (
              <div className="overflow-x-auto border-t border-[#f0f0f0] dark:border-[#272a34]">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-gray-50/50 dark:bg-[#16181d]/50">
                    <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
                      <th className={th}>Template (task)</th><th className={th}>Status</th><th className={th}>Designer</th><th className={th}>Pages</th><th className={th}>Link template</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                    {rows.map((r) => (
                      <tr key={r.taskId} className="align-top">
                        <td className="px-4 py-3">
                          <span className="block font-bold text-gray-900 dark:text-white">{r.title}</span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">{[r.productionName, r.taskMonth].filter(Boolean).join(' · ')}</span>
                          {r.note && <span className="mt-0.5 block text-[11px] text-rose-700 dark:text-rose-400">Catatan: {r.note}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`whitespace-nowrap px-2 py-0.5 text-[11px] font-bold ${OUTCOME_VIEW[r.outcome].badge}`} title={r.statusName ?? undefined}>{OUTCOME_VIEW[r.outcome].label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.designerName ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="block font-bold text-gray-900 dark:text-white">{r.pages != null ? `${r.pages} hlm` : '—'}</span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">{r.doctypeName ?? ''}{r.assetPages ? `${r.doctypeName ? ' · ' : ''}aset di hlm ${r.assetPages}` : ''}</span>
                        </td>
                        <td className="px-4 py-3">
                          {r.templateUrl
                            ? <a href={r.templateUrl} target="_blank" rel="noreferrer" className="flex max-w-[200px] items-center gap-1 truncate font-semibold text-[#c2410c] hover:underline"><ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{r.templateUrl.replace(/^https?:\/\/(www\.)?/, '')}</span></a>
                            : <span className="text-gray-400">Belum ada link</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
