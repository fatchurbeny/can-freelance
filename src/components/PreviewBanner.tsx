"use client";

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useAccess } from '@/context/AccessContext';
import { stopPreviewAction } from '@/app/actions/auth';
import { APP_BASE_PATH } from '@/lib/base-path';

/** Penanda mode "Lihat sebagai": tampilan mengikuti akun lain, semua aksi ubah ditolak. */
export default function PreviewBanner() {
  const access = useAccess();
  const [busy, setBusy] = useState(false);
  if (!access.preview) return null;

  const stop = async () => {
    setBusy(true);
    await stopPreviewAction();
    window.location.assign(`${APP_BASE_PATH}/`);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-none border border-[#ff5e1f] bg-white px-4 py-2 text-xs shadow-2xl dark:bg-[#16181d]">
      <Eye className="h-4 w-4 shrink-0 text-[#ff5e1f]" />
      <span className="min-w-0 truncate text-gray-700 dark:text-gray-200">
        Mode pratinjau: <strong>{access.preview.name || access.preview.userCode}</strong>{' '}
        <span className="font-mono text-gray-400">{access.preview.userCode}</span> · {access.preview.roleLabels.join(', ')} · hanya-baca
      </span>
      <button
        type="button"
        onClick={stop}
        disabled={busy}
        className="shrink-0 rounded-none border border-[#f0f0f0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#ff5e1f] hover:bg-orange-500/10 disabled:opacity-50 dark:border-[#272a34] cursor-pointer"
      >
        Keluar pratinjau
      </button>
    </div>
  );
}
