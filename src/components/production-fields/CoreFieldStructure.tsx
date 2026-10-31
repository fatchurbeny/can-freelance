'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateCoreFieldStructureAction } from '@/app/actions/production-field';
import {
  CORE_FIELD_META,
  DEFAULT_FIELD_ALIASES,
  RECOMMENDED_FIELD_KEYS,
  REQUIRED_FIELD_KEYS,
  type FieldKey,
  type FieldMapping,
} from '@/lib/production-field-mapping';
import PortalSelect from './PortalSelect';
import InfoTip from '../InfoTip';

interface Props {
  unitId: string;
  fieldMapping: FieldMapping;
  disabledFields: string[];
  /** Properti database Notion; null = skema tidak bisa dibaca. */
  properties: { name: string; type: string }[] | null;
  onSaved: () => void;
}

const ALL_KEYS = Object.keys(DEFAULT_FIELD_ALIASES) as FieldKey[];
const OPTIONAL_KEYS = ALL_KEYS.filter((k) => !REQUIRED_FIELD_KEYS.includes(k) && !RECOMMENDED_FIELD_KEYS.includes(k));
const GROUPS: { title: string; note: string; keys: FieldKey[]; locked?: boolean }[] = [
  { title: 'Wajib', note: 'Dipakai rumus billing & payroll', keys: REQUIRED_FIELD_KEYS, locked: true },
  { title: 'Disarankan', note: 'Filter bulan & akun di billing', keys: RECOMMENDED_FIELD_KEYS },
  { title: 'Opsional', note: 'Mati = tidak tampil di drawer', keys: OPTIONAL_KEYS },
];
const RECOMMENDED_WARNING: Partial<Record<FieldKey, string>> = {
  taskMonth: 'Task Month mati: filter bulan di board dan Parameter Issue tidak bisa dipakai.',
  brand: 'Brand mati: task di billing statement tampil sebagai akun "Unknown".',
};

/** Nama properti yang dipakai field inti sekarang: mapping, lalu alias yang ada di Notion, lalu nama default. */
function currentName(key: FieldKey, mapping: FieldMapping, properties: { name: string }[] | null): string {
  const configured = mapping[key];
  const custom = Array.isArray(configured) ? configured[0] : configured;
  if (custom) return custom;
  const found = DEFAULT_FIELD_ALIASES[key].find((alias) => properties?.some((p) => p.name === alias));
  return found ?? DEFAULT_FIELD_ALIASES[key][0];
}

/** Struktur field inti per production: nama properti Notion per field dan field opsional yang dimatikan. */
export default function CoreFieldStructure({ unitId, fieldMapping, disabledFields, properties, onSaved }: Props) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [disabled, setDisabled] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNames(Object.fromEntries(ALL_KEYS.map((k) => [k, currentName(k, fieldMapping, properties)])));
    setDisabled(disabledFields);
  }, [fieldMapping, disabledFields, properties]);

  const dirty = useMemo(() => {
    const initialDisabled = [...disabledFields].sort().join();
    if ([...disabled].sort().join() !== initialDisabled) return true;
    return ALL_KEYS.some((k) => names[k] !== currentName(k, fieldMapping, properties));
  }, [names, disabled, disabledFields, fieldMapping, properties]);

  const optionsFor = (key: FieldKey) => {
    const types = CORE_FIELD_META[key].types;
    const fitting = (properties ?? []).filter((p) => types.includes(p.type)).map((p) => ({ value: p.name, label: p.name }));
    const fallback = DEFAULT_FIELD_ALIASES[key][0];
    const current = names[key];
    const extra = [current, fallback]
      .filter((n, i, arr) => n && arr.indexOf(n) === i && !fitting.some((o) => o.value === n))
      .map((n) => ({ value: n, label: n, hint: 'Belum ada di Notion · dibuat saat simpan' }));
    return [...fitting, ...extra];
  };

  const save = async () => {
    setSaving(true);
    const res = await updateCoreFieldStructureAction({ unitId, fieldMapping: names, disabledFields: disabled });
    setSaving(false);
    if (!res.success) { toast.error(res.error || 'Gagal menyimpan struktur field.'); return; }
    toast.success(res.added?.length ? `Struktur disimpan, ${res.added.length} properti dibuat di Notion.` : 'Struktur field disimpan.');
    onSaved();
  };

  const offWarnings = RECOMMENDED_FIELD_KEYS.filter((k) => disabled.includes(k)).map((k) => RECOMMENDED_WARNING[k]);

  return (
    <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] font-sans">
      {properties === null && (
        <p className="px-5 py-3 text-xs text-amber-600">Skema Notion tidak bisa dibaca. Nama properti hanya bisa dipilih dari nama default.</p>
      )}
      {GROUPS.map((group) => (
        <div key={group.title} className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          <div className="flex items-center justify-between gap-3 px-5 py-2 bg-white dark:bg-[#0d0e12]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">{group.title}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{group.note}</span>
          </div>
          {group.keys.map((key) => {
            const on = !disabled.includes(key);
            return (
              <div key={key} className={`flex items-stretch text-xs min-h-[44px] ${on ? '' : 'opacity-60'}`}>
                <div className="w-[110px] sm:w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-3 sm:px-5 py-2.5 flex items-center font-bold text-gray-500 dark:text-gray-400 select-none">
                  <span className="truncate" title={CORE_FIELD_META[key].label}>{CORE_FIELD_META[key].label}</span>
                </div>
                <div className="flex-1 min-w-0 flex items-stretch">
                  <PortalSelect
                    ariaLabel={`Nama di Notion untuk ${CORE_FIELD_META[key].label}`}
                    value={names[key] ?? ''}
                    options={optionsFor(key)}
                    disabled={!on}
                    onChange={(value) => setNames((prev) => ({ ...prev, [key]: value }))}
                  />
                </div>
                <div className="w-14 shrink-0 border-l border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center">
                  {group.locked ? (
                    <Lock className="w-3.5 h-3.5 text-gray-400" aria-label="Wajib" />
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`Pakai ${CORE_FIELD_META[key].label}`}
                      onClick={() => setDisabled((prev) => (on ? [...prev, key] : prev.filter((k) => k !== key)))}
                      className={`relative w-9 h-5 cursor-pointer transition-colors ${on ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#343846]'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white dark:bg-[#0d0e12] transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {offWarnings.length > 0 && (
        <div className="px-5 py-3 space-y-1 text-xs text-amber-600">{offWarnings.map((w) => <p key={w}>{w}</p>)}</div>
      )}
      <div className="flex items-center justify-end gap-2 px-5 py-3">
        <InfoTip label="Simpan struktur field">Field aktif yang belum ada di Notion akan dibuat saat simpan.</InfoTip>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="h-9 px-4 shrink-0 bg-[#ff5e1f] hover:bg-[#ff7038] text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Simpan struktur
        </button>
      </div>
    </div>
  );
}
