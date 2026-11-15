'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { getElementLibraryAction, type ElementSetItem } from '@/app/actions/elements';
import { APP_BASE_PATH } from '@/lib/base-path';
import {
  buildElementsSection,
  ELEMENT_CATEGORIES,
  MAX_SETS_PER_CATEGORY,
  picksFromBody,
  type ElementCategoryKey,
  type ElementPick,
} from '@/lib/element-categories';

interface Props {
  body: string;
  onInsert: (sectionMarkdown: string) => void;
  onClose: () => void;
}

const thumbUrl = (mediaId: string) => `${APP_BASE_PATH}/api/elements/thumb/${encodeURIComponent(mediaId)}`;

/**
 * Panel "Ambil Elemen" di drawer Edit Design Brief (kontrak I-23): pilih set elemen katalog improstd
 * per kategori (maks. 4), lalu tulis section `## 🧩 Elemen`. Nama brand hanya tampil bila user boleh
 * melihat brand (`brands` tidak null).
 */
export default function ElementPicker({ body, onInsert, onClose }: Props) {
  const [sets, setSets] = useState<ElementSetItem[] | null>(null);
  const [brands, setBrands] = useState<{ id: string; name: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ElementCategoryKey | null>(null);
  const [brand, setBrand] = useState<string>('');
  const [picks, setPicks] = useState<ElementPick[]>(() => picksFromBody(body));

  useEffect(() => {
    let alive = true;
    getElementLibraryAction().then((res) => {
      if (!alive) return;
      if (!res.success) { setError(res.error); setSets([]); return; }
      setSets(res.sets);
      setBrands(res.brands);
    });
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => {
    const present = new Set((sets ?? []).map((s) => s.category));
    return (Object.keys(ELEMENT_CATEGORIES) as ElementCategoryKey[]).filter((k) => present.has(k));
  }, [sets]);
  const activeCategory = category ?? categories[0] ?? null;
  const visible = (sets ?? []).filter((s) => s.category === activeCategory && (!brand || s.brandId === brand));
  const countIn = (k: ElementCategoryKey) => picks.filter((p) => p.category === k).length;

  const toggle = (s: ElementSetItem) => {
    setPicks((prev) => {
      if (prev.some((p) => p.ref === s.ref && p.category === s.category)) return prev.filter((p) => !(p.ref === s.ref && p.category === s.category));
      if (prev.filter((p) => p.category === s.category).length >= MAX_SETS_PER_CATEGORY) return prev;
      return [...prev, { category: s.category, name: s.name, ref: s.ref }];
    });
  };

  return (
    <div className="border border-[#f0f0f0] bg-white font-sans dark:border-[#272a34] dark:bg-[#0d0e12]">
      <div className="flex items-center justify-between gap-3 border-b border-[#f0f0f0] px-4 py-3 dark:border-[#272a34]">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-gray-900 dark:text-white">🧩 Elemen dari katalog Deck</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Maks. {MAX_SETS_PER_CATEGORY} set per kategori · dipakai Deck saat brief dikirim</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Tutup picker elemen" className="flex size-8 shrink-0 items-center justify-center border border-[#f0f0f0] text-gray-500 hover:text-gray-900 dark:border-[#272a34] dark:hover:text-white cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      {sets === null ? (
        <div className="flex items-center gap-2 px-4 py-6 text-xs text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Memuat katalog…</div>
      ) : error ? (
        <div role="alert" className="m-4 border border-dashed border-rose-400 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>
      ) : categories.length === 0 ? (
        <p className="px-4 py-6 text-xs text-gray-500">Katalog elemen masih kosong. Kumpulkan elemen lewat Element Board dulu.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 border-b border-[#f0f0f0] px-4 py-3 dark:border-[#272a34]">
            {categories.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setCategory(k)}
                className={`h-8 border px-2.5 text-[11px] font-bold cursor-pointer ${k === activeCategory ? 'border-[#ff5e1f] text-[#ff5e1f]' : 'border-[#f0f0f0] text-gray-600 hover:text-gray-900 dark:border-[#272a34] dark:text-gray-300'}`}
              >
                {ELEMENT_CATEGORIES[k]}{countIn(k) ? ` · ${countIn(k)}` : ''}
              </button>
            ))}
            {brands && brands.length > 1 && (
              <select
                aria-label="Filter brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="ml-auto h-8 border border-[#f0f0f0] bg-white px-2 text-[11px] font-bold text-gray-700 outline-none dark:border-[#272a34] dark:bg-[#16181d] dark:text-gray-300"
              >
                <option value="">Semua brand</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </div>

          <div className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto p-4">
            {visible.map((s) => {
              const picked = picks.some((p) => p.ref === s.ref && p.category === s.category);
              const full = !picked && countIn(s.category) >= MAX_SETS_PER_CATEGORY;
              const brandName = brands?.find((b) => b.id === s.brandId)?.name;
              return (
                <button
                  key={`${s.category}:${s.ref}`}
                  type="button"
                  disabled={full}
                  onClick={() => toggle(s)}
                  aria-pressed={picked}
                  className={`relative flex flex-col border text-left transition-colors ${picked ? 'border-[#ff5e1f]' : 'border-[#f0f0f0] hover:border-gray-300 dark:border-[#272a34]'} ${full ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                >
                  <div className="grid aspect-square grid-cols-2 gap-px bg-[#f0f0f0] dark:bg-[#272a34]">
                    {Array.from({ length: 4 }, (_, i) => s.thumbs[i]).map((id, i) => (
                      <div key={i} className="flex items-center justify-center bg-white p-1.5 dark:bg-[#16181d]">
                        {id && <img src={thumbUrl(id)} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />}
                      </div>
                    ))}
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="truncate text-[11px] font-bold text-gray-900 dark:text-white">{s.name}</p>
                    <p className="truncate text-[10px] text-gray-500">{[s.style, `${s.count} elemen`, brandName].filter(Boolean).join(' · ')}</p>
                  </div>
                  {picked && <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center bg-[#ff5e1f] text-white"><Check className="h-3 w-3" /></span>}
                </button>
              );
            })}
            {visible.length === 0 && <p className="col-span-2 py-4 text-center text-xs text-gray-500">Tidak ada set untuk filter ini.</p>}
          </div>
        </>
      )}

      <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] border-t border-[#f0f0f0] dark:divide-[#272a34] dark:border-[#272a34]">
        <button type="button" onClick={() => setPicks([])} disabled={!picks.length} className="h-10 text-[11px] font-bold uppercase tracking-wider text-gray-600 hover:text-[#ff5e1f] disabled:opacity-40 dark:text-gray-300 cursor-pointer">
          Kosongkan pilihan
        </button>
        <button type="button" onClick={() => onInsert(buildElementsSection(picks))} className="h-10 bg-[#ff5e1f] text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] cursor-pointer">
          Simpan ke brief ({picks.length})
        </button>
      </div>
    </div>
  );
}
