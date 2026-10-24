'use client';

import { ExternalLink } from 'lucide-react';

export interface CustomFieldOption {
  name: string;
  color?: string;
}

/** Definisi field tambahan dari fetchTaskMetadataOptionsAction (data.fields). */
export interface CustomFieldDef {
  id: string;
  name: string;
  type: string;
  options: CustomFieldOption[] | null;
  editable: boolean;
}

// Warna opsi Notion → hex pill
const NOTION_COLORS: Record<string, string> = {
  default: '#6e7687',
  gray: '#6e7687',
  brown: '#a16207',
  orange: '#ff5e1f',
  yellow: '#ca8a04',
  green: '#00a67d',
  blue: '#3b7bff',
  purple: '#7c3aed',
  pink: '#ec4899',
  red: '#e05c5e',
};

export function optionColor(options: CustomFieldOption[] | null | undefined, name: string): string {
  const color = options?.find((o) => o.name === name)?.color;
  return NOTION_COLORS[color || 'default'] || NOTION_COLORS.default;
}

/** Nilai kosong: null, '', [] atau objek tanpa isi. */
export function isEmptyFieldValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** 'YYYY-MM-DD' (atau ISO datetime) → '24 Okt 2026' (tanpa geser zona waktu). */
export function formatFieldDate(value: unknown): string {
  const str = String(value ?? '');
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shortText(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    const json = JSON.stringify(value);
    return json.length > 80 ? `${json.slice(0, 77)}…` : json;
  }
  return String(value);
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="px-2 py-0.5 text-[11px] font-bold rounded truncate max-w-full"
      style={{ backgroundColor: `${color}25`, color }}
      title={label}
    >
      {label}
    </span>
  );
}

export default function FieldValueDisplay({
  field,
  value,
}: {
  field: Pick<CustomFieldDef, 'type' | 'options'>;
  value: unknown;
}) {
  if (field.type !== 'checkbox' && isEmptyFieldValue(value)) {
    return <span className="text-gray-400 dark:text-gray-500 font-bold">—</span>;
  }

  switch (field.type) {
    case 'select':
    case 'status':
      return <Pill label={String(value)} color={optionColor(field.options, String(value))} />;
    case 'multi_select': {
      const list = Array.isArray(value) ? value : [value];
      return (
        <div className="flex flex-wrap gap-1.5 min-w-0">
          {list.map((v, i) => (
            <Pill key={`${String(v)}-${i}`} label={String(v)} color={optionColor(field.options, String(v))} />
          ))}
        </div>
      );
    }
    case 'people':
    case 'files':
    case 'relation': {
      const list = Array.isArray(value) ? value : [value];
      return (
        <div className="flex flex-wrap gap-1.5 min-w-0">
          {list.map((v, i) => (
            <Pill key={i} label={shortText(v)} color={NOTION_COLORS.gray} />
          ))}
        </div>
      );
    }
    case 'date':
      return <span className="font-bold text-gray-900 dark:text-white">{formatFieldDate(value)}</span>;
    case 'checkbox':
      return value === true || value === 'true'
        ? <span className="font-bold text-gray-900 dark:text-white">Ya</span>
        : <span className="text-gray-400 dark:text-gray-500 font-bold">—</span>;
    case 'url': {
      const href = String(value);
      const safe = /^https?:\/\//i.test(href) ? href : `https://${href}`;
      return (
        <a
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 inline-flex items-center gap-1.5 font-bold text-[#ff5e1f] hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{href}</span>
        </a>
      );
    }
    default:
      return (
        <span className="font-bold text-gray-900 dark:text-white truncate" title={shortText(value)}>
          {shortText(value)}
        </span>
      );
  }
}
