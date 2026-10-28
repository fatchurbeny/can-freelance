'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getCanvaInsightsAction } from '@/app/actions/canva-insights';
import { presetRange, type RangePreset } from '@/lib/canva-insights/range';
import type { InsightsAudience, InsightsData } from '@/lib/canva-insights/view';
import BrandCompareTable from './BrandCompareTable';
import InsightsKpis from './InsightsKpis';
import InsightsToolbar from './InsightsToolbar';
import InsightsTrendChart from './InsightsTrendChart';
import TemplateTable, { type TemplateFilters } from './TemplateTable';
import { brandStyle, fmtDay, fmtNum, fmtRange, relativeTime, RUN_LABEL } from './format';

const STORAGE_KEY = 'can_freelance_insights_filters';
const DEFAULT_TEMPLATES: TemplateFilters = { link: 'all', search: '', sort: 'published', page: 1, pageSize: 25 };

interface Saved {
  brandId: string;
  preset: RangePreset;
  audience: InsightsAudience;
}

function readSaved(): Partial<Saved> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Tab "Canva Insights" di Production (spek §7, desain https://claude.ai/artifact/DdcA2ANNvf8tK4VR6QEUVy). */
export default function CanvaInsightsTab({ productionUnitId }: { productionUnitId: string }) {
  const [brandId, setBrandId] = useState('all');
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [audience, setAudience] = useState<InsightsAudience>('all');
  const [custom, setCustom] = useState(() => presetRange('30d'));
  const [metric, setMetric] = useState<'applies' | 'usages'>('applies');
  const [tpl, setTpl] = useState<TemplateFilters>(DEFAULT_TEMPLATES);
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restored, setRestored] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const saved = readSaved();
    if (saved.brandId) setBrandId(saved.brandId);
    if (saved.preset && saved.preset !== 'custom') setPreset(saved.preset);
    if (saved.audience) setAudience(saved.audience);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ brandId, preset, audience }));
    } catch {
      // Penyimpanan filter opsional.
    }
  }, [restored, brandId, preset, audience]);

  const range = preset === 'custom' ? custom : presetRange(preset);

  useEffect(() => {
    if (!restored) return;
    const id = ++requestId.current;
    setLoading(true);
    getCanvaInsightsAction({
      productionUnitId,
      brandId,
      from: range.from,
      to: range.to,
      audience,
      templates: brandId === 'all' ? undefined : tpl,
    }).then((res) => {
      if (id !== requestId.current) return;
      setLoading(false);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else if (brandId !== 'all' && res.error.includes('Brand tidak terhubung')) {
        setBrandId('all');
      } else {
        setError(res.error);
      }
    });
  }, [restored, productionUnitId, brandId, range.from, range.to, audience, tpl]);

  const changeTemplates = useCallback((patch: Partial<TemplateFilters>) => setTpl((t) => ({ ...t, ...patch })), []);
  const selectBrand = (id: string) => {
    setBrandId(id);
    setTpl(DEFAULT_TEMPLATES);
  };

  const brands = data?.brands ?? [];
  const brandIndex = brands.findIndex((b) => b.brandId === brandId);
  const brand = brandIndex >= 0 ? brands[brandIndex] : null;
  const days = data?.range.days ?? [];
  const synced = brands.filter((b) => b.lastRun?.status === 'OK').length;
  const neverSynced = brands.filter((b) => !b.lastRun).map((b) => b.name);
  const audienceLabel = audience === 'all' ? 'Free & Pro' : audience === 'B' ? 'Free' : 'Pro';

  return (
    <div className="relative font-sans">
      <InsightsToolbar
        brands={brands}
        brandId={brandId}
        onBrandChange={selectBrand}
        audience={audience}
        onAudienceChange={setAudience}
        preset={preset}
        onPresetChange={setPreset}
        customFrom={custom.from}
        customTo={custom.to}
        onCustomChange={(from, to) => from && to && from <= to && setCustom({ from, to })}
        comparisonLabel={data ? fmtRange(data.range.prevFrom, data.range.prevTo) : null}
      />

      {loading && (
        <div className="absolute right-4 top-16 z-10 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Memuat…
        </div>
      )}

      {error && <p className="m-5 p-3 text-xs border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400">{error}</p>}

      {data && brands.length === 0 && (
        <p className="m-5 text-xs text-gray-500 dark:text-gray-400">
          Belum ada akun brand dengan Canva brand ID di production ini. Isi <code className="font-mono">Account.canvaBrandId</code> lewat scripts/seed-canva-brands.ts.
        </p>
      )}

      {data && brands.length > 0 && !brand && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <InsightsKpis
            brands={brands}
            fourth={{
              label: 'Brand tersinkron',
              value: `${synced} / ${brands.length}`,
              pill: neverSynced.length ? 'Perlu sinkron' : 'Lengkap',
              sub: neverSynced.length ? `${neverSynced.join(', ')} belum pernah sinkron` : 'Semua brand pernah sinkron',
            }}
          />
          <InsightsTrendChart
            title="Tren harian per brand"
            subtitle={`${metric === 'applies' ? 'Applies' : 'Usages'} per hari (${audienceLabel}), ${fmtRange(data.range.from, data.range.to)}`}
            days={days}
            metric={{ value: metric, onChange: setMetric }}
            lines={brands
              .map((b, i) => ({ b, style: brandStyle(i) }))
              .filter(({ b }) => b.hasData)
              .map(({ b, style }) => ({ key: b.brandId, name: b.name, color: style.color, dash: style.dash, values: b.series[metric] }))}
          />
          <BrandCompareTable brands={brands} onSelect={selectBrand} />
        </div>
      )}

      {data && brand && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-[#f0f0f0] dark:border-[#272a34] text-xs">
            <span className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm">
              <span aria-hidden="true" className="w-3 h-3" style={{ background: brandStyle(brandIndex).color }} />
              {brand.name}
              <span className="font-mono text-[11px] font-normal text-gray-500">{brand.brandId}</span>
              {brand.tier && <span className="text-[11px] font-normal text-gray-500">· tier {brand.tier}</span>}
            </span>
            <span className={brand.stale ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}>
              {brand.lastRun
                ? `Sinkron terakhir ${relativeTime(brand.lastRun.at)} · ${RUN_LABEL[brand.lastRun.status] ?? brand.lastRun.status}${brand.lastRun.host ? ` · ${brand.lastRun.host}` : ''}`
                : 'Belum pernah sinkron: buka dashboard Creator brand ini dan klik Sinkronkan di extension'}
            </span>
          </div>
          <InsightsKpis
            brands={[brand]}
            fourth={{
              label: 'Template',
              value: fmtNum(data.templates?.counts.all ?? 0),
              pill: `${fmtNum(data.templates?.counts.linked ?? 0)} tertaut`,
              sub: `${fmtNum(data.templates?.counts.unlinked ?? 0)} belum tertaut ke task`,
            }}
          />
          <InsightsTrendChart
            title="Applies & Usages harian"
            subtitle={`${audienceLabel} · data 7 hari terakhir masih bisa bertambah (mulai ${days.length ? fmtDay(days[Math.max(0, days.length - 7)]) : '—'})`}
            days={days}
            lines={[
              { key: 'applies', name: 'Applies', color: brandStyle(brandIndex).color, values: brand.series.applies },
              { key: 'usages', name: 'Usages', color: '#64748b', dash: '7 5', values: brand.series.usages },
            ]}
          />
          {data.templates && <TemplateTable data={data.templates} filters={tpl} onChange={changeTemplates} />}
        </div>
      )}
    </div>
  );
}
