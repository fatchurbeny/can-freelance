"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SelectDropdown from '@/components/SelectDropdown';
import InfoTip from '@/components/InfoTip';
import { CategoryIcon, CategoryIllustration } from '@/components/assets/CategoryArt';
import { coverSrc } from '@/components/assets/asset-ui';
import type { AssetReport, AssetReportRow, QualityFlag } from '@/lib/asset-report';
import AssetUsageDrawer from './AssetUsageDrawer';

interface Props {
  report: AssetReport;
  units: { id: string; name: string }[];
  filters: { categoryId: string | null; productionUnitId: string | null; period: string; days: number | null };
}

type RowFilter = 'all' | 'check' | 'unused';

const cell = 'h-10 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] text-xs';
const th = 'px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400';
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);

export const OUTCOME_VIEW = {
  approved: { label: 'Approved', bar: 'bg-[#00a67d]', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  profileOnly: { label: 'Profile only', bar: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  reject: { label: 'Reject', bar: 'bg-rose-600', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' },
  inProgress: { label: 'Dikerjakan', bar: 'bg-gray-300 dark:bg-[#343846]', badge: 'bg-gray-100 text-gray-600 dark:bg-[#20232b] dark:text-gray-300' },
} as const;

export const FLAG_VIEW: Record<QualityFlag, { label: string; className: string }> = {
  check: { label: 'Perlu dicek', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' },
  ok: { label: 'Aman', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  insufficient: { label: 'Data belum cukup', className: 'bg-gray-100 text-gray-600 dark:bg-[#20232b] dark:text-gray-300' },
  unused: { label: 'Belum dipakai', className: 'bg-gray-100 text-gray-500 dark:bg-[#20232b] dark:text-gray-400' },
};

function change(now: number, prev: number | null) {
  if (prev == null) return null;
  if (prev === 0) return now > 0 ? { text: 'baru di periode ini', up: true } : null;
  const diff = Math.round(((now - prev) / prev) * 100);
  return { text: `${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)}% vs periode sebelumnya`, up: diff >= 0 };
}

/** Bar status bertumpuk: Approved / Profile only / Reject / Dikerjakan. */
export function OutcomeBar({ counts, className = 'h-3' }: { counts: { approved: number; profileOnly: number; reject: number; inProgress: number }; className?: string }) {
  const total = counts.approved + counts.profileOnly + counts.reject + counts.inProgress;
  if (!total) return <div className={`${className} w-full bg-gray-100 dark:bg-[#20232b]`} />;
  return (
    <div className={`${className} flex w-full`}>
      {(['approved', 'profileOnly', 'reject', 'inProgress'] as const).map((k) => counts[k] > 0 && (
        <span key={k} className={OUTCOME_VIEW[k].bar} style={{ width: `${(counts[k] / total) * 100}%` }} title={`${OUTCOME_VIEW[k].label}: ${counts[k]}`} />
      ))}
    </div>
  );
}

export default function AssetReportClient({ report, units, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rowFilter, setRowFilter] = useState<RowFilter>('all');
  const openAssetId = searchParams.get('asset');
  // Drawer di-portal ke body: render setelah mount agar tautan langsung ?asset= tidak bikin hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const categoryHref = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('asset');
    if (id) params.set('category', id); else params.delete('category');
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const { kpi } = report;
  const done = kpi.approved + kpi.profileOnly + kpi.reject;
  const appliesChange = change(kpi.applies, kpi.prevApplies);
  const usagesChange = change(kpi.approved, kpi.prevUsages);
  const checkRows = report.rows.filter((r) => r.flag === 'check');
  const unusedRows = report.rows.filter((r) => r.flag === 'unused');
  const visibleRows = useMemo(
    () => report.rows.filter((r) => (rowFilter === 'check' ? r.flag === 'check' : rowFilter === 'unused' ? r.flag === 'unused' : true)),
    [report.rows, rowFilter],
  );
  const title = report.category?.name ?? 'Semua aset';
  const share = (n: number) => (done ? `${Math.round((n / done) * 100)}% dari template selesai` : 'Belum ada template selesai');

  const kpis = [
    { label: 'Applies', value: kpi.applies, note: appliesChange?.text ?? 'Aset dipakai di brief', tone: appliesChange ? (appliesChange.up ? 'up' : 'down') : 'muted', info: 'Satu aset di section Assets satu brief task = 1 apply, dihitung dari tanggal pertama dipakai.' },
    { label: 'Usages (approved)', value: kpi.approved, note: usagesChange?.text ?? 'Template approved', tone: usagesChange ? (usagesChange.up ? 'up' : 'down') : 'muted', info: 'Apply yang template-nya berstatus Approved.' },
    { label: 'Profile only', value: kpi.profileOnly, note: share(kpi.profileOnly), tone: 'muted', info: null },
    { label: 'Reject', value: kpi.reject, note: share(kpi.reject), tone: 'muted', info: null },
    { label: 'Aset dipakai', value: `${kpi.assetsUsed} / ${kpi.assetsTotal}`, note: `${kpi.assetsTotal - kpi.assetsUsed} belum pernah dipakai`, tone: 'muted', info: null },
  ];
  const toneClass = { up: 'text-emerald-700 dark:text-emerald-400', down: 'text-rose-700 dark:text-rose-400', muted: 'text-gray-500 dark:text-gray-400' } as const;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 font-sans">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {report.category && <CategoryIcon name={report.category.name} className="h-6 w-6" />}
            {title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pemakaian aset di brief dan status template hasilnya.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="w-[190px]">
            <SelectDropdown label="Production" value={filters.productionUnitId ?? ''} onChange={(v) => setParam('production', v || null)} buttonClassName={cell}
              options={[{ value: '', label: 'Semua production' }, ...units.map((u) => ({ value: u.id, label: u.name }))]} />
          </div>
          <div className="w-[160px]">
            <SelectDropdown label="Periode" value={filters.period} onChange={(v) => setParam('days', v === '30' ? null : v)} buttonClassName={cell}
              options={[{ value: '30', label: '30 hari terakhir' }, { value: '90', label: '90 hari terakhir' }, { value: 'all', label: 'Semua waktu' }]} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 border border-[#f0f0f0] bg-white dark:border-[#272a34] dark:bg-[#0d0e12] md:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-1.5 border-b border-r border-[#f0f0f0] px-5 py-4 dark:border-[#272a34] md:border-b-0">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
              {k.label}{k.info && <InfoTip label={k.label}>{k.info}</InfoTip>}
            </span>
            <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{k.value}</span>
            <span className={`text-[11px] font-semibold ${toneClass[k.tone as keyof typeof toneClass]}`}>{k.note}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="flex flex-col gap-2 border border-[#f0f0f0] bg-white p-5 dark:border-[#272a34] dark:bg-[#0d0e12] lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Applies &amp; Usages per minggu</h2>
            <span className="flex gap-3 text-[11px] text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-gray-300 dark:bg-[#4b5160]" />Applies</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-[#ff5e1f]" />Usages (approved)</span>
            </span>
          </div>
          {report.weekly.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center text-xs text-gray-400">Belum ada aset yang dipakai di brief pada periode ini.</div>
          ) : (
            <div className="h-[180px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.weekly} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156,163,175,0.15)" />
                  <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(156,163,175,0.08)' }} contentStyle={{ fontSize: 12, borderRadius: 0 }} />
                  <Bar dataKey="applies" name="Applies" fill="#d1d5db" />
                  <Bar dataKey="usages" name="Usages (approved)" fill="#ff5e1f" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="flex flex-col gap-3 border border-[#f0f0f0] bg-white p-5 dark:border-[#272a34] dark:bg-[#0d0e12]">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Status template {report.category ? `yang memakai ${report.category.name}` : 'yang memakai aset'}</h2>
          <OutcomeBar counts={kpi} className="h-3.5" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-700 dark:text-gray-300">
            {(['approved', 'profileOnly', 'reject', 'inProgress'] as const).map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 ${OUTCOME_VIEW[k].bar}`} />
                {OUTCOME_VIEW[k].label} · {kpi.applies ? `${Math.round((kpi[k] / kpi.applies) * 100)}%` : '0%'}
              </span>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            Bermasalah (Profile only + Reject): <strong className="text-gray-900 dark:text-white">{pct(done ? (kpi.profileOnly + kpi.reject) / done : null)}</strong>
            {report.category && <> · rata-rata semua aset {pct(report.overallProblemRate)}</>}
          </p>
        </section>
      </div>

      {!report.category && (
        <>
          <section className="border border-[#f0f0f0] bg-white dark:border-[#272a34] dark:bg-[#0d0e12]">
            <div className="flex items-baseline justify-between border-b border-[#f0f0f0] px-5 py-3 dark:border-[#272a34]">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Perbandingan kategori</h2>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Rata-rata bermasalah semua aset {pct(report.overallProblemRate)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-gray-50/50 dark:bg-[#16181d]/50">
                  <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
                    <th className={th}>Kategori</th><th className={`${th} text-right`}>Aset dipakai</th><th className={`${th} text-right`}>Applies</th>
                    <th className={`${th} w-[30%]`}>Status template</th><th className={`${th} text-right`}>Bermasalah</th><th className={th}>Perlu dicek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                  {report.categories.map((c) => {
                    const high = c.problemRate != null && report.overallProblemRate != null && c.problemRate > report.overallProblemRate + 0.05;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-[#16181d]">
                        <td className="px-4 py-3"><Link href={categoryHref(c.id)} className="flex items-center gap-2 font-bold text-gray-900 hover:text-[#ff5e1f] dark:text-white"><CategoryIcon name={c.name} className="h-4 w-4 shrink-0" />{c.name}</Link></td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{c.assetsUsed} / {c.assetsTotal}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-white">{c.applies}</td>
                        <td className="px-4 py-3"><OutcomeBar counts={c} /></td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${high ? 'text-rose-700 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}`}>{pct(c.problemRate)}</td>
                        <td className="px-4 py-3">{c.checkCount > 0 ? <span className={`px-2 py-0.5 text-[11px] font-bold ${FLAG_VIEW.check.className}`}>{c.checkCount} aset</span> : <span className="text-gray-400">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MiniList title="Paling sering dipakai" rows={report.rows.filter((r) => r.applies > 0).slice(0, 5)} right={(r) => `${r.applies} applies`} onOpen={(id) => setParam('asset', id)} empty="Belum ada aset yang dipakai." />
            <MiniList title="Perlu dicek (semua kategori)" rows={[...checkRows].sort((a, b) => (b.problemRate ?? 0) - (a.problemRate ?? 0)).slice(0, 5)}
              right={(r) => pct(r.problemRate)} rightClass={FLAG_VIEW.check.className} onOpen={(id) => setParam('asset', id)} empty="Tidak ada aset yang bermasalah jauh di atas rata-rata." />
          </div>
        </>
      )}

      <section className="border border-[#f0f0f0] bg-white dark:border-[#272a34] dark:bg-[#0d0e12]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f0f0] px-5 py-2.5 dark:border-[#272a34]">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
            {report.category ? `Aset ${report.category.name}` : 'Semua aset'}
            <InfoTip label="Kualitas">Perlu dicek = Profile only + Reject ≥ 40% dan ≥ rata-rata kategori + 15 poin. Dinilai setelah minimal 3 template selesai.</InfoTip>
          </h2>
          <div className="flex flex-wrap gap-1">
            {([['all', `Semua · ${report.rows.length}`], ['check', `Perlu dicek · ${checkRows.length}`], ['unused', `Belum dipakai · ${unusedRows.length}`]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setRowFilter(id)}
                className={`h-8 border px-3 text-xs cursor-pointer ${rowFilter === id ? 'border-gray-900 bg-gray-900 font-bold text-white dark:border-white dark:bg-white dark:text-gray-900' : 'border-[#f0f0f0] bg-white font-semibold text-gray-600 hover:text-gray-900 dark:border-[#272a34] dark:bg-[#0d0e12] dark:text-gray-300'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {visibleRows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <CategoryIllustration name={report.category?.name} className="h-28 w-36" />
            <p className="text-sm font-bold text-gray-900 dark:text-white">{report.rows.length === 0 ? 'Belum ada aset di kategori ini' : 'Tidak ada aset di filter ini'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-gray-50/50 dark:bg-[#16181d]/50">
                <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
                  <th className={th}>Aset</th>
                  <th className={`${th} text-right`}>Applies</th><th className={`${th} text-right`}>Approved</th><th className={`${th} text-right`}>Profile only</th>
                  <th className={`${th} text-right`}>Reject</th><th className={`${th} text-right`}>Proses</th><th className={th}>Kualitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                {visibleRows.map((r) => <AssetRowView key={r.id} row={r} showCategory={!report.category} onOpen={() => setParam('asset', r.id)} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mounted && openAssetId && (
        <AssetUsageDrawer
          assetId={openAssetId}
          filters={{ productionUnitId: filters.productionUnitId, days: filters.days }}
          onClose={() => setParam('asset', null)}
        />
      )}
    </div>
  );
}

function Cover({ row }: { row: Pick<AssetReportRow, 'coverUrl' | 'previewUrl'> }) {
  const src = coverSrc(row.coverUrl, row.previewUrl);
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt="" loading="lazy" className="h-9 w-12 shrink-0 border border-[#f0f0f0] object-cover dark:border-[#272a34]" />
    : <span className="h-9 w-12 shrink-0 border border-[#f0f0f0] bg-gray-100 dark:border-[#272a34] dark:bg-[#20232b]" />;
}

function AssetRowView({ row, showCategory, onOpen }: { row: AssetReportRow; showCategory: boolean; onOpen: () => void }) {
  const flag = FLAG_VIEW[row.flag];
  return (
    <tr className="hover:bg-gray-50/80 dark:hover:bg-[#16181d]">
      <td className="px-4 py-2.5">
        <button type="button" onClick={onOpen} className="flex items-center gap-3 text-left cursor-pointer">
          <Cover row={row} />
          <span>
            <span className="block font-bold text-gray-900 hover:text-[#ff5e1f] dark:text-white">{row.title}</span>
            {showCategory && <span className="text-[11px] text-gray-500 dark:text-gray-400">{row.categoryName}</span>}
          </span>
        </button>
      </td>
      <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">{row.applies}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{row.approved}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{row.profileOnly}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{row.reject}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-500 dark:text-gray-400">{row.inProgress}</td>
      <td className="px-4 py-2.5">
        <span className={`whitespace-nowrap px-2 py-0.5 text-[11px] font-bold ${flag.className}`}>
          {flag.label}{row.flag === 'check' && row.problemRate != null ? ` · ${Math.round(row.problemRate * 100)}% bermasalah` : ''}
        </span>
      </td>
    </tr>
  );
}

function MiniList({ title, rows, right, rightClass = 'text-gray-900 dark:text-white', onOpen, empty }: {
  title: string;
  rows: AssetReportRow[];
  right: (r: AssetReportRow) => string;
  rightClass?: string;
  onOpen: (id: string) => void;
  empty: string;
}) {
  return (
    <section className="border border-[#f0f0f0] bg-white dark:border-[#272a34] dark:bg-[#0d0e12]">
      <h2 className="border-b border-[#f0f0f0] px-5 py-3 text-sm font-bold text-gray-900 dark:border-[#272a34] dark:text-white">{title}</h2>
      {rows.length === 0 ? <p className="px-5 py-6 text-xs text-gray-400">{empty}</p> : (
        <ul className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 px-5 py-2 text-left text-xs hover:bg-gray-50/80 dark:hover:bg-[#16181d] cursor-pointer">
                <Cover row={r} />
                <span className="min-w-0 flex-1"><span className="block truncate font-bold text-gray-900 dark:text-white">{r.title}</span><span className="text-[11px] text-gray-500 dark:text-gray-400">{r.categoryName}</span></span>
                <span className={`px-2 py-0.5 font-bold ${rightClass}`}>{right(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
