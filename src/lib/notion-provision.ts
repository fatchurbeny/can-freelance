/**
 * Notion provisioning service (multi-production Fase 4).
 * Membuat & memvalidasi database Task per ProductionUnit. Semua fungsi idempotent:
 * diulang tanpa membuat database atau properti/opsi ganda.
 */

import { Client } from '@notionhq/client';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { DEFAULT_FIELD_ALIASES, type FieldKey } from '@/lib/production-field-mapping';

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

/** Membuat database Task baru di bawah parentPageId. Mengembalikan id database. */
export async function createTaskDatabase(parentPageId: string, unit: ProvisionInput): Promise<string> {
  const client = await getNotionClient();
  const properties: Record<string, any> = {};
  for (const prop of CORE_PROPERTIES) {
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

/** Bandingkan database Notion yang ada dengan skema inti. Hanya membaca. */
export async function validateExistingDatabase(databaseId: string): Promise<SchemaReport> {
  const client = await getNotionClient();
  const actual = await retrieveSchema(client, databaseId);
  const report: SchemaReport = { matched: [], aliased: [], missing: [], typeMismatch: [], extra: [] };
  const claimed = new Set<string>();

  for (const prop of CORE_PROPERTIES) {
    let foundName: string | undefined;
    if (actual[prop.name]) foundName = prop.name;
    else foundName = aliasesOf(prop).find((alias) => actual[alias]);

    if (!foundName) {
      if (!prop.optional) report.missing.push(prop.name);
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
