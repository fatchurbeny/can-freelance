"use client";

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { getAssetsByUrlsAction } from '@/app/actions/assets';
import type { BriefAssetRef } from '@/lib/asset-brief';
import { parseCanvaUrl } from '@/lib/canva-url';
import CanvaEmbed from './CanvaEmbed';
import { coverSrc } from './asset-ui';

type AssetInfo = { designId: string | null; title: string; categoryName: string; coverUrl: string | null; previewUrl: string; editUrl: string | null; status: string };

/** Isi kartu "Assets" di preview Design Brief: daftar aset + preview Canva inline. */
export default function BriefAssetsList({ refs }: { refs: BriefAssetRef[] }) {
  const [info, setInfo] = useState<Map<string, AssetInfo>>(new Map());
  const [open, setOpen] = useState<number | null>(null);
  const urlsKey = refs.map((r) => r.url).join('\n');

  useEffect(() => {
    let alive = true;
    const urls = urlsKey ? urlsKey.split('\n') : [];
    if (urls.length === 0) return;
    getAssetsByUrlsAction(urls).then((res) => {
      if (!alive || !res.success) return;
      setInfo(new Map(res.assets.filter((a) => a.designId).map((a) => [a.designId!, a])));
    });
    return () => { alive = false; };
  }, [urlsKey]);

  const rows = useMemo(() => refs.map((ref) => ({ ref, asset: info.get(parseCanvaUrl(ref.url)?.designId ?? '') ?? null })), [refs, info]);

  if (refs.length === 0) return <p className="p-4 text-xs text-gray-500">Belum ada aset.</p>;

  return (
    <ul className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
      {rows.map(({ ref, asset }, i) => {
        const cover = coverSrc(asset?.coverUrl, asset?.previewUrl ?? ref.url);
        return (
          <li key={`${ref.url}-${i}`}>
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div className="h-[54px] w-[72px] shrink-0 overflow-hidden bg-[#ffe8dd] dark:bg-[#3a2418]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {cover && <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-xs font-bold text-gray-900 dark:text-white">{asset?.title ?? ref.title}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {asset ? `${asset.categoryName} · ` : ''}{ref.pages ? `pakai hlm ${ref.pages}` : 'semua halaman'}
                  {asset?.status === 'archived' ? ' · diarsipkan' : ''}
                </span>
              </div>
              {asset?.editUrl && (
                <a href={asset.editUrl} target="_blank" rel="noopener noreferrer" title="Buka di Canva (perlu login akun tim)" aria-label={`Buka ${asset.title} di Canva`} className="flex size-8 items-center justify-center text-gray-400 hover:text-[#ff5e1f]">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setOpen((prev) => (prev === i ? null : i))}
                aria-expanded={open === i}
                className="flex items-center gap-1 px-1 py-2 text-xs font-bold text-[#ff5e1f] hover:underline cursor-pointer"
              >
                Preview {open === i ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            {open === i && (
              <div className="px-4 pb-3"><CanvaEmbed previewUrl={ref.url} title={asset?.title ?? ref.title} /></div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
