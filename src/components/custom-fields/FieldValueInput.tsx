'use client';

import { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import CustomSelectCell from '../CustomSelectCell';
import DatePickerCell from '../DatePickerCell';
import { fieldTypeInfo, isEditableFieldType } from '@/lib/notion-field-types';
import FieldValueDisplay, { type CustomFieldDef, optionColor } from './FieldValueDisplay';

interface Props {
  field: Pick<CustomFieldDef, 'name' | 'type' | 'options' | 'editable'>;
  value: unknown;
  onCommit: (value: unknown) => void;
  disabled?: boolean;
}

const INPUT_CLASS =
  'w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const TEXT_INPUT_TYPES: Record<string, string> = {
  rich_text: 'text',
  url: 'url',
  email: 'email',
  phone_number: 'tel',
  number: 'number',
};

function toDraft(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

// Input teks/angka: simpan saat blur, Enter = blur
function TextFieldInput({ type, value, onCommit, disabled }: { type: string; value: unknown; onCommit: (v: unknown) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState(toDraft(value));

  useEffect(() => {
    setDraft(toDraft(value));
  }, [value]);

  return (
    <input
      type={TEXT_INPUT_TYPES[type]}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === toDraft(value)) return;
        if (type === 'number') {
          const n = draft.trim() === '' ? null : Number(draft);
          onCommit(n !== null && Number.isFinite(n) ? n : null);
        } else {
          onCommit(draft.trim());
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={INPUT_CLASS}
    />
  );
}

export default function FieldValueInput({ field, value, onCommit, disabled }: Props) {
  const known = !!fieldTypeInfo(field.type);
  const editable = known && field.editable && isEditableFieldType(field.type);

  // Read-only: tampilkan nilai + petunjuk ubah di Notion
  if (!editable) {
    return (
      <div className="flex items-center justify-between gap-3 w-full px-5 py-2.5 min-w-0">
        <div className="min-w-0 flex-1 flex items-center">
          <FieldValueDisplay field={field} value={value} />
        </div>
        <span className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-gray-400 dark:text-gray-500">
          <Lock className="w-3 h-3" />
          {known ? 'Ubah di Notion' : 'Tipe belum didukung, ubah di Notion'}
        </span>
      </div>
    );
  }

  const lockClass = disabled ? 'pointer-events-none opacity-50' : '';

  switch (field.type) {
    case 'rich_text':
    case 'url':
    case 'email':
    case 'phone_number':
    case 'number':
      return <TextFieldInput type={field.type} value={value} onCommit={onCommit} disabled={disabled} />;

    case 'select':
    case 'status': {
      const current = value == null ? '' : String(value);
      const names = (field.options ?? []).map((o) => o.name);
      // Nilai lama yang tidak ada di opsi tetap tampil
      if (current && !names.includes(current)) names.push(current);
      const options = names.map((n) => ({ id: n, label: n }));
      // Select bisa dikosongkan; status di Notion selalu punya nilai
      if (field.type === 'select') options.unshift({ id: '', label: '— Kosong —' });
      return (
        <div className={`w-full ${lockClass}`}>
          <CustomSelectCell
            value={current}
            placeholder={field.type === 'status' ? 'Pilih Status' : 'Pilih...'}
            options={options}
            onChange={(next) => {
              if (next !== current) onCommit(next || null);
            }}
          />
        </div>
      );
    }

    case 'multi_select': {
      const selected = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
      const names = (field.options ?? []).map((o) => o.name);
      for (const s of selected) if (!names.includes(s)) names.push(s);
      return (
        <div className={`flex flex-wrap items-center gap-1.5 w-full p-2.5 bg-gray-50/50 dark:bg-[#16181d]/50 ${lockClass}`}>
          {names.length === 0 && <span className="px-2.5 text-gray-400 dark:text-gray-500 font-bold">Belum ada opsi</span>}
          {names.map((n) => {
            const isSelected = selected.includes(n);
            const color = optionColor(field.options, n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  const next = isSelected ? selected.filter((s) => s !== n) : [...selected, n];
                  onCommit(next);
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-none border transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-white'
                    : 'bg-white dark:bg-[#0d0e12] border-[#f0f0f0] dark:border-[#272a34] text-gray-700 dark:text-gray-300 hover:border-gray-400'
                }`}
                style={isSelected ? { backgroundColor: color, borderColor: color } : undefined}
              >
                {n}
              </button>
            );
          })}
        </div>
      );
    }

    case 'date': {
      const current = value ? String(value).slice(0, 10) : '';
      return (
        <div className="flex items-stretch w-full">
          <div className="flex-1 min-w-0">
            <DatePickerCell
              value={current || null}
              onChange={(next) => {
                if (next !== current) onCommit(next);
              }}
              disabled={disabled}
              fullWidth
            />
          </div>
          {current && !disabled && (
            <button
              type="button"
              onClick={() => onCommit(null)}
              title="Kosongkan tanggal"
              aria-label="Kosongkan tanggal"
              className="px-3 shrink-0 border-l border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    }

    case 'checkbox': {
      const checked = value === true || value === 'true';
      return (
        <label className={`flex items-center gap-2 w-full px-5 bg-gray-50/50 dark:bg-[#16181d]/50 cursor-pointer select-none font-bold text-gray-900 dark:text-white ${lockClass}`}>
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onCommit(e.target.checked)}
            className="w-4 h-4 rounded-none accent-[#ff5e1f] cursor-pointer"
          />
          <span>Ya</span>
        </label>
      );
    }

    default:
      return (
        <div className="flex items-center w-full px-5 py-2.5 min-w-0">
          <FieldValueDisplay field={field} value={value} />
        </div>
      );
  }
}
