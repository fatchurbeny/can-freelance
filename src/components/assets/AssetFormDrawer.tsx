"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Plus, RefreshCw, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import PortalSelect from '@/components/production-fields/PortalSelect';
import PortalMultiSelect from '@/components/production-fields/PortalMultiSelect';
import InfoTip from '@/components/InfoTip';
import { createAssetAction, fetchCanvaInfoAction, resolveCanvaLinkAction, updateAssetAction } from '@/app/actions/assets';
import { isCanvaShortLink, publicViewUrlError } from '@/lib/canva-url';
import { compressImageToWebP } from '@/lib/color-extractor';
import { APP_BASE_PATH } from '@/lib/base-path';
import type { AssetCategoryRow, AssetRow } from '@/lib/asset-library';
import CanvaEmbed from './CanvaEmbed';
import { coverSrc } from './asset-ui';
import type { UnitOption } from './AssetLibraryClient';

interface Props {
  asset: AssetRow | null;
  categories: AssetCategoryRow[];
  units: UnitOption[];
  defaultCategoryId?: string;
  notionConnected: boolean;
  onClose: () => void;
  onSaved: (assetId: string) => void;
}

const row = 'flex min-h-11 items-stretch text-xs';
const labelCell = 'flex w-[150px] shrink-0 items-center gap-2 whitespace-nowrap border-r border-[#f0f0f0] bg-gray-50/50 px-5 font-bold text-gray-500 select-none dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-400';
const input = 'h-full min-h-11 w-full rounded-none border-0 bg-gray-50/50 px-5 text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#ff5e1f] dark:bg-[#16181d]/50 dark:text-white dark:focus:bg-[#16181d]';
const smallBtn = 'flex h-10 items-center gap-1.5 border border-[#f0f0f0] bg-white px-3 text-xs font-bold text-gray-700 hover:text-[#ff5e1f] disabled:opacity-50 dark:border-[#272a34] dark:bg-[#0d0e12] dark:text-gray-300 cursor-pointer';

export default function AssetFormDrawer({ asset, categories, units, defaultCategoryId, notionConnected, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(asset?.title ?? '');
  const [categoryId, setCategoryId] = useState(asset?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '');
  const [unitIds, setUnitIds] = useState<string[]>(asset?.productionUnitIds ?? []);
  const [tags, setTags] = useState<string[]>(asset?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [editUrl, setEditUrl] = useState(asset?.editUrl ?? '');
  const [previewUrl, setPreviewUrl] = useState(asset?.previewUrl ?? '');
  const [coverUrl, setCoverUrl] = useState<string | null>(asset?.coverUrl ?? null);
  const [pages, setPages] = useState(asset?.pages != null ? String(asset.pages) : '');
  const [notes, setNotes] = useState(asset?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // canva.link (tombol Copy di Canva) diubah otomatis ke link desain lengkap lewat server
  const [resolving, setResolving] = useState<'preview' | 'edit' | null>(null);
  const [shortLinkError, setShortLinkError] = useState<string | null>(null);
  const [resolvedFromShort, setResolvedFromShort] = useState(false);

  useEffect(() => {
    const targets: ['preview' | 'edit', string, (v: string) => void][] = [
      ['preview', previewUrl, setPreviewUrl],
      ['edit', editUrl, setEditUrl],
    ];
    const pending = targets.find(([, value]) => isCanvaShortLink(value));
    if (!pending) return;
    const [field, value, set] = pending;
    let alive = true;
    const timer = setTimeout(async () => {
      setResolving(field);
      const res = await resolveCanvaLinkAction(value.trim());
      if (!alive) return;
      setResolving(null);
      if (!res.success) {
        if (field === 'preview') setShortLinkError(res.error);
        else toast.error(res.error);
        return;
      }
      if (field === 'preview') {
        setShortLinkError(null);
        setResolvedFromShort(true);
      }
      set(res.url);
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [previewUrl, editUrl]);

  const previewIsShort = isCanvaShortLink(previewUrl);
  const previewError = useMemo(() => {
    if (!previewUrl.trim()) return null;
    if (isCanvaShortLink(previewUrl)) return resolving === 'preview' ? null : shortLinkError;
    return publicViewUrlError(previewUrl);
  }, [previewUrl, resolving, shortLinkError]);
  const previewValid = !!previewUrl.trim() && !previewIsShort && !previewError;

  const addTag = (raw: string) => {
    const next = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (next.length) setTags((prev) => Array.from(new Set([...prev, ...next])));
    setTagDraft('');
  };

  const uploadCover = async (file: File) => {
    setCoverBusy(true);
    try {
      const blob = await compressImageToWebP(file, 1200, 900, 0.82);
      const body = new FormData();
      body.append('file', blob, 'cover.webp');
      const res = await fetch(`${APP_BASE_PATH}/api/upload`, { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.filename) throw new Error(data.error || 'Upload gagal');
      setCoverUrl(`/api/uploads/${data.filename}`);
    } catch (err: any) {
      toast.error(err?.message || 'Upload cover gagal');
    } finally {
      setCoverBusy(false);
    }
  };

  // Judul kosong: isi otomatis dari oEmbed Canva begitu public view link valid
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    if (!previewValid || titleRef.current.trim()) return;
    let alive = true;
    const timer = setTimeout(async () => {
      const res = await fetchCanvaInfoAction(previewUrl.trim());
      if (alive && res.success && res.title && !titleRef.current.trim()) setTitle(res.title);
    }, 400);
    return () => { alive = false; clearTimeout(timer); };
  }, [previewUrl, previewValid]);

  const save = () =>
    startTransition(async () => {
      setError(null);
      const allTags = tagDraft.trim() ? Array.from(new Set([...tags, ...tagDraft.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)])) : tags;
      const payload = {
        title,
        categoryId,
        tags: allTags,
        productionUnitIds: unitIds,
        editUrl: editUrl || null,
        previewUrl,
        coverUrl,
        pages: pages.trim() ? Number(pages) : null,
        notes: notes || null,
      };
      if (asset) {
        const res = await updateAssetAction(asset.id, payload);
        if (!res.success) { setError(res.error); return; }
        toast.success('Aset diperbarui');
        onSaved(asset.id);
        return;
      }
      const res = await createAssetAction(payload);
      if (!res.success) { setError(res.error); return; }
      toast.success('Aset ditambahkan');
      onSaved(res.id);
    });

  if (typeof window === 'undefined') return null;
  const cover = coverSrc(coverUrl, previewValid ? previewUrl.trim() : null);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label={asset ? 'Edit aset' : 'Tambah aset'}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={(e) => { e.preventDefault(); save(); }}
        className="relative flex h-full w-full max-w-140 flex-col border-l border-[#f0f0f0] bg-white font-sans shadow-2xl animate-[slideInRight_180ms_ease-out] dark:border-[#272a34] dark:bg-[#0d0e12]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#f0f0f0] bg-gray-50/50 px-5 py-4 dark:border-[#272a34] dark:bg-[#16181d]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#f0f0f0] bg-white text-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d]">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase text-gray-900 dark:text-white">{asset ? 'Edit Aset' : 'Tambah Aset'}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tempel link Canva; preview memakai public view link</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-8 shrink-0 items-center justify-center border border-[#f0f0f0] bg-white text-gray-500 hover:text-gray-900 dark:border-[#272a34] dark:bg-[#16181d] dark:hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 divide-y divide-[#f0f0f0] overflow-y-auto dark:divide-[#272a34]">
          <div className={row}>
            <label htmlFor="asset-title" className={labelCell}>Judul</label>
            <div className="flex-1"><input id="asset-title" value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="Nama aset" autoFocus /></div>
          </div>
          <div className={row}>
            <span className={labelCell}>Kategori</span>
            <div className="flex-1">
              <PortalSelect ariaLabel="Kategori" value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
            </div>
          </div>
          <div className={row}>
            <span className={labelCell}>Production</span>
            <div className="flex-1">
              <PortalMultiSelect
                ariaLabel="Production"
                values={unitIds}
                onChange={setUnitIds}
                emptyLabel="Semua production Canva"
                options={units.map((u) => ({ value: u.id, label: u.name }))}
              />
            </div>
          </div>
          <div className={row}>
            <label htmlFor="asset-tags" className={labelCell}>Tag</label>
            <div className="flex flex-1 flex-wrap items-center gap-1.5 bg-gray-50/50 px-5 py-2 dark:bg-[#16181d]/50">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 border border-[#ebebeb] bg-white px-1.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-[#272a34] dark:bg-[#0d0e12] dark:text-gray-300">
                  {t}
                  <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} aria-label={`Hapus tag ${t}`} className="text-gray-400 hover:text-[#ff5e1f] cursor-pointer"><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input
                id="asset-tags"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagDraft); }
                  if (e.key === 'Backspace' && !tagDraft && tags.length) setTags((prev) => prev.slice(0, -1));
                }}
                onBlur={() => tagDraft.trim() && addTag(tagDraft)}
                placeholder="Tambah tag, Enter"
                className="min-w-[120px] flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:bg-[#0d0e12]">Link Canva</div>

          <div className={row}>
            <label htmlFor="asset-edit" className={labelCell}>Link Edit<InfoTip label="Link Edit">Link …/edit untuk tombol Buka di Canva; perlu login akun tim.</InfoTip></label>
            <div className="flex-1"><input id="asset-edit" type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className={input} placeholder="https://www.canva.com/design/…/edit" /></div>
          </div>
          <div className="flex flex-col">
            <div className={row}>
              <label htmlFor="asset-view" className={labelCell}>Public View<InfoTip label="Public View">Link canva.link atau …/design/…/view. Dipakai untuk preview tanpa login; canva.link diubah otomatis ke link lengkap.</InfoTip></label>
              <div className="flex-1">
                <input
                  id="asset-view"
                  type="url"
                  value={previewUrl}
                  onChange={(e) => { setPreviewUrl(e.target.value); setShortLinkError(null); setResolvedFromShort(false); }}
                  aria-invalid={!!previewError}
                  aria-describedby={previewError ? 'asset-view-error' : undefined}
                  className={`${input} ${previewError ? 'bg-orange-50 ring-1 ring-inset ring-[#ff5e1f] dark:bg-[#ff5e1f]/10' : ''}`}
                  placeholder="https://canva.link/… atau …/design/…/view"
                />
              </div>
            </div>
            {resolving === 'preview' && (
              <div className="flex items-center gap-2 border-t border-[#f0f0f0] bg-gray-50/60 px-5 py-2.5 text-xs text-gray-600 dark:border-[#272a34] dark:bg-[#16181d]/60 dark:text-gray-300">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#ff5e1f]" /> Membuka canva.link…
              </div>
            )}
            {resolvedFromShort && !previewError && (
              <div className="border-t border-[#f0f0f0] bg-gray-50/60 px-5 py-2 text-[11px] text-gray-500 dark:border-[#272a34] dark:bg-[#16181d]/60 dark:text-gray-400">
                Link canva.link diubah otomatis ke link desain lengkap.
              </div>
            )}
                        {previewError && (
              <div id="asset-view-error" className="flex gap-2.5 border-t border-orange-200 bg-orange-50 px-5 py-2.5 text-xs leading-relaxed text-orange-900 dark:border-[#ff5e1f]/30 dark:bg-[#ff5e1f]/10 dark:text-orange-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{previewError}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 px-5 py-4">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Cek preview</span>
            {previewValid ? (
              <CanvaEmbed previewUrl={previewUrl.trim()} title={title || 'Aset baru'} />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-[#1f2026] text-xs font-semibold text-gray-400">Preview muncul setelah public view link valid</div>
            )}
          </div>

          <div className={row}>
            <span className={labelCell}>Cover<InfoTip label="Cover">Otomatis memakai thumbnail halaman pertama dari Canva. Upload bila ingin cover lain.</InfoTip></span>
            <div className="flex flex-1 flex-wrap items-center gap-2 px-5 py-2.5">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="Cover aset" className="h-16 w-24 border border-[#f0f0f0] object-cover dark:border-[#272a34]" />
              ) : (
                <span className="flex h-16 w-24 items-center justify-center border border-dashed border-[#e5e5e5] text-[10px] text-gray-400 dark:border-[#272a34]">Belum ada</span>
              )}
              <button type="button" onClick={() => fileRef.current?.click()} disabled={coverBusy} className={smallBtn}>
                {coverBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload gambar
              </button>
              {coverUrl && (
                <button type="button" onClick={() => setCoverUrl(null)} className={`${smallBtn} text-[#ff5e1f]`}>
                  <X className="h-3.5 w-3.5" /> Pakai thumbnail Canva
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ''; }}
              />
            </div>
          </div>
          <div className={row}>
            <label htmlFor="asset-pages" className={labelCell}>Jumlah Halaman</label>
            <div className="flex-1"><input id="asset-pages" type="number" min={0} value={pages} onChange={(e) => setPages(e.target.value)} className={input} placeholder="0" /></div>
          </div>
          <div className="flex min-h-24 items-stretch text-xs">
            <label htmlFor="asset-notes" className={`${labelCell} items-start pt-3`}>Catatan</label>
            <div className="flex-1">
              <textarea
                id="asset-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Petunjuk pemakaian untuk designer"
                className="h-full min-h-24 w-full resize-none rounded-none border-0 bg-gray-50/50 px-5 py-3 text-xs font-medium text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#ff5e1f] dark:bg-[#16181d]/50 dark:text-white dark:focus:bg-[#16181d]"
              />
            </div>
          </div>
        </div>

        {error && <div className="shrink-0 border-t border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <div className="flex shrink-0 items-center gap-2 border-t border-[#f0f0f0] bg-gray-50/50 px-5 py-2.5 text-xs text-gray-600 dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-300">
          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
          {notionConnected
            ? <span>Setelah disimpan, aset juga dibuat sebagai page di database Notion <strong>Asset Library</strong>, lengkap dengan embed preview Canva.</span>
            : <span>Database Notion Asset Library belum terhubung; aset dikirim setelah dihubungkan di Notion Config.</span>}
        </div>
        <div className="grid shrink-0 grid-cols-2 divide-x divide-[#f0f0f0] border-t border-[#f0f0f0] dark:divide-[#272a34] dark:border-[#272a34]">
          <button type="button" onClick={onClose} className="w-full bg-gray-50/50 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:bg-[#16181d]/50 dark:text-gray-300 dark:hover:bg-[#16181d] cursor-pointer">Batal</button>
          <button type="submit" disabled={pending || coverBusy} className="w-full bg-[#ff5e1f] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-60 cursor-pointer">
            {pending ? 'Menyimpan…' : 'Simpan Aset'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
