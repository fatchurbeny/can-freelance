"use client";

import { useMemo, useState, useTransition } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import SelectDropdown from '@/components/SelectDropdown';
import PortalSelect from '@/components/production-fields/PortalSelect';
import InfoTip from '@/components/InfoTip';
import { importNotionAssetsAction, previewNotionAssetImportAction } from '@/app/actions/assets';
import type { ImportPreview, ImportRowStatus } from '@/lib/notion-asset-import';

interface Props {
  /** Database terdaftar di Pages & Databases (bukan database task / mirror aset). */
  candidates: { id: string; name: string }[];
  onImported: () => void;
}

const OTHER = '__link';
const cell = 'h-11 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] text-xs';
const headCell = 'px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400';

const STATUS_LABEL: Record<ImportRowStatus, { text: string; dot: string }> = {
  ready: { text: 'Siap', dot: 'bg-[#00a67d]' },
  duplicate: { text: 'Sudah ada', dot: 'bg-[#6e7687]' },
  unresolved: { text: 'Link bukan desain Canva', dot: 'bg-rose-500' },
  no_link: { text: 'Tanpa link', dot: 'bg-rose-500' },
};

/** Notion Config → Asset Library: impor aset dari database Notion lain (mis. katalog Canva Assets). */
export default function NotionAssetImport({ candidates, onImported }: Props) {
  const [source, setSource] = useState(candidates[0]?.id ?? OTHER);
  const [link, setLink] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [rowCategory, setRowCategory] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checking, startCheck] = useTransition();
  const [importing, startImport] = useTransition();

  const check = () =>
    startCheck(async () => {
      const res = await previewNotionAssetImportAction(source === OTHER ? { link } : { registeredId: source });
      if (!res.success) { toast.error(res.error); return; }
      setPreview(res.preview);
      setCategories(res.categories);
      setRowCategory(Object.fromEntries(res.preview.rows.map((r) => [r.key, r.categoryId ?? ''])));
      setSelected(new Set(res.preview.rows.filter((r) => r.status === 'ready' && r.categoryId).map((r) => r.key)));
    });

  const counts = useMemo(() => {
    const c: Record<ImportRowStatus, number> = { ready: 0, duplicate: 0, unresolved: 0, no_link: 0 };
    preview?.rows.forEach((r) => { c[r.status]++; });
    return c;
  }, [preview]);

  const readyRows = preview?.rows.filter((r) => r.status === 'ready') ?? [];
  const toImport = readyRows.filter((r) => selected.has(r.key) && rowCategory[r.key]);
  const missingCategory = readyRows.filter((r) => selected.has(r.key) && !rowCategory[r.key]).length;
  const allSelected = readyRows.length > 0 && readyRows.every((r) => selected.has(r.key));

  const toggle = (key: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const runImport = () =>
    startImport(async () => {
      const res = await importNotionAssetsAction(toImport.map((r) => ({ title: r.title, tags: r.tags, previewUrl: r.previewUrl!, categoryId: rowCategory[r.key] })));
      if (!res.success) { toast.error(res.error); return; }
      toast.success(`${res.created} aset diimpor${res.skipped ? `, ${res.skipped} dilewati` : ''}. Dikirim ke Notion di background.`);
      setPreview(null);
      onImported();
    });

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div>
      <div className="border-b border-[#f0f0f0] bg-gray-50/50 px-5 py-3.5 dark:border-[#272a34] dark:bg-[#16181d]/50">
        <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
          Impor dari database Notion
          <InfoTip label="Impor dari database Notion">
            Database sumber hanya dibaca. Link bit.ly / canva.link diikuti ke link desain Canva; aset yang desainnya sudah ada dilewati. Kategori ditebak dari kategori, tag, atau judul.
          </InfoTip>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Salin katalog aset yang sudah ada (mis. Canva Assets) ke Asset Library.</p>
      </div>

      <div className="flex flex-wrap items-stretch gap-2 p-5">
        <div className="min-w-[220px] flex-1">
          <SelectDropdown label="Database sumber" value={source} onChange={(v) => { setSource(v); setPreview(null); }} buttonClassName={cell}
            options={[...candidates.map((c) => ({ value: c.id, label: c.name })), { value: OTHER, label: 'Link database lain…' }]} />
        </div>
        {source === OTHER && (
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.notion.so/… atau ID database"
            aria-label="Link database Notion"
            className="h-11 min-w-[260px] flex-[2] rounded-none border border-[#f0f0f0] bg-gray-50/50 px-4 text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-white"
          />
        )}
        <button
          type="button"
          onClick={check}
          disabled={checking || (source === OTHER && !link.trim())}
          className="flex h-11 items-center gap-2 border border-[#f0f0f0] bg-white px-4 text-xs font-bold uppercase tracking-wider text-gray-700 hover:text-[#ff5e1f] disabled:opacity-50 dark:border-[#272a34] dark:bg-[#0d0e12] dark:text-gray-300 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Membaca…' : 'Cek Database'}
        </button>
      </div>
      {checking && <p className="px-5 pb-4 text-xs text-gray-500">Membaca database dan membuka setiap link (bisa sampai 1 menit untuk ratusan aset)…</p>}

      {preview && (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-y border-[#f0f0f0] px-5 py-2.5 text-xs dark:border-[#272a34]">
            <span className="font-bold text-gray-900 dark:text-white">{preview.databaseTitle}</span>
            {(Object.keys(STATUS_LABEL) as ImportRowStatus[]).map((s) => counts[s] > 0 && (
              <span key={s} className="flex items-center gap-1.5 font-semibold text-gray-600 dark:text-gray-300">
                <span aria-hidden className={`h-2 w-2 ${STATUS_LABEL[s].dot}`} />{counts[s]} {STATUS_LABEL[s].text.toLowerCase()}
              </span>
            ))}
            <span className="text-gray-500 dark:text-gray-400">
              Properti: {preview.properties.title} · {preview.properties.link ?? 'tanpa link'} · {preview.properties.tags ?? 'tanpa tag'}{preview.properties.category ? ` · ${preview.properties.category}` : ''}
            </span>
          </div>
          {preview.truncated && <p className="px-5 py-2 text-xs font-semibold text-amber-600">Hanya 1.000 baris pertama yang dibaca.</p>}

          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-[#16181d]">
                <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
                  <th className="w-10 px-4 py-2.5">
                    <input type="checkbox" aria-label="Pilih semua yang siap" checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(readyRows.map((r) => r.key)))} className="h-4 w-4 accent-[#ff5e1f]" />
                  </th>
                  <th className={headCell}>Judul</th>
                  <th className={`${headCell} w-[200px]`}>Kategori</th>
                  <th className={`${headCell} w-[190px]`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                {preview.rows.map((r) => {
                  const ready = r.status === 'ready';
                  return (
                    <tr key={r.key} className={ready ? '' : 'opacity-60'}>
                      <td className="px-4 py-2">
                        <input type="checkbox" aria-label={`Impor ${r.title}`} disabled={!ready} checked={ready && selected.has(r.key)} onChange={() => toggle(r.key)} className="h-4 w-4 accent-[#ff5e1f]" />
                      </td>
                      <td className="px-4 py-2">
                        <span className="block font-bold text-gray-900 dark:text-white">{r.title}</span>
                        {r.tags.length > 0 && <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">{r.tags.slice(0, 6).join(', ')}{r.tags.length > 6 ? ` +${r.tags.length - 6}` : ''}</span>}
                      </td>
                      <td className="border-x border-[#f0f0f0] p-0 dark:border-[#272a34]">
                        {ready ? (
                          <PortalSelect ariaLabel={`Kategori ${r.title}`} placeholder="Pilih kategori" value={rowCategory[r.key] ?? ''} options={categoryOptions}
                            onChange={(v) => setRowCategory((prev) => ({ ...prev, [r.key]: v }))} />
                        ) : <span className="px-4 text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300"><span aria-hidden className={`h-2 w-2 shrink-0 ${STATUS_LABEL[r.status].dot}`} />{STATUS_LABEL[r.status].text}</span>
                        {r.status === 'unresolved' && r.sourceUrl && (
                          <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="block max-w-[170px] truncate text-[11px] text-[#c2410c] hover:underline">{r.sourceUrl}</a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f0] px-5 py-3 dark:border-[#272a34]">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {toImport.length} dipilih{missingCategory > 0 ? ` · ${missingCategory} belum punya kategori (tidak ikut diimpor)` : ''}
            </span>
            <button
              type="button"
              onClick={runImport}
              disabled={importing || toImport.length === 0}
              className="flex h-10 items-center gap-2 bg-[#ff5e1f] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              {importing ? 'Mengimpor…' : `Impor ${toImport.length} aset`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
