'use client';

import { useState, type ReactNode } from 'react';
import DateRangePicker, { addMonthsInclusive, formatDateKey, type DateRange } from './DateRangePicker';
import InfoTip from './InfoTip';

const PRESETS = [
  { id: '3', months: 3, label: '3 Bulan' },
  { id: '6', months: 6, label: '6 Bulan' },
  { id: '12', months: 12, label: '1 Tahun' },
] as const;

type Choice = (typeof PRESETS)[number]['id'] | 'custom' | null;

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Tanggal mulai untuk pilihan cepat ("YYYY-MM-DD"), mis. awal bulan berikutnya. */
  defaultStart: string;
  /** Teks tooltip ⓘ di label "Periode kontrak". */
  info: ReactNode;
  /** Kelas baris & sel label drawer pemakai, agar tampil seragam. */
  rowClass: string;
  labelClass: string;
}

/** Pilihan awal saat drawer dibuka: periode yang ada dikenali sebagai preset bila cocok, selain itu Custom. */
function detectChoice(value: DateRange): Choice {
  if (!value.start || !value.end) return null;
  const preset = PRESETS.find((p) => addMonthsInclusive(value.start!, p.months) === value.end);
  return preset ? preset.id : 'custom';
}

/**
 * Periode kontrak: pilihan cepat 3 Bulan / 6 Bulan / 1 Tahun (mulai `defaultStart`, atau tanggal
 * mulai yang sudah ada saat edit), atau Custom dengan pemilih rentang tanggal di baris bawahnya.
 */
export default function ContractPeriodField({ value, onChange, defaultStart, info, rowClass, labelClass }: Props) {
  const [choice, setChoice] = useState<Choice>(() => detectChoice(value));

  const pick = (next: Choice) => {
    setChoice(next);
    const preset = PRESETS.find((p) => p.id === next);
    if (preset) {
      const start = value.start ?? defaultStart;
      onChange({ start, end: addMonthsInclusive(start, preset.months) });
    }
  };

  const segment = (active: boolean) =>
    `text-xs font-bold uppercase cursor-pointer transition-colors ${
      active ? 'bg-[#ff5e1f] text-white' : 'bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:bg-[#16181d]/50 dark:text-gray-300 dark:hover:bg-[#16181d]'
    }`;

  return (
    <>
      <div className={rowClass}>
        <span className={`${labelClass} gap-1.5`}>Periode kontrak<InfoTip label="Periode kontrak">{info}</InfoTip></span>
        <div role="radiogroup" aria-label="Periode kontrak" className="grid flex-1 grid-cols-4 divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={choice === p.id} onClick={() => pick(p.id)} className={segment(choice === p.id)}>
              {p.label}
            </button>
          ))}
          <button type="button" role="radio" aria-checked={choice === 'custom'} onClick={() => pick('custom')} className={segment(choice === 'custom')}>
            Custom
          </button>
        </div>
      </div>
      {choice === 'custom' && (
        <div className={rowClass}>
          <span className={`${labelClass} gap-1.5`}>
            Rentang tanggal
            <InfoTip label="Rentang tanggal">Klik nama bulan atau tahun di kalender untuk melompat cepat. Setelah tanggal mulai, pilih durasi atau tanggal akhir.</InfoTip>
          </span>
          <div className="flex-1">
            <DateRangePicker ariaLabel="Rentang tanggal kontrak" placeholder="Pilih tanggal mulai – akhir" value={value} onChange={onChange} />
          </div>
        </div>
      )}
      {choice && choice !== 'custom' && value.start && value.end && (
        <div className={rowClass}>
          <span className={labelClass}>Rentang</span>
          <span className="flex flex-1 items-center justify-between gap-3 px-5 font-bold text-gray-900 dark:text-white">
            {formatDateKey(value.start)} – {formatDateKey(value.end)}
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Tanggal lain? Pilih Custom</span>
          </span>
        </div>
      )}
    </>
  );
}

/** Tanggal 1 bulan berikutnya dari hari ini, atau dari bulan kunci "YYYY-MM" (2026-09 → 2026-10-01). */
export function firstDayOfNextMonth(fromKey?: string | null): string {
  const base = fromKey && /^\d{4}-\d{2}/.test(fromKey) ? new Date(Number(fromKey.slice(0, 4)), Number(fromKey.slice(5, 7)) - 1, 1) : new Date();
  const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
}
