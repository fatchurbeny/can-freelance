'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateRange {
  /** "YYYY-MM-DD" */
  start: string | null;
  /** "YYYY-MM-DD", inklusif */
  end: string | null;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  ariaLabel: string;
  placeholder?: string;
  /** Pintasan durasi setelah tanggal mulai dipilih (bulan). */
  durationShortcuts?: number[];
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m: m - 1, d };
};
const todayKey = () => {
  const t = new Date();
  return toKey(t.getFullYear(), t.getMonth(), t.getDate());
};
/** Tanggal + n bulan − 1 hari (akhir periode inklusif), dijepit ke hari terakhir bulan. */
export const addMonthsInclusive = (key: string, months: number) => {
  const { y, m, d } = parseKey(key);
  const target = new Date(y, m + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const end = new Date(target.getFullYear(), target.getMonth(), Math.min(d, lastDay));
  end.setDate(end.getDate() - 1);
  return toKey(end.getFullYear(), end.getMonth(), end.getDate());
};
export const formatDateKey = (key: string | null) => {
  if (!key) return '';
  const { y, m, d } = parseKey(key);
  return `${d} ${MONTHS_SHORT[m]} ${y}`;
};

type View = 'day' | 'month' | 'year';

/**
 * Pemilih rentang tanggal: klik judul bulan → pilih bulan, klik tahun → pilih tahun (zoom out cepat
 * untuk periode kontrak panjang). Setelah tanggal mulai dipilih, pintasan durasi mengisi tanggal akhir.
 */
export default function DateRangePicker({ value, onChange, ariaLabel, placeholder = 'Pilih rentang tanggal', durationShortcuts = [3, 6, 12, 24] }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [view, setView] = useState<View>('day');
  const initial = parseKey(value.start ?? todayKey());
  const [cursorY, setCursorY] = useState(initial.y);
  const [cursorM, setCursorM] = useState(initial.m);
  const [hover, setHover] = useState<string | null>(null);

  const open = () => {
    const base = parseKey(value.start ?? todayKey());
    setCursorY(base.y);
    setCursorM(base.m);
    setView('day');
    setRect(buttonRef.current!.getBoundingClientRect());
  };
  const close = () => {
    setRect(null);
    setHover(null);
  };

  useEffect(() => {
    if (!rect) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || buttonRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape menutup kalender saja, bukan drawer di belakangnya
      e.stopImmediatePropagation();
      if (view !== 'day') setView(view === 'year' ? 'month' : 'day');
      else { close(); buttonRef.current?.focus(); }
    };
    const onResize = () => close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
    };
  }, [rect, view]);

  const pickDay = (key: string) => {
    const { start, end } = value;
    if (!start || end || key < start) {
      onChange({ start: key, end: null });
      return;
    }
    onChange({ start, end: key });
    close();
  };

  const shift = (step: number) => {
    if (view === 'day') {
      const next = new Date(cursorY, cursorM + step, 1);
      setCursorY(next.getFullYear());
      setCursorM(next.getMonth());
    } else if (view === 'month') setCursorY((y) => y + step);
    else setCursorY((y) => y + step * 12);
  };

  const days = useMemo(() => {
    const first = new Date(cursorY, cursorM, 1).getDay();
    const count = new Date(cursorY, cursorM + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)] as (number | null)[];
  }, [cursorY, cursorM]);

  const yearStart = cursorY - (cursorY % 12);
  const rangeEnd = value.end ?? (value.start && hover && hover >= value.start ? hover : null);
  const today = todayKey();
  const label = value.start
    ? value.end ? `${formatDateKey(value.start)} – ${formatDateKey(value.end)}` : `${formatDateKey(value.start)} – …`
    : '';

  const openUp = rect ? rect.bottom + 420 > window.innerHeight && rect.top > 420 : false;
  const panelWidth = rect ? Math.max(rect.width, 320) : 320;
  const panelLeft = rect ? Math.min(rect.left, window.innerWidth - panelWidth - 8) : 0;

  const navBtn = 'flex size-8 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#20232b] dark:hover:text-white cursor-pointer';
  const zoomBtn = 'h-8 px-2 text-sm font-bold text-gray-900 hover:bg-gray-100 hover:text-[#c2410c] dark:text-white dark:hover:bg-[#20232b] cursor-pointer';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={!!rect}
        onClick={() => (rect ? close() : open())}
        className="flex h-full min-h-11 w-full items-center justify-between gap-2 bg-gray-50/50 px-5 text-left text-xs font-bold text-gray-900 hover:bg-gray-100 dark:bg-[#16181d]/50 dark:text-white dark:hover:bg-[#16181d] cursor-pointer"
      >
        <span className={`truncate ${label ? '' : 'font-medium text-gray-400'}`}>{label || placeholder}</span>
        <Calendar className="h-4 w-4 shrink-0 text-gray-500" />
      </button>

      {rect && typeof window !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={ariaLabel}
          style={{ position: 'fixed', left: panelLeft, width: panelWidth, ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) }}
          className="z-[100] border border-[#f0f0f0] bg-white font-sans text-xs shadow-xl dark:border-[#272a34] dark:bg-[#16181d]"
        >
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-2 py-1.5 dark:border-[#272a34]">
            <button type="button" onClick={() => shift(-1)} aria-label="Sebelumnya" className={navBtn}><ChevronLeft className="h-4 w-4" /></button>
            <div className="flex items-center">
              {view === 'day' && (
                <>
                  <button type="button" onClick={() => setView('month')} className={zoomBtn} aria-label="Pilih bulan">{MONTHS[cursorM]}</button>
                  <button type="button" onClick={() => setView('year')} className={zoomBtn} aria-label="Pilih tahun">{cursorY}</button>
                </>
              )}
              {view === 'month' && <button type="button" onClick={() => setView('year')} className={zoomBtn} aria-label="Pilih tahun">{cursorY}</button>}
              {view === 'year' && <span className="h-8 px-2 text-sm font-bold leading-8 text-gray-900 dark:text-white">{yearStart} – {yearStart + 11}</span>}
            </div>
            <button type="button" onClick={() => shift(1)} aria-label="Berikutnya" className={navBtn}><ChevronRight className="h-4 w-4" /></button>
          </div>

          {view === 'day' && (
            <div className="p-2" onMouseLeave={() => setHover(null)}>
              <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-gray-400">
                {DAYS.map((d) => <span key={d} className="py-1.5">{d}</span>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day, i) => {
                  if (day === null) return <span key={`e${i}`} />;
                  const key = toKey(cursorY, cursorM, day);
                  const isStart = key === value.start;
                  const isEnd = key === rangeEnd;
                  const inRange = !!value.start && !!rangeEnd && key > value.start && key < rangeEnd;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => pickDay(key)}
                      onMouseEnter={() => setHover(key)}
                      aria-pressed={isStart || isEnd}
                      aria-label={formatDateKey(key)}
                      className={`h-9 text-xs cursor-pointer ${
                        isStart || isEnd
                          ? 'bg-[#ff5e1f] font-bold text-white'
                          : inRange
                            ? 'bg-[#ff5e1f]/10 font-semibold text-[#c2410c] dark:text-[#ff7038]'
                            : `text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#20232b] ${key === today ? 'font-bold underline decoration-[#ff5e1f] decoration-2 underline-offset-4' : ''}`
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'month' && (
            <div className="grid grid-cols-3 gap-1 p-2">
              {MONTHS_SHORT.map((m, i) => {
                const active = value.start && parseKey(value.start).y === cursorY && parseKey(value.start).m === i;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setCursorM(i); setView('day'); }}
                    className={`h-11 text-xs font-semibold cursor-pointer ${active ? 'bg-[#ff5e1f] text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#20232b]'}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {view === 'year' && (
            <div className="grid grid-cols-3 gap-1 p-2">
              {Array.from({ length: 12 }, (_, i) => yearStart + i).map((y) => {
                const active = value.start && parseKey(value.start).y === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setCursorY(y); setView('month'); }}
                    className={`h-11 text-xs font-semibold cursor-pointer ${active ? 'bg-[#ff5e1f] text-white' : `text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#20232b] ${y === new Date().getFullYear() ? 'underline decoration-[#ff5e1f] decoration-2 underline-offset-4' : ''}`}`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {value.start && !value.end && view === 'day' && durationShortcuts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-[#f0f0f0] px-3 py-2 dark:border-[#272a34]">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Durasi:</span>
              {durationShortcuts.map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => { onChange({ start: value.start, end: addMonthsInclusive(value.start!, months) }); close(); }}
                  className="h-7 border border-[#f0f0f0] px-2 text-[11px] font-bold text-gray-700 hover:border-[#ff5e1f] hover:text-[#c2410c] dark:border-[#272a34] dark:text-gray-300 cursor-pointer"
                >
                  {months % 12 === 0 ? `${months / 12} tahun` : `${months} bulan`}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-[#f0f0f0] px-3 py-2 dark:border-[#272a34]">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {!value.start || value.end ? 'Pilih tanggal mulai' : 'Pilih tanggal akhir'}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => { const t = parseKey(today); setCursorY(t.y); setCursorM(t.m); setView('day'); }}
                className="h-7 px-2 text-[11px] font-bold text-[#c2410c] hover:bg-gray-100 dark:hover:bg-[#20232b] cursor-pointer"
              >
                Hari ini
              </button>
              {(value.start || value.end) && (
                <button type="button" onClick={() => onChange({ start: null, end: null })} className="h-7 px-2 text-[11px] font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#20232b] cursor-pointer">
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Hari kerja Senin–Jumat di rentang inklusif (libur nasional belum dikurangi). */
export function workingDaysInRange(start: string, end: string): number {
  const a = parseKey(start);
  const b = parseKey(end);
  const cursor = new Date(a.y, a.m, a.d);
  const last = new Date(b.y, b.m, b.d);
  let count = 0;
  while (cursor <= last) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}
