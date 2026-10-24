"use client";

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Search, X } from 'lucide-react';
import { getAssetLibraryAction } from '@/app/actions/assets';
import type { AssetCategoryRow, AssetRow } from '@/lib/asset-library';
import { buildAssetSection, parseAssetSection, type BriefAssetRef } from '@/lib/asset-brief';
import { parseCanvaUrl } from '@/lib/canva-url';
import CanvaEmbed from './CanvaEmbed';
import { coverSrc, coverTint } from './asset-ui';

interface Props {
  /** Markdown brief saat ini; aset di section Assets jadi pilihan awal. */
  body: string;
  /** Production task: hanya aset untuk production ini (non-Canva → kosong). */
  productionUnitId?: string;
  /** Section Assets baru (kosong = hapus section). */
  onInsert: (sectionMarkdown: string) => void;
  onClose: () => void;
}

const designIdOf = (url: string) => parseCanvaUrl(url)?.designId ?? url;

/**
 * Panel "Ambil dari Library" di dalam drawer Edit Design Brief (tetap 2 stage, bukan drawer ketiga).
 * Lihat = preview Canva inline di baris itu.
 */
export default function AssetPicker({ body, productionUnitId, onInsert, onClose }: Props) {
  const [categories, setCategories] = useState<AssetCategoryRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canvaOnly, setCanvaOnly] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const current = useMemo(() => parseAssetSection(body), [body]);
  // assetId → halaman yang dipakai ('' = semua)
  const [selected, setSelected] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let alive = true;
    getAssetLibraryAction(productionUnitId ?? null).then((res) => {
      if (!alive) return;
      if (!res.success) { setError(res.error); setAssets([]); return; }
      setCanvaOnly(res.canvaOnly);
      setCategories(res.categories);
      setAssets(res.assets);
      const byDesign = new Map(res.assets.map((a) => [designIdOf(a.previewUrl), a.id]));
      setSelected(new Map(current.flatMap((ref) => {
        const id = byDesign.get(designIdOf(ref.url));
        return id ? [[id, ref.pages ?? ''] as [string, string]] : [];
      })));
    });
    return () => { alive = false; };
    // Pilihan awal hanya dibaca sekali saat panel dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryIndex = useMemo(() => new Map(categories.map((c, i) => [c.id, i])), [categories]);

  // Baris di brief yang tidak ada di library tetap dipertahankan apa adanya
  const unmatched = useMemo<BriefAssetRef[]>(() => {
    if (!assets) return [];
    const known = new Set(assets.map((a) => designIdOf(a.previewUrl)));
    return current.filter((ref) => !known.has(designIdOf(ref.url)));
  }, [assets, current]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (assets ?? []).filter((a) => {
      if (tab !== 'all' && a.categoryId !== tab) return false;
      return !q || `${a.title} ${a.tags.join(' ')}`.toLowerCase().includes(q);
    });
  }, [assets, query, tab]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, '');
      return next;
    });

  const setPages = (id: string, pages: string) => setSelected((prev) => new Map(prev).set(id, pages));

  const insert = () => {
    const picked = (assets ?? [])
      .filter((a) => selected.has(a.id))
      .map((a) => ({ title: a.title, url: a.previewUrl, pages: selected.get(a.id)?.trim() || null }));
    const items = [...picked, ...unmatched];
    onInsert(items.length ? buildAssetSection(items) : '');
  };

  return (
    <div role="dialog" aria-label="Pilih aset dari Library" className="flex flex-col border border-[#e5e5e5] bg-white shadow-xl dark:border-[#272a34] dark:bg-[#0d0e12]">
      <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-2.5 dark:border-[#272a34]">
        <span className="text-[13px] font-bold text-gray-900 dark:text-white">Ambil dari Library</span>
        <button type="button" onClick={onClose} aria-label="Tutup pilihan aset" className="flex size-7 items-center justify-center text-gray-400 hover:text-[#ff5e1f] cursor-pointer"><X className="h-4 w-4" /></button>
      </div>
      <label className="flex min-h-11 items-center gap-2.5 border-b border-[#f0f0f0] px-4 dark:border-[#272a34]">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari di Asset Library…"
          aria-label="Cari aset"
          autoFocus
          className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400"
        />
      </label>
      <div role="tablist" aria-label="Kategori" className="flex overflow-x-auto border-b border-[#f0f0f0] bg-[#f8f9fa] dark:border-[#272a34] dark:bg-[#0d0e12] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {[{ id: 'all', name: 'Semua' }, ...categories].map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={tab === c.id}
            onClick={() => setTab(c.id)}
            className={`relative shrink-0 whitespace-nowrap border-r border-[#f0f0f0] px-3.5 py-2.5 text-xs dark:border-[#272a34] cursor-pointer ${tab === c.id ? 'bg-white font-bold text-gray-900 dark:bg-[#16181d] dark:text-white' : 'font-medium text-gray-600 hover:bg-[#f0f1f3] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#16181d]/50 dark:hover:text-gray-200'}`}
          >
            {c.name}
            {tab === c.id && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ff5e1f]" />}
          </button>
        ))}
      </div>

      <div className="max-h-[50vh] min-h-[120px] overflow-y-auto">
        {assets === null ? (
          <div className="flex items-center gap-2 px-4 py-6 text-xs text-gray-500"><RefreshCw className="h-4 w-4 animate-spin text-[#ff5e1f]" /> Memuat Asset Library…</div>
        ) : error ? (
          <div className="px-4 py-6 text-xs font-semibold text-rose-600">{error}</div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-500">
            {!canvaOnly ? 'Asset Library berisi aset Canva, hanya untuk production berplatform Canva.' : assets.length === 0 ? 'Belum ada aset untuk production ini.' : 'Tidak ada aset yang cocok.'}
          </div>
        ) : (
          <ul className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
            {visible.map((a) => {
              const isSelected = selected.has(a.id);
              const cover = coverSrc(a.coverUrl, a.previewUrl);
              return (
                <li key={a.id} className={isSelected ? 'bg-[#ff5e1f]/5' : ''}>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(a.id)}
                      aria-label={`Pilih ${a.title}`}
                      className="size-4 shrink-0 accent-[#ff5e1f] cursor-pointer"
                    />
                    <button type="button" onClick={() => toggle(a.id)} tabIndex={-1} aria-hidden className={`h-[42px] w-14 shrink-0 overflow-hidden ${cover ? '' : coverTint(categoryIndex.get(a.categoryId) ?? 0)} cursor-pointer`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-xs font-bold text-gray-900 dark:text-white">{a.title}</span>
                      {isSelected ? (
                        <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                          Halaman:
                          <input
                            value={selected.get(a.id) ?? ''}
                            onChange={(e) => setPages(a.id, e.target.value)}
                            placeholder="semua"
                            aria-label={`Halaman yang dipakai dari ${a.title}`}
                            className="w-24 border border-[#e5e5e5] bg-white px-1.5 py-0.5 text-[11px] font-semibold outline-none focus:border-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d]"
                          />
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">{a.categoryName}{a.pages != null ? ` · ${a.pages} hlm` : ''}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewId((prev) => (prev === a.id ? null : a.id))}
                      aria-expanded={previewId === a.id}
                      className="flex items-center gap-1 px-1 py-2 text-xs font-bold text-[#ff5e1f] hover:underline cursor-pointer"
                    >
                      Lihat {previewId === a.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                  {previewId === a.id && (
                    <div className="px-4 pb-3">
                      <CanvaEmbed previewUrl={a.previewUrl} title={a.title} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {unmatched.length > 0 && (
        <p className="border-t border-[#f0f0f0] px-4 py-2 text-[11px] text-gray-500 dark:border-[#272a34] dark:text-gray-400">
          {unmatched.length} link di brief tidak ada di library dan tetap dipertahankan.
        </p>
      )}
      <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] border-t border-[#f0f0f0] dark:divide-[#272a34] dark:border-[#272a34]">
        <button type="button" onClick={onClose} className="py-3 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#16181d] cursor-pointer">Batal</button>
        <button
          type="button"
          onClick={insert}
          disabled={assets === null}
          className="bg-[#ff5e1f] py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-50 cursor-pointer"
        >
          Sisipkan ({selected.size})
        </button>
      </div>
    </div>
  );
}
