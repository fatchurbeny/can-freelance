'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface Props {
  /** Nama field, untuk aria-label tombol ("Info Tarif dasar"). */
  label: string;
  children: ReactNode;
}

/**
 * Ikon ⓘ di sel label drawer form; penjelasan field muncul saat hover / fokus keyboard,
 * bukan sebagai baris catatan yang selalu tampil. Tooltip di-portal (`fixed`) agar tidak
 * terpotong container `overflow-y-auto` drawer.
 */
export default function InfoTip({ label, children }: Props) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    // Lebar tooltip 260px; jaga tetap di dalam viewport
    setPos({ left: Math.max(8, Math.min(r.left - 16, window.innerWidth - 268)), top: r.bottom + 8 });
  };
  const hide = () => setPos(null);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`Info ${label}`}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => { e.preventDefault(); if (pos) hide(); else show(); }}
        className="inline-flex size-4 shrink-0 items-center justify-center text-gray-400 hover:text-[#ff5e1f] focus-visible:text-[#ff5e1f] focus-visible:outline-none cursor-help"
      >
        <Info className="size-3.5" />
      </button>
      {pos && typeof window !== 'undefined' && createPortal(
        <div
          id={id}
          role="tooltip"
          style={{ left: pos.left, top: pos.top }}
          className="pointer-events-none fixed z-[95] w-[260px] bg-gray-900 px-3 py-2.5 font-sans text-[11px] font-medium leading-relaxed whitespace-normal text-gray-50 shadow-xl dark:bg-gray-100 dark:text-gray-900"
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}
