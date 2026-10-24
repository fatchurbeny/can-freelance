'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight, CalendarDays, CircleDot, FileText, Fingerprint, Hash, Link as LinkIcon,
  ListPlus, Mail, Paperclip, Phone, Sigma, SquareCheck, Tags, Type, Users,
} from 'lucide-react';
import FieldValueInput from '../custom-fields/FieldValueInput';
import type { CustomFieldDef } from '../custom-fields/FieldValueDisplay';

// Ikon label per tipe properti Notion
const TYPE_ICONS: Record<string, LucideIcon> = {
  rich_text: Type,
  number: Hash,
  select: CircleDot,
  status: CircleDot,
  multi_select: Tags,
  date: CalendarDays,
  checkbox: SquareCheck,
  url: LinkIcon,
  email: Mail,
  phone_number: Phone,
  people: Users,
  files: Paperclip,
  formula: Sigma,
  rollup: Sigma,
  relation: ArrowUpRight,
  unique_id: Fingerprint,
};

interface Props {
  fields: CustomFieldDef[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  disabled?: boolean;
}

export default function CustomFieldsSection({ fields, values, onChange, disabled }: Props) {
  if (fields.length === 0) return null;

  return (
    <div className="flex flex-col bg-white dark:bg-[#0d0e12]">
      <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-[#16181d]/50 border-b border-[#f0f0f0] dark:border-[#272a34]">
        <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <ListPlus className="w-3.5 h-3.5" />
          Field Tambahan
        </h3>
      </div>
      <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
        {fields.map((field) => {
          const Icon = TYPE_ICONS[field.type] ?? FileText;
          return (
            <div key={field.id} className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div
                title={field.name}
                className="w-[150px] shrink-0 min-w-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap"
              >
                <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{field.name}</span>
              </div>
              <div className="flex-1 min-w-0 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <FieldValueInput
                  field={field}
                  value={values[field.name]}
                  onCommit={(next) => onChange(field.name, next)}
                  disabled={disabled}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
