/**
 * Notion provisioning service (multi-production Fase 4).
 * Membuat & memvalidasi database Task per ProductionUnit. Semua fungsi idempotent:
 * diulang tanpa membuat database atau properti/opsi ganda.
 */

import { Client } from '@notionhq/client';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import {
  DEFAULT_FIELD_ALIASES,
  isFieldEnabled,
  knownPropertyNames,
  type FieldKey,
  type FieldMapping,
} from '@/lib/production-field-mapping';
import { APP_MANAGED_PROPERTIES, IGNORED_FIELD_TYPES, optionsFromNotionSchema, toNotionPropertySchema } from '@/lib/notion-field-types';

type CoreType = 'title' | 'select' | 'multi_select' | 'status' | 'number' | 'date' | 'created_time' | 'url';

interface CoreProperty {
  key: FieldKey;
  name: string;
  type: CoreType;
  /** Sumber opsi dinamis dari Postgres. */
  source?: 'designer' | 'doctype' | 'account' | 'designStatus';
  /** Opsi statis (tidak dinamis). */
  staticOptions?: string[];
  /** Tipe lain yang diterima saat validasi (mis. Template Link bisa files atau url). */
  acceptTypes?: string[];
  /** Tidak wajib: sync punya fallback (mis. created_time halaman). */
  optional?: boolean;
}

/** Properti inti Task DB. Nama = nama default sync (lihat DEFAULT_FIELD_ALIASES). */
export const CORE_PROPERTIES: CoreProperty[] = [
  { key: 'name', name: 'Name', type: 'title' },
  { key: 'designer', name: 'Designer', type: 'select', source: 'designer' },
  { key: 'designerStatus', name: 'Designer Status', type: 'select', staticOptions: ['Active', 'Resign', 'Hold'] },
  { key: 'doctype', name: 'Doctype', type: 'select', source: 'doctype' },
  { key: 'designStatus', name: 'Design Status', type: 'status', source: 'designStatus' },
  { key: 'pages', name: 'Pages', type: 'number' },
  { key: 'qtySubmit', name: 'QTY-Submit', type: 'number' },
  { key: 'license', name: 'License', type: 'select', staticOptions: ['Free', 'Pro'] },
  { key: 'languages', name: 'IND/ENG', type: 'multi_select', staticOptions: ['IND', 'ENG'] },
  { key: 'dateApproved', name: 'Date Aproved', type: 'date' },
  { key: 'taskMonth', name: 'Task Month', type: 'select' },
  { key: 'payrollMonth', name: 'Payroll Month', type: 'select' },
  { key: 'priority', name: 'Priority', type: 'select', staticOptions: ['Low', 'Medium', 'High'] },
  { key: 'createdTime', name: 'Created Time', type: 'created_time', optional: true },
  { key: 'dateStarted', name: 'Date Started', type: 'date' },
  { key: 'dateCompleted', name: 'Date Completd', type: 'date' },
  { key: 'datePO', name: 'Date PO', type: 'date' },
  { key: 'dateReject', name: 'Date Reject', type: 'date' },
  { key: 'poolScore', name: 'Pool Score', type: 'number' },
  { key: 'brand', name: 'Brand', type: 'multi_select', source: 'account' },
  { key: 'canvaLink', name: 'Template Link', type: 'url', acceptTypes: ['url', 'files', 'rich_text'], optional: true },
];

/** Hanya tipe select/multi_select/status yang punya opsi dinamis. */
const OPTION_TYPES = new Set<CoreType>(['select', 'multi_select', 'status']);

async function getNotionClient(): Promise<Client> {
  const config = await prisma.notionConfig.findFirst();
  if (!config) throw new Error('Konfigurasi Notion belum ada. Isi API key di Notion Config dulu.');
  const apiKey = decrypt(config.encryptedApiKey, config.iv);
  if (!apiKey) throw new Error('API key Notion tidak bisa didekripsi.');
  return new Client({ auth: apiKey });
}

/** Opsi dinamis untuk satu properti inti, diambil dari Postgres sesuai platform unit. */
async function dynamicOptions(source: NonNullable<CoreProperty['source']>, platformId: string): Promise<string[]> {
  if (source === 'designer') {
    const rows = await prisma.designer.findMany({ select: { displayName: true }, orderBy: { displayName: 'asc' } });
    return rows.map((r) => r.displayName);
  }
  if (source === 'designStatus') {
    const rows = await prisma.designStatus.findMany({ select: { displayName: true }, orderBy: { displayName: 'asc' } });
    return rows.map((r) => r.displayName);
  }
  if (source === 'doctype') {
    const rows = await prisma.doctype.findMany({
      where: { platformId },
      select: { displayName: true },
      orderBy: { displayName: 'asc' },
    });
    return rows.map((r) => r.displayName);
  }
  const rows = await prisma.account.findMany({
    where: { platformId },
    select: { displayName: true },
    orderBy: { displayName: 'asc' },
  });
  return rows.map((r) => r.displayName);
}

/** Opsi lengkap (statis + dinamis) untuk satu properti inti. */
async function optionsFor(prop: CoreProperty, platformId: string): Promise<string[]> {
  const base = prop.staticOptions ?? [];
  const dynamic = prop.source ? await dynamicOptions(prop.source, platformId) : [];
  return Array.from(new Set([...base, ...dynamic].filter(Boolean)));
}

/** Payload properti Notion untuk satu CoreProperty. */
function toNotionConfig(prop: CoreProperty, options: string[]): Record<string, any> {
  switch (prop.type) {
    case 'title': return { title: {} };
    case 'number': return { number: { format: 'number' } };
    case 'date': return { date: {} };
    case 'created_time': return { created_time: {} };
    case 'url': return { url: {} };
    case 'select': return { select: { options: options.map((name) => ({ name })) } };
    case 'multi_select': return { multi_select: { options: options.map((name) => ({ name })) } };
    case 'status': return { status: { options: options.map((name) => ({ name })) } };
  }
}

/** Nama properti yang sudah dipakai alias default (dipakai untuk mendeteksi "alias"). */
function aliasesOf(prop: CoreProperty): string[] {
  return DEFAULT_FIELD_ALIASES[prop.key].filter((n) => n !== prop.name);
}

export interface ProvisionInput {
  id: string;
  name: string;
  platformId: string;
}

export interface CustomPropertyInput {
  name: string;
  type: string;
  options?: { name: string; color?: string }[];
}

/**
 * Membuat database Task baru di bawah parentPageId. Mengembalikan id database.
 * Field inti yang dimatikan (`disabled`) tidak dibuat; `customFields` ikut dibuat.
 */
export async function createTaskDatabase(
  parentPageId: string,
  unit: ProvisionInput,
  opts: { disabled?: string[]; customFields?: CustomPropertyInput[] } = {},
): Promise<string> {
  const client = await getNotionClient();
  const properties: Record<string, any> = {};
  for (const field of opts.customFields ?? []) {
    properties[field.name] = toNotionPropertySchema(field.type, field.options);
  }
  for (const prop of CORE_PROPERTIES) {
    if (!isFieldEnabled(prop.key, opts.disabled)) continue;
    const options = OPTION_TYPES.has(prop.type) ? await optionsFor(prop, unit.platformId) : [];
    properties[prop.name] = toNotionConfig(prop, options);
  }

  const created: any = await client.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: unit.name } }],
    initial_data_source: { properties },
  } as any);
  return created.id as string;
}

export interface SchemaReport {
  matched: string[];
  aliased: { expected: string; found: string }[];
  missing: string[];
  typeMismatch: { name: string; expected: string; found: string }[];
  /** Properti Notion di database yang tidak dikenal (bukan core) — dibiarkan apa adanya. */
  extra: string[];
}

async function resolveDataSourceId(client: Client, databaseId: string): Promise<string> {
  const db: any = await client.databases.retrieve({ database_id: databaseId });
  return db.data_sources?.[0]?.id || databaseId;
}

async function retrieveSchema(client: Client, databaseId: string): Promise<Record<string, any>> {
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  const ds: any = await (client as any).dataSources.retrieve({ data_source_id: dataSourceId });
  return ds.properties || {};
}

/** Nama kandidat untuk properti inti: mapping production dulu, lalu nama default dan aliasnya. */
function coreCandidates(prop: CoreProperty, mapping?: FieldMapping | null): string[] {
  const configured = mapping?.[prop.key];
  const custom = Array.isArray(configured) ? configured : configured ? [configured] : [];
  return [...custom, prop.name, ...aliasesOf(prop)];
}

/**
 * Bandingkan database Notion yang ada dengan skema inti. Hanya membaca.
 * `mapping` = nama kustom per field inti; field inti yang `disabled` tidak dihitung hilang.
 */
export async function validateExistingDatabase(
  databaseId: string,
  opts: { mapping?: FieldMapping | null; disabled?: string[] } = {},
): Promise<SchemaReport> {
  const client = await getNotionClient();
  const actual = await retrieveSchema(client, databaseId);
  const report: SchemaReport = { matched: [], aliased: [], missing: [], typeMismatch: [], extra: [] };
  const claimed = new Set<string>();

  for (const prop of CORE_PROPERTIES) {
    const foundName = coreCandidates(prop, opts.mapping).find((name) => actual[name]);

    if (!foundName) {
      if (!prop.optional && isFieldEnabled(prop.key, opts.disabled)) report.missing.push(prop.name);
      continue;
    }
    claimed.add(foundName);
    const foundType = actual[foundName].type;
    const accepted = prop.acceptTypes ?? [prop.type];
    if (!accepted.includes(foundType)) {
      report.typeMismatch.push({ name: prop.name, expected: prop.type, found: foundType });
    } else if (foundName === prop.name) {
      report.matched.push(prop.name);
    } else {
      report.aliased.push({ expected: prop.name, found: foundName });
    }
  }

  report.extra = Object.keys(actual).filter((name) => !claimed.has(name) && !CORE_PROPERTIES.some((p) => p.name === name));
  return report;
}

/**
 * Tambahkan properti inti yang hilang ("Tambahkan"). Properti yang sudah ada
 * (termasuk alias) tidak disentuh, sehingga aman diulang.
 */
export async function addMissingProperties(databaseId: string, platformId: string, missing: string[]): Promise<string[]> {
  if (missing.length === 0) return [];
  const client = await getNotionClient();
  const payload: Record<string, any> = {};
  for (const prop of CORE_PROPERTIES) {
    if (!missing.includes(prop.name)) continue;
    const options = OPTION_TYPES.has(prop.type) ? await optionsFor(prop, platformId) : [];
    payload[prop.name] = toNotionConfig(prop, options);
  }
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  await (client as any).dataSources.update({ data_source_id: dataSourceId, properties: payload });
  return Object.keys(payload);
}

/**
 * Pastikan opsi select/multi_select/status berisi `names` (merge, tanpa menghapus opsi lama).
 * Dipanggil saat Designer/Doctype/Account baru ditambahkan di platform.
 */
export async function ensureSelectOptions(
  databaseId: string,
  propertyName: string,
  names: string[],
): Promise<{ added: string[] }> {
  const client = await getNotionClient();
  const actual = await retrieveSchema(client, databaseId);
  const prop = actual[propertyName];
  if (!prop || !OPTION_TYPES.has(prop.type)) return { added: [] };

  const current: { name: string }[] = prop[prop.type]?.options || [];
  const existing = new Set(current.map((o) => o.name.toLowerCase()));
  const toAdd = names.filter((n) => n && !existing.has(n.toLowerCase()));
  if (toAdd.length === 0) return { added: [] };

  const merged = [...current.map((o) => ({ name: o.name })), ...toAdd.map((name) => ({ name }))];
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  await (client as any).dataSources.update({
    data_source_id: dataSourceId,
    properties: { [propertyName]: { [prop.type]: { options: merged } } },
  });
  return { added: toAdd };
}

/** Pastikan properti URL (mis. "Upload Link" untuk platform Dropbox) ada. Idempotent. */
export async function ensureUrlProperty(databaseId: string, name: string): Promise<boolean> {
  const client = await getNotionClient();
  const actual = await retrieveSchema(client, databaseId);
  if (actual[name]) return false;
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  await (client as any).dataSources.update({
    data_source_id: dataSourceId,
    properties: { [name]: { url: {} } },
  });
  return true;
}

/** Tulis URL ke properti Notion halaman task (dipakai saat task dibuat di platform Dropbox). */
export async function setNotionPageUrl(pageId: string, propertyName: string, url: string): Promise<void> {
  const client = await getNotionClient();
  await client.pages.update({
    page_id: pageId,
    properties: { [propertyName]: { url } },
  } as any);
}

export interface NotionPropertyInfo {
  id: string;
  name: string;
  type: string;
  options: { name: string; color?: string }[] | null;
}

/** Semua properti database (nama, id, tipe, opsi). Hanya membaca. */
export async function listDatabaseProperties(databaseId: string): Promise<NotionPropertyInfo[]> {
  const client = await getNotionClient();
  const actual = await retrieveSchema(client, databaseId);
  return Object.entries(actual).map(([name, prop]: [string, any]) => ({
    id: prop.id,
    name,
    type: prop.type,
    options: optionsFromNotionSchema(prop),
  }));
}

/** Properti di luar field inti (kandidat field tambahan). Tipe khusus Notion dan properti output Dropbox dilewati. */
export async function readExtraProperties(databaseId: string, mapping?: FieldMapping | null): Promise<NotionPropertyInfo[]> {
  const known = knownPropertyNames(mapping);
  const props = await listDatabaseProperties(databaseId);
  return props.filter((p) => !known.has(p.name) && !IGNORED_FIELD_TYPES.has(p.type) && !APP_MANAGED_PROPERTIES.has(p.name));
}

/**
 * Pastikan properti field tambahan ada. Idempotent: nama yang sudah ada dengan tipe sama dipakai apa adanya
 * (opsi baru digabung); tipe berbeda → error. Mengembalikan id properti Notion.
 */
export async function ensureCustomProperty(databaseId: string, field: CustomPropertyInput): Promise<string | null> {
  const client = await getNotionClient();
  const actual = await retrieveSchema(client, databaseId);
  const existing = actual[field.name];
  if (existing) {
    if (existing.type !== field.type) {
      throw new Error(`Properti "${field.name}" sudah ada di Notion dengan tipe ${existing.type}.`);
    }
    if (field.options?.length) await ensureSelectOptions(databaseId, field.name, field.options.map((o) => o.name));
    return existing.id ?? null;
  }
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  await (client as any).dataSources.update({
    data_source_id: dataSourceId,
    properties: { [field.name]: toNotionPropertySchema(field.type, field.options) },
  });
  const after = await retrieveSchema(client, databaseId);
  return after[field.name]?.id ?? null;
}

/** Ganti nama properti di Notion. Data di kolom itu tetap utuh. */
export async function renameProperty(databaseId: string, oldName: string, newName: string): Promise<void> {
  const client = await getNotionClient();
  const actual = await retrieveSchema(client, databaseId);
  if (!actual[oldName]) throw new Error(`Properti "${oldName}" tidak ditemukan di Notion.`);
  if (actual[newName]) throw new Error(`Nama "${newName}" sudah dipakai properti lain di Notion.`);
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  await (client as any).dataSources.update({
    data_source_id: dataSourceId,
    properties: { [oldName]: { name: newName } },
  });
}

/** Ambil ID Notion (32 hex) dari ID atau link halaman; null bila tidak ada ID yang valid. */
export function normalizeNotionId(input: string): string | null {
  const compact = input.trim().split('?')[0].replace(/-/g, '');
  const match = compact.match(/[0-9a-f]{32}(?![0-9a-f])/i);
  return match ? match[0].toLowerCase() : null;
}

/** Pastikan halaman induk bisa dibaca integrasi. Mengembalikan judul halaman. */
export async function checkParentPage(pageId: string): Promise<string> {
  const client = await getNotionClient();
  let page: any;
  try {
    page = await client.pages.retrieve({ page_id: pageId });
  } catch {
    throw new Error('Page tidak bisa dibuka. Pastikan page sudah di-share ke integrasi (••• → Connections).');
  }
  const titleProp: any = Object.values(page.properties ?? {}).find((p: any) => p.type === 'title');
  return titleProp?.title?.map((t: any) => t.plain_text).join('') || 'Tanpa judul';
}

/** Database yang ada langsung di dalam page (blok child_database). Hanya membaca. */
export async function listChildDatabases(pageId: string): Promise<{ id: string; title: string }[]> {
  const client = await getNotionClient();
  const found: { id: string; title: string }[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await client.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    for (const block of res.results) {
      if (block.type === 'child_database') found.push({ id: block.id, title: block.child_database?.title || 'Tanpa judul' });
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return found;
}
