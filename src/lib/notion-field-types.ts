/**
 * Katalog tipe properti Notion untuk field tambahan per production (Task.customFields).
 * Dipakai server (konversi nilai → payload Notion) dan client (komponen per tipe).
 */

export interface NotionFieldTypeInfo {
  label: string;
  /** Nilai bisa diedit dari app dan dikirim ke Notion. */
  editable: boolean;
  /** Properti bisa dibuat dari app (drawer Tambah Field). */
  creatable: boolean;
  /** Bisa dipakai sebagai filter board (putaran berikutnya). */
  filterable: boolean;
  /** Punya daftar opsi. */
  hasOptions?: boolean;
}

export const NOTION_FIELD_TYPES: Record<string, NotionFieldTypeInfo> = {
  rich_text: { label: 'Teks', editable: true, creatable: true, filterable: false },
  number: { label: 'Angka', editable: true, creatable: true, filterable: false },
  select: { label: 'Select', editable: true, creatable: true, filterable: true, hasOptions: true },
  multi_select: { label: 'Multi-select', editable: true, creatable: true, filterable: true, hasOptions: true },
  status: { label: 'Status', editable: true, creatable: false, filterable: true, hasOptions: true },
  date: { label: 'Tanggal', editable: true, creatable: true, filterable: false },
  checkbox: { label: 'Checkbox', editable: true, creatable: true, filterable: true },
  url: { label: 'URL', editable: true, creatable: true, filterable: false },
  email: { label: 'Email', editable: true, creatable: true, filterable: false },
  phone_number: { label: 'Telepon', editable: true, creatable: true, filterable: false },
  people: { label: 'Orang', editable: false, creatable: false, filterable: false },
  files: { label: 'File', editable: false, creatable: false, filterable: false },
  formula: { label: 'Formula', editable: false, creatable: false, filterable: false },
  relation: { label: 'Relasi', editable: false, creatable: false, filterable: false },
  rollup: { label: 'Rollup', editable: false, creatable: false, filterable: false },
  unique_id: { label: 'ID unik', editable: false, creatable: false, filterable: false },
  created_time: { label: 'Dibuat', editable: false, creatable: false, filterable: false },
  last_edited_time: { label: 'Terakhir diubah', editable: false, creatable: false, filterable: false },
  created_by: { label: 'Dibuat oleh', editable: false, creatable: false, filterable: false },
  last_edited_by: { label: 'Diubah oleh', editable: false, creatable: false, filterable: false },
};

/** Properti yang ditulis & ditampilkan app sendiri (output Dropbox), bukan field tambahan. */
export const UPLOAD_LINK_PROPERTY = 'Upload Link';
export const DROPBOX_LINK_PROPERTY = 'Dropbox Link';
export const APP_MANAGED_PROPERTIES = new Set([UPLOAD_LINK_PROPERTY, DROPBOX_LINK_PROPERTY]);

/** Tipe yang tidak pernah ditampilkan di app (fitur khusus Notion). */
export const IGNORED_FIELD_TYPES = new Set(['button', 'verification']);

export function fieldTypeInfo(type: string): NotionFieldTypeInfo | undefined {
  return NOTION_FIELD_TYPES[type];
}

export function isEditableFieldType(type: string): boolean {
  return !!NOTION_FIELD_TYPES[type]?.editable;
}

export const CREATABLE_FIELD_TYPES = Object.entries(NOTION_FIELD_TYPES)
  .filter(([, info]) => info.creatable)
  .map(([type]) => type);

/** Skema properti Notion untuk membuat field baru. */
export function toNotionPropertySchema(type: string, options: { name: string; color?: string }[] = []): Record<string, any> {
  const opts = options.map((o) => (o.color ? { name: o.name, color: o.color } : { name: o.name }));
  switch (type) {
    case 'number': return { number: { format: 'number' } };
    case 'select': return { select: { options: opts } };
    case 'multi_select': return { multi_select: { options: opts } };
    case 'status': return { status: { options: opts } };
    default: return { [type]: {} };
  }
}

/**
 * Nilai dari app (bentuk sama dengan Task.customFields, lihat plainValue di production-field-mapping)
 * → payload properti Notion untuk pages.create/update. Undefined = tipe tidak bisa ditulis.
 */
export function toNotionPropertyValue(type: string, value: unknown): Record<string, any> | undefined {
  const empty = value === null || value === undefined || value === '';
  switch (type) {
    case 'rich_text':
      return { rich_text: empty ? [] : [{ text: { content: String(value).slice(0, 2000) } }] };
    case 'number': {
      const n = Number(value);
      return { number: empty || !Number.isFinite(n) ? null : n };
    }
    case 'select':
      return { select: empty ? null : { name: String(value) } };
    case 'status':
      return empty ? undefined : { status: { name: String(value) } };
    case 'multi_select': {
      const list = Array.isArray(value) ? value : empty ? [] : [value];
      return { multi_select: list.filter((v) => v !== '' && v != null).map((v) => ({ name: String(v) })) };
    }
    case 'date':
      return { date: empty ? null : { start: String(value) } };
    case 'checkbox':
      return { checkbox: value === true || value === 'true' };
    case 'url':
      return { url: empty ? null : String(value) };
    case 'email':
      return { email: empty ? null : String(value) };
    case 'phone_number':
      return { phone_number: empty ? null : String(value) };
    default:
      return undefined;
  }
}

/** Opsi dari skema properti Notion (select / multi_select / status). */
export function optionsFromNotionSchema(prop: any): { name: string; color?: string }[] | null {
  const type = prop?.type;
  if (type !== 'select' && type !== 'multi_select' && type !== 'status') return null;
  return (prop[type]?.options || []).map((o: any) => ({ name: o.name, color: o.color }));
}
