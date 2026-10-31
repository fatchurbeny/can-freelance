'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Copy, Check, ExternalLink, Loader2, Link2Off, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAccess } from '@/context/AccessContext';
import { APP_BASE_PATH } from '@/lib/base-path';
import {
  getTaskShareLinkAction, createTaskShareLinkAction, revokeTaskShareLinkAction,
} from '@/app/actions/task-share';

/**
 * Tombol "Share" di header task drawer: buat / salin / cabut link publik view-only (/share/t/<token>).
 * `onActiveChange` memberi tahu drawer apakah task punya link aktif (untuk badge "Public view").
 */
export default function TaskShareButton({ taskId, onActiveChange }: { taskId: string; onActiveChange?: (active: boolean) => void }) {
  const access = useAccess();
  const readOnly = !!access.preview;
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const onActiveRef = useRef(onActiveChange);
  onActiveRef.current = onActiveChange;

  // Status link dimuat saat drawer dibuka (bukan saat panel dibuka) agar badge langsung tampil.
  useEffect(() => {
    let alive = true;
    setOpen(false);
    setToken(null);
    setLoading(true);
    getTaskShareLinkAction(taskId)
      .then((res) => { if (alive && res.success) setToken(res.token); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [taskId]);

  useEffect(() => {
    onActiveRef.current?.(!!token);
  }, [token]);

  useEffect(() => {
    if (!open) return;
    setConfirmRevoke(false);

    // Escape hanya menutup panel ini, bukan seluruh drawer (listener drawer ada di fase bubble).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, taskId]);

  const url = token ? `${window.location.origin}${APP_BASE_PATH}/share/t/${token}` : '';

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Link publik disalin');
    setTimeout(() => setCopied(false), 1500);
  };

  const create = async () => {
    setBusy(true);
    const res = await createTaskShareLinkAction(taskId);
    setBusy(false);
    if (!res.success) return toast.error(res.error);
    setToken(res.token);
    if (res.token) copy(`${window.location.origin}${APP_BASE_PATH}/share/t/${res.token}`);
  };

  // Konfirmasi inline: confirm() bawaan bisa tertutup otomatis di sebagian browser (mis. browser in-app).
  const revoke = async () => {
    setBusy(true);
    const res = await revokeTaskShareLinkAction(taskId);
    setBusy(false);
    if (!res.success) return toast.error(res.error);
    setToken(null);
    setConfirmRevoke(false);
    toast.success('Link publik dicabut');
  };

  const btn = 'flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={token ? 'Share link publik (aktif)' : 'Share link publik'}
        aria-expanded={open}
        title={token ? 'Link publik aktif' : 'Share link publik'}
        className={`${btn} relative ${open || token ? '!text-[#ff5e1f]' : ''}`}
      >
        <Share2 className="w-4 h-4" />
        {token && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#16181d]" />}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-[min(340px,calc(100vw-2rem))] border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-2xl rounded-none p-4 font-sans text-xs">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <Globe className="w-4 h-4 text-[#ff5e1f]" />
            <span>Share ke web</span>
            {token && <span className="ml-auto text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Aktif</span>}
          </div>
          <p className="mt-1.5 leading-relaxed text-gray-500 dark:text-gray-400">
            Siapa pun yang punya link bisa melihat task ini tanpa login (hanya lihat). Komentar, designer, payroll, dan link file tidak ikut ditampilkan.
          </p>

          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Memuat…</span>
            </div>
          ) : token ? (
            <>
              <div className="mt-3 flex">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#0d0e12] px-2 h-8 text-[11px] text-gray-700 dark:text-gray-300 outline-none rounded-none"
                />
                <button type="button" onClick={() => copy(url)} title="Salin link" className={`${btn} border-l-0`}>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer" title="Buka halaman publik" className={`${btn} border-l-0`}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              {confirmRevoke ? (
                <div className="mt-3 border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-2.5">
                  <p className="text-[11px] text-red-600 dark:text-red-400">Cabut link? Orang yang punya link tidak bisa membukanya lagi.</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={revoke}
                      disabled={busy}
                      className="flex h-7 items-center gap-1.5 bg-red-500 px-3 text-[11px] font-bold text-white hover:bg-red-600 disabled:opacity-50 rounded-none cursor-pointer"
                    >
                      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2Off className="w-3 h-3" />}
                      <span>Ya, cabut</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRevoke(false)}
                      disabled={busy}
                      className="h-7 border border-[#f0f0f0] dark:border-[#272a34] px-3 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-none cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(true)}
                  disabled={readOnly}
                  title={readOnly ? 'Mode pratinjau hanya-baca' : undefined}
                  className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Link2Off className="w-3 h-3" />
                  <span>Cabut link</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={create}
              disabled={busy || readOnly}
              title={readOnly ? 'Mode pratinjau hanya-baca' : undefined}
              className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 bg-[#ff5e1f] text-white font-bold hover:bg-[#e54e12] disabled:opacity-50 disabled:cursor-not-allowed rounded-none cursor-pointer"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>Buat link publik</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
