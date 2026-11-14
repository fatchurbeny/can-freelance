'use client';

import { Send } from 'lucide-react';
import { APP_BASE_PATH } from '@/lib/base-path';

/**
 * Tombol "Kirim ke Deck/Doc" di header task drawer (kontrak I-22). Membuka tab baru ke
 * /api/impro/handoff yang menerbitkan tiket sekali pakai lalu mengarahkan ke impro.fatchurbeny.com;
 * improstd membuka studio dengan form terisi dari brief task ini. Izin dicek di server.
 */
export default function SendBriefButton({ taskId, studio }: { taskId: string; studio: 'deck' | 'doc' }) {
  const label = studio === 'deck' ? 'Kirim ke Deck' : 'Kirim ke Doc';
  return (
    <a
      href={`${APP_BASE_PATH}/api/impro/handoff?task=${encodeURIComponent(taskId)}`}
      target="_blank"
      rel="noopener"
      title={`${label}: buka studio di impro.fatchurbeny.com dengan brief task ini`}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-none border border-[#f0f0f0] bg-white px-2.5 font-sans text-[11px] font-bold uppercase tracking-wider text-gray-600 transition-colors hover:text-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d] dark:text-gray-300"
    >
      <Send className="h-3.5 w-3.5" />
      <span>{label}</span>
    </a>
  );
}
