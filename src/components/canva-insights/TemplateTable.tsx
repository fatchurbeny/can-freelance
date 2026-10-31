'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Search } from 'lucide-react';
import type { InsightsData, TemplateLinkFilter, TemplateSort } from '@/lib/canva-insights/view';
import { delta, fmtDay, fmtNum, ratio, TONE_TEXT } from './format';

export interface TemplateFilters {
  link: TemplateLinkFilter;
  search: string;
  sort: TemplateSort;
  page: number;
  pageSize: number;
}

interface Props {
  data: NonNullable<InsightsData['templates']>;
  filters: TemplateFilters;
  onChange: (patch: Partial<TemplateFilters>) => void;
  scale: number;
}

const PAGE_SIZES = [10, 25, 50, 100];
const MATCH_LABEL: Record<string, string> = { title: 'cocok lewat judul', design_id: 'cocok lewat ID desain', manual: 'ditautkan manual' };

function SortHeader({ label, sort, active, onSort, align = 'left' }: { label: string; sort: TemplateSort; active: boolean; onSort: (s: TemplateSort) => void; align?: 'left' | 'right' }) {
  return (
    <th scope="col" aria-sort={active ? 'descending' : 'none'} className={`px-3 py-2.5 font-semibold ${align === 'right' ? 'text-right' : ''}`}>
      <button type="button" onClick={() => onSort(sort)} className={`inline-flex items-center gap-1 cursor-pointer ${active ? 'text-gray-900 dark:text-white' : 'hover:text-gray-900 dark:hover:text-white'}`}>
        {label}
        <ChevronDown className={`w-3 h-3 ${active ? '' : 'opacity-30'}`} aria-hidden="true" />
      </button>
    </th>
  );
}

export default function TemplateTable({ data, filters, onChange, scale }: Props) {
  const [search, setSearch] = useState(filters.search);
  useEffect(() => {
    if (search === filters.search) return;
    const t = setTimeout(() => onChange({ search, page: 1 }), 400);
    return () => clearTimeout(t);
  }, [search, filters.search, onChange]);

  const first = data.total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const last = Math.min(filters.page * filters.pageSize, data.total);
  const linkTabs: { value: TemplateLinkFilter; label: string }[] = [
    { value: 'all', label: `Semua · ${fmtNum(data.counts.all)}` },
    { value: 'linked', label: `Tertaut · ${fmtNum(data.counts.linked)}` },
    { value: 'unlinked', label: `Belum tertaut · ${fmtNum(data.counts.unlinked)}` },
  ];

  return (
    <section aria-labelledby="insights-templates" className="bg-white dark:bg-[#0d0e12]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#f0f0f0] dark:border-[#272a34]">
        <h3 id="insights-templates" className="text-sm font-bold text-gray-900 dark:text-white">Template</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
          <div role="group" aria-label="Filter tautan task" className="flex border border-[#e4e4e7] dark:border-[#272a34]">
            {linkTabs.map((t, i) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={filters.link === t.value}
                onClick={() => onChange({ link: t.value, page: 1 })}
                className={`h-9 px-3 cursor-pointer ${i ? 'border-l border-[#e4e4e7] dark:border-[#272a34]' : ''} ${
                  filters.link === t.value ? 'bg-[#262626] text-white dark:bg-white dark:text-black font-bold' : 'bg-white dark:bg-[#16181d] text-gray-700 dark:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="h-9 flex items-center gap-2 px-2.5 border border-[#e4e4e7] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500">
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sr-only">Cari judul template</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul template"
              className="w-48 bg-transparent outline-none text-gray-900 dark:text-gray-100"
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-xs font-sans">
          <thead>
            <tr className="bg-gray-50/70 dark:bg-[#16181d] text-left text-gray-500 dark:text-gray-400">
              <th scope="col" className="px-5 py-2.5 font-semibold">Template</th>
              <SortHeader label="Published" sort="published" active={filters.sort === 'published'} onSort={(s) => onChange({ sort: s, page: 1 })} />
              <SortHeader label="Applies" sort="applies" active={filters.sort === 'applies'} onSort={(s) => onChange({ sort: s, page: 1 })} align="right" />
              <SortHeader label="Usages" sort="usages" active={filters.sort === 'usages'} onSort={(s) => onChange({ sort: s, page: 1 })} align="right" />
              <th scope="col" className="px-3 py-2.5 font-semibold text-right">Usages / Applies</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Task · Designer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">Tidak ada template untuk filter ini.</td>
              </tr>
            )}
            {data.rows.map((t) => {
              const da = delta(t.applies, t.prevApplies, scale);
              return (
                <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      {t.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.thumbnailUrl} alt="" loading="lazy" className="w-14 h-8 object-cover bg-gray-100 dark:bg-[#20232b] shrink-0" />
                      ) : (
                        <div aria-hidden="true" className="w-14 h-8 bg-gray-100 dark:bg-[#20232b] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white truncate max-w-[360px]">{t.title ?? t.id}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                          <span className={`px-1.5 font-bold ${t.license === 'canva_pro' ? 'bg-amber-500/10 text-amber-800 dark:text-amber-400' : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'}`}>
                            {t.license === 'canva_pro' ? 'Pro' : t.license === 'none' ? 'Free' : '—'}
                          </span>
                          {t.pageCount ? <span className="text-gray-500 dark:text-gray-400">{t.pageCount} halaman</span> : null}
                          {t.isNew && <span className="px-1.5 font-bold bg-sky-500/10 text-sky-800 dark:text-sky-400">Baru</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-300">{t.publishedAt ? fmtDay(t.publishedAt.slice(0, 10), true) : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-gray-900 dark:text-white">
                    {fmtNum(t.applies)} {t.prevApplies > 0 && <span className={`ml-1 text-[10px] ${TONE_TEXT[da.tone]}`}>{da.text}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(t.usages)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{ratio(t.usages, t.applies)}</td>
                  <td className="px-5 py-2.5">
                    {t.taskName ? (
                      <div className="flex flex-col">
                        {t.taskUrl ? (
                          <a href={t.taskUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-gray-900 dark:text-white hover:underline">
                            {t.taskName} <ExternalLink className="w-3 h-3 text-gray-400" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="font-bold text-gray-900 dark:text-white">{t.taskName}</span>
                        )}
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {t.designer ?? 'Tanpa designer'}
                          {t.matchMethod ? ` · ${MATCH_LABEL[t.matchMethod] ?? t.matchMethod}` : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 text-[11px] bg-amber-500/10 text-amber-800 dark:text-amber-400">Belum tertaut</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-[#f0f0f0] dark:border-[#272a34] text-xs font-sans text-gray-500 dark:text-gray-400">
        <label className="flex items-center gap-2">
          Baris per halaman
          <select
            value={filters.pageSize}
            onChange={(e) => onChange({ pageSize: Number(e.target.value), page: 1 })}
            className="h-8 px-2 border border-[#e4e4e7] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-900 dark:text-gray-100"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <span className="tabular-nums">
            {fmtNum(first)}–{fmtNum(last)} dari {fmtNum(data.total)}
          </span>
          <button
            type="button"
            aria-label="Halaman sebelumnya"
            disabled={filters.page <= 1}
            onClick={() => onChange({ page: filters.page - 1 })}
            className="w-8 h-8 flex items-center justify-center border border-[#e4e4e7] dark:border-[#272a34] disabled:opacity-40 cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Halaman berikutnya"
            disabled={last >= data.total}
            onClick={() => onChange({ page: filters.page + 1 })}
            className="w-8 h-8 flex items-center justify-center border border-[#e4e4e7] dark:border-[#272a34] disabled:opacity-40 cursor-pointer disabled:cursor-default"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
