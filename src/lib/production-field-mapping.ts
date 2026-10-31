import type { Prisma } from '../../generated/prisma';

/**
 * Field mapping per ProductionUnit (multi-production Fase 3).
 * `ProductionUnit.fieldMapping` menyimpan nama properti Notion custom per kunci logis.
 * Jika tidak diisi, resolver memakai alias default (nama lama sync) sehingga Lamongan tetap identik.
 */

export type FieldKey =
  | 'name' | 'designer' | 'designerStatus' | 'doctype' | 'designStatus'
  | 'pages' | 'qtySubmit' | 'license' | 'languages' | 'dateApproved'
  | 'taskMonth' | 'payrollMonth' | 'priority' | 'createdTime' | 'dateStarted'
  | 'dateCompleted' | 'datePO' | 'dateReject' | 'poolScore' | 'brand' | 'canvaLink';

export type FieldMapping = Partial<Record<FieldKey, string | string[]>>;

/** Alias default — urutan = prioritas. Termasuk typo Notion yang sudah dikenal ("Date Completd", "Created date"). */
export const DEFAULT_FIELD_ALIASES: Record<FieldKey, string[]> = {
  name: ['Name'],
  designer: ['Designer'],
  designerStatus: ['Designer Status'],
  doctype: ['Doctype'],
  designStatus: ['Design Status'],
  pages: ['Pages'],
  qtySubmit: ['QTY-Submit', 'QTY Submit'],
  license: ['License'],
  languages: ['IND/ENG', 'IND\\ENG'],
  dateApproved: ['Date Aproved'],
  taskMonth: ['Task Month'],
  payrollMonth: ['Payroll Month', 'Payroll-Month'],
  priority: ['Priority'],
  createdTime: ['Created date', 'Created Date', 'Created Time', 'Created'],
  dateStarted: ['Date Started'],
  dateCompleted: ['Date Completd', 'Date Completed'],
  datePO: ['Date PO'],
  dateReject: ['Date Reject'],
  poolScore: ['Pool Score'],
  brand: ['Brand', 'Account'],
  canvaLink: ['Template Link', 'Canva Link', 'Canva', 'URL'],
};

/** Dipakai rumus billing & payroll: tidak bisa dimatikan per production. */
export const REQUIRED_FIELD_KEYS: FieldKey[] = ['name', 'designer', 'doctype', 'designStatus', 'pages', 'qtySubmit', 'payrollMonth'];

/** Boleh dimatikan, tapi fitur lain jadi kurang lengkap (filter bulan, akun di billing). */
export const RECOMMENDED_FIELD_KEYS: FieldKey[] = ['taskMonth', 'brand'];

/** Label & tipe Notion yang diterima per field inti (sama dengan CORE_PROPERTIES di notion-provision, aman untuk client). */
export const CORE_FIELD_META: Record<FieldKey, { label: string; types: string[] }> = {
  name: { label: 'Judul task', types: ['title'] },
  designer: { label: 'Designer', types: ['select'] },
  designerStatus: { label: 'Designer Status', types: ['select'] },
  doctype: { label: 'Doctype', types: ['select'] },
  designStatus: { label: 'Design Status', types: ['status'] },
  pages: { label: 'Pages', types: ['number'] },
  qtySubmit: { label: 'QTY-Submit', types: ['number'] },
  license: { label: 'License', types: ['select'] },
  languages: { label: 'Bahasa (IND/ENG)', types: ['multi_select'] },
  dateApproved: { label: 'Date Approved', types: ['date'] },
  taskMonth: { label: 'Task Month', types: ['select'] },
  payrollMonth: { label: 'Payroll Month', types: ['select'] },
  priority: { label: 'Priority', types: ['select'] },
  createdTime: { label: 'Created Time', types: ['created_time'] },
  dateStarted: { label: 'Date Started', types: ['date'] },
  dateCompleted: { label: 'Date Completed', types: ['date'] },
  datePO: { label: 'Date PO', types: ['date'] },
  dateReject: { label: 'Date Reject', types: ['date'] },
  poolScore: { label: 'Pool Score', types: ['number'] },
  brand: { label: 'Brand / Account', types: ['multi_select'] },
  canvaLink: { label: 'Template Link', types: ['url', 'files', 'rich_text'] },
};

export function isFieldEnabled(key: FieldKey, disabled?: string[] | null): boolean {
  return REQUIRED_FIELD_KEYS.includes(key) || !(disabled ?? []).includes(key);
}

function candidatesFor(key: FieldKey, mapping?: FieldMapping | null): string[] {
  const configured = mapping?.[key];
  const custom = Array.isArray(configured) ? configured : configured ? [configured] : [];
  return [...custom, ...DEFAULT_FIELD_ALIASES[key]];
}

/** Nama properti Notion yang dipakai untuk kunci logis (pertama yang ada di halaman). */
export function resolvePropertyName(
  properties: Record<string, any>,
  key: FieldKey,
  mapping?: FieldMapping | null,
): string | undefined {
  return candidatesFor(key, mapping).find((name) => properties[name] !== undefined);
}

/**
 * Nama properti tujuan saat menulis ke Notion: kandidat pertama (mapping, lalu alias default) yang ada di skema
 * database. Undefined = properti tidak ada di database ini, jadi dilewati.
 */
export function resolveWriteName(
  schemaProps: Record<string, any>,
  key: FieldKey,
  mapping?: FieldMapping | null,
): string | undefined {
  return candidatesFor(key, mapping).find((name) => schemaProps[name] !== undefined);
}

/** Ambil objek properti Notion untuk kunci logis; undefined bila tidak ada. */
export function getProperty(
  properties: Record<string, any>,
  key: FieldKey,
  mapping?: FieldMapping | null,
): any {
  const name = resolvePropertyName(properties, key, mapping);
  return name ? properties[name] : undefined;
}

/** Semua nama properti yang sudah "dikenal" (mapped), dipakai untuk memisahkan custom field. */
export function knownPropertyNames(mapping?: FieldMapping | null): Set<string> {
  const known = new Set<string>();
  (Object.keys(DEFAULT_FIELD_ALIASES) as FieldKey[]).forEach((key) => {
    candidatesFor(key, mapping).forEach((name) => known.add(name));
  });
  return known;
}

/** Ubah satu properti Notion menjadi nilai JSON sederhana. */
function plainValue(prop: any): unknown {
  const type = prop?.type;
  if (!type) return null;
  const value = prop[type];
  switch (type) {
    case 'title':
    case 'rich_text':
      return (value || []).map((t: any) => t.plain_text).join('') || null;
    case 'select':
    case 'status':
      return value?.name ?? null;
    case 'multi_select':
      return (value || []).map((x: any) => x.name);
    case 'people':
      return (value || []).map((p: any) => p.name ?? p.id);
    case 'files':
      return (value || []).map((f: any) => f.name);
    case 'date':
      return value?.start ?? null;
    case 'formula':
      return value ? value[value.type] ?? null : null;
    case 'relation':
      return (value || []).map((r: any) => r.id);
    case 'rollup':
      return null;
    default:
      return value ?? null;
  }
}

/**
 * Properti Notion yang TIDAK termasuk kunci terpetakan → disimpan di Task.customFields.
 * Mengembalikan null bila tidak ada custom field (agar kolom Json bisa dikosongkan).
 */
export function extractCustomFields(
  properties: Record<string, any>,
  mapping?: FieldMapping | null,
): Prisma.InputJsonObject | null {
  const known = knownPropertyNames(mapping);
  const custom: Record<string, unknown> = {};
  for (const [name, prop] of Object.entries(properties)) {
    if (known.has(name)) continue;
    const value = plainValue(prop);
    if (value !== null && value !== undefined && value !== '') custom[name] = value;
  }
  return Object.keys(custom).length > 0 ? (custom as Prisma.InputJsonObject) : null;
}
