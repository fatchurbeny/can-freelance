"use client";

import { useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, LayoutGrid, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { setAssetStatusAction } from '@/app/actions/assets';
import type { AssetRow } from '@/lib/asset-library';
import CanvaEmbed from './CanvaEmbed';

interface Props {
  asset: AssetRow;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}

const labelCell = 'flex w-[150px] shrink-0 items-center border-r border-[#f0f0f0] bg-gray-50/50 px-5 py-2.5 text-xs font-bold text-gray-500 dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-400';
const valueCell = 'flex min-w-0 flex-1 items-center px-5 py-2.5 text-xs font-bold text-gray-900 dark:text-white';

const SYNC_LABEL: Record<string, { text: string; dot: string }> = {
  SYNCED: { text: 'Tersinkron', dot: 'bg-[#00a67d]' },
  PENDING_PUSH: { text: 'Menunggu dikirim', dot: 'bg-amber-500' },
  ERROR: { text: 'Gagal terkirim (dicoba lagi saat sync)', dot: 'bg-rose-500' },
};

export default function AssetDetailDrawer({ asset, canManage, onClose, onEdit, onChanged }: Props) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(asset.previewUrl); toast.success('Public view link disalin'); } catch { toast.error('Gagal menyalin'); }
  };

  const toggleArchive = () =>
    startTransition(async () => {
      const next = asset.status === 'archived' ? 'active' : 'archived';
      const res = await setAssetStatusAction(asset.id, next);
      if (!res.success) { toast.error(res.error); return; }
      toast.success(next === 'archived' ? 'Aset diarsipkan' : 'Aset dipulihkan');
      onChanged();
      onClose();
    });

  if (typeof window === 'undefined') return null;
  const sync = SYNC_LABEL[asset.syncStatus] ?? SYNC_LABEL.PENDING_PUSH;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label={`Detail aset ${asset.title}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-140 flex-col border-l border-[#f0f0f0] bg-white font-sans shadow-2xl animate-[slideInRight_180ms_ease-out] dark:border-[#272a34] dark:bg-[#0d0e12]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#f0f0f0] bg-gray-50/50 px-5 py-4 dark:border-[#272a34] dark:bg-[#16181d]/50">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#f0f0f0] bg-white text-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d]">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold uppercase text-gray-900 dark:text-white">{asset.title}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {asset.categoryName}{asset.pages != null ? ` · ${asset.pages} halaman` : ''}{asset.status === 'archived' ? ' · Diarsipkan' : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-8 shrink-0 items-center justify-center border border-[#f0f0f0] bg-white text-gray-500 hover:text-gray-900 dark:border-[#272a34] dark:bg-[#16181d] dark:hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-2.5 border-b border-[#f0f0f0] p-5 dark:border-[#272a34]">
            <CanvaEmbed previewUrl={asset.previewUrl} title={asset.title} />
            <div className="flex flex-wrap gap-2">
              {asset.editUrl && (
                <a
                  href={asset.editUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 flex-[1_1_200px] items-center justify-center gap-2 bg-[#ff5e1f] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038]"
                >
                  Buka di Canva <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={copy}
                className="flex min-h-11 flex-[1_1_140px] items-center justify-center gap-2 border border-[#f0f0f0] bg-gray-50/50 px-4 text-xs font-bold uppercase tracking-wider text-gray-700 hover:text-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-300 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" /> Salin Link
              </button>
            </div>
            {asset.editUrl && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Buka di Canva memakai link edit dan perlu login akun tim. Preview di atas tidak perlu login.</p>
            )}
          </div>

          <dl className="divide-y divide-[#f0f0f0] border-b border-[#f0f0f0] dark:divide-[#272a34] dark:border-[#272a34]">
            <div className="flex min-h-11"><dt className={labelCell}>Kategori</dt><dd className={valueCell}>{asset.categoryName}</dd></div>
            <div className="flex min-h-11"><dt className={labelCell}>Production</dt><dd className={valueCell}>{asset.productionName ?? 'Semua production'}</dd></div>
            <div className="flex min-h-11">
              <dt className={labelCell}>Tag</dt>
              <dd className={`${valueCell} flex-wrap gap-1`}>
                {asset.tags.length === 0 ? <span className="font-normal text-gray-400">—</span> : asset.tags.map((t) => (
                  <span key={t} className="border border-[#ebebeb] bg-gray-50 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-[#272a34] dark:bg-[#16181d] dark:text-gray-300">{t}</span>
                ))}
              </dd>
            </div>
            <div className="flex min-h-11">
              <dt className={labelCell}>Catatan</dt>
              <dd className={`${valueCell} whitespace-pre-wrap font-medium leading-relaxed`}>{asset.notes || <span className="text-gray-400">—</span>}</dd>
            </div>
            <div className="flex min-h-11">
              <dt className={labelCell}>Dipakai di</dt>
              <dd className={`${valueCell} flex-col items-start justify-center gap-0.5`}>
                <span>{asset.usedCount} task</span>
                <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">dari section Assets di brief &amp; relation Notion</span>
              </dd>
            </div>
            <div className="flex min-h-11">
              <dt className={labelCell}>Notion</dt>
              <dd className={`${valueCell} flex-wrap justify-between gap-2`}>
                <span className="flex items-center gap-2"><span aria-hidden className={`h-2 w-2 ${sync.dot}`} />{sync.text}</span>
                {asset.notionUrl && (
                  <a href={asset.notionUrl} target="_blank" rel="noopener noreferrer" className="text-[#ff5e1f] hover:underline">Buka di Notion</a>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {canManage && (
          <div className="grid shrink-0 grid-cols-2 divide-x divide-[#f0f0f0] border-t border-[#f0f0f0] dark:divide-[#272a34] dark:border-[#272a34]">
            <button
              type="button"
              onClick={toggleArchive}
              disabled={pending}
              className="w-full bg-gray-50/50 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:bg-[#16181d]/50 dark:text-gray-300 dark:hover:bg-[#16181d] cursor-pointer"
            >
              {asset.status === 'archived' ? 'Pulihkan' : 'Arsipkan'}
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="w-full bg-[#ff5e1f] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] cursor-pointer"
            >
              Edit Aset
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
