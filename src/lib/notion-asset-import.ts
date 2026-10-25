import prisma from '@/lib/prisma';
import { normalizeCanvaViewUrl, parseCanvaUrl, publicViewUrlError } from '@/lib/canva-url';
import { getNotionClient, listChildDatabases, resolveDataSourceId } from '@/lib/notion-provision';

/**
 * Impor aset dari database Notion lain (mis. katalog "Canva Assets") ke Asset Library.
 * Database sumber hanya dibaca: app tetap master, aset baru dikirim ke database mirror Asset Library.
 */

/** Host pemendek link yang boleh diikuti redirect-nya (server tidak mengikuti URL sembarang). */
const SHORT_LINK_HOSTS = new Set(['bit.ly', 'bitly.com', 'canva.link', 'tinyurl.com', 's.id', 't.ly', 'cutt.ly', 'rebrand.ly']);
const IMPORT_LIMIT = 1000;

export type ImportRowStatus = 'ready' | 'duplicate' | 'no_link' | 'unresolved';

export interface ImportPreviewRow {
  /** Id page Notion sumber. */
  key: string;
  title: string;
  tags: string[];
  sourceUrl: string | null;
  previewUrl: string | null;
  categoryId: string | null;
  status: ImportRowStatus;
}

export interface ImportPreview {
  databaseTitle: string;
  properties: { title: string; link: string | null; tags: string | null; category: string | null };
  rows: ImportPreviewRow[];
  truncated: boolean;
}

const hostOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
};

/** Link desain Canva (langsung, atau lewat bit.ly / canva.link) → public view link. Null bila tidak bisa. */
export async function resolveToCanvaViewUrl(raw: string): Promise<string | null> {
  let current = raw.trim();
  if (!current) return null;
  if (!/^https?:\/\//i.test(current)) current = `https://${current}`;
  for (let hop = 0; hop < 5; hop++) {
    if (parseCanvaUrl(current)) return normalizeCanvaViewUrl(current);
    if (!SHORT_LINK_HOSTS.has(hostOf(current))) return null;
    try {
      const res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CAN-Freelance/1.0)' },
        signal: AbortSignal.timeout(8_000),
      });
      const location = res.headers.get('location');
      if (res.status < 300 || res.status >= 400 || !location) return null;
      current = new URL(location, current).toString();
    } catch {
      return null;
    }
  }
  return parseCanvaUrl(current) ? normalizeCanvaViewUrl(current) : null;
}

/** Jalankan `fn` untuk tiap item dengan batas paralel. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

// Kata kunci → jenis kategori; dicek berurutan (3D lebih dulu agar "3D icon" masuk 3D).
const CATEGORY_RULES: { kind: string; match: RegExp }[] = [
  { kind: '3d', match: /\b3d\b/ },
  { kind: 'icon', match: /\b(icon|ikon)\b/ },
  { kind: 'illustration', match: /\b(illustration|ilustrasi|illustrasi)\b/ },
  { kind: 'shape', match: /\b(shape|label|ribbon|banner|badge)\b/ },
  { kind: 'template', match: /\btemplate\b/ },
  { kind: 'mockup', match: /\bmock ?up\b/ },
];

function kindOfCategoryName(name: string): string | null {
  const n = name.trim().toLowerCase();
  if (/^3\s*d/.test(n)) return '3d';
  if (/^(icon|ikon)/.test(n)) return 'icon';
  if (/^(ilustrasi|illustrasi|illustration)/.test(n)) return 'illustration';
  if (/^(shape|label|bentuk)/.test(n)) return 'shape';
  if (n.startsWith('template')) return 'template';
  if (/^mock/.test(n)) return 'mockup';
  return null;
}

/** Cari id database dari link/id: database langsung, atau database pertama di dalam page. */
async function resolveDatabase(client: any, id: string): Promise<{ databaseId: string; title: string }> {
  try {
    const db: any = await client.databases.retrieve({ database_id: id });
    return { databaseId: id, title: (db.title ?? []).map((t: any) => t.plain_text).join('') || 'Tanpa judul' };
  } catch {
    const children = await listChildDatabases(id).catch(() => []);
    if (children[0]) return { databaseId: children[0].id.replace(/-/g, ''), title: children[0].title };
    throw new Error('Database tidak bisa dibuka. Pastikan link benar dan page-nya sudah di-share ke integrasi (••• → Connections).');
  }
}

const pickProp = (props: Record<string, any>, type: string, prefer: RegExp) => {
  const names = Object.keys(props).filter((n) => props[n].type === type);
  return names.find((n) => prefer.test(n)) ?? names[0] ?? null;
};

export async function previewNotionAssetImport(databaseIdOrPage: string, assetDatabaseId: string | null): Promise<ImportPreview> {
  const client: any = await getNotionClient();
  const { databaseId, title: databaseTitle } = await resolveDatabase(client, databaseIdOrPage);
  if (assetDatabaseId && assetDatabaseId.replace(/-/g, '') === databaseId.replace(/-/g, '')) {
    throw new Error('Ini database mirror Asset Library sendiri; pilih database sumber lain.');
  }
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  const ds: any = await client.dataSources.retrieve({ data_source_id: dataSourceId });
  const props: Record<string, any> = ds.properties ?? {};
  const titleProp = pickProp(props, 'title', /.*/)!;
  const linkProp = pickProp(props, 'url', /(public|view|link|canva|url)/i);
  const tagsProp = pickProp(props, 'multi_select', /(tag|label)/i);
  const categoryProp = pickProp(props, 'select', /(kategori|category|jenis|type)/i);

  const pages: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await client.dataSources.query({ data_source_id: dataSourceId, start_cursor: cursor, page_size: 100 });
    pages.push(...res.results);
    cursor = res.has_more && pages.length < IMPORT_LIMIT ? res.next_cursor : undefined;
  } while (cursor);
  const truncated = pages.length >= IMPORT_LIMIT;

  const categories = await prisma.assetCategory.findMany({ where: { archived: false }, orderBy: { sortOrder: 'asc' } });
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const byKind = new Map<string, string>();
  for (const c of categories) {
    const kind = kindOfCategoryName(c.name);
    if (kind && !byKind.has(kind)) byKind.set(kind, c.id);
  }
  const guessCategory = (selectName: string | null, title: string, tags: string[]): string | null => {
    if (selectName) {
      const direct = byName.get(selectName.toLowerCase()) ?? byKind.get(kindOfCategoryName(selectName) ?? '');
      if (direct) return direct;
    }
    const haystack = `${title} ${tags.join(' ')}`.toLowerCase();
    for (const rule of CATEGORY_RULES) {
      if (rule.match.test(haystack) && byKind.has(rule.kind)) return byKind.get(rule.kind)!;
    }
    return null;
  };

  const plain = (rich: any[] | undefined) => (rich ?? []).map((t: any) => t.plain_text).join('').trim();
  const base = pages.map((page) => {
    const p = page.properties ?? {};
    const title = plain(p[titleProp]?.title) || 'Tanpa judul';
    const tags: string[] = tagsProp ? (p[tagsProp]?.multi_select ?? []).map((o: any) => String(o.name)) : [];
    const sourceUrl: string | null = linkProp ? p[linkProp]?.url ?? null : null;
    const selectName: string | null = categoryProp ? p[categoryProp]?.select?.name ?? null : null;
    return { key: page.id as string, title, tags, sourceUrl, categoryId: guessCategory(selectName, title, tags) };
  });

  const resolved = await mapLimit(base, 6, (row) => (row.sourceUrl ? resolveToCanvaViewUrl(row.sourceUrl) : Promise.resolve(null)));
  const designIds = resolved.map((u) => (u ? parseCanvaUrl(u)?.designId : null)).filter((id): id is string => !!id);
  const existing = new Set(
    (await prisma.asset.findMany({ where: { canvaDesignId: { in: designIds } }, select: { canvaDesignId: true } }))
      .map((a) => a.canvaDesignId),
  );
  const seen = new Set<string>();

  const rows: ImportPreviewRow[] = base.map((row, i) => {
    const previewUrl = resolved[i];
    const designId = previewUrl ? parseCanvaUrl(previewUrl)?.designId ?? null : null;
    let status: ImportRowStatus = 'ready';
    if (!row.sourceUrl) status = 'no_link';
    else if (!previewUrl || publicViewUrlError(previewUrl)) status = 'unresolved';
    else if (designId && (existing.has(designId) || seen.has(designId))) status = 'duplicate';
    if (designId) seen.add(designId);
    return { ...row, previewUrl, status };
  });

  return { databaseTitle, properties: { title: titleProp, link: linkProp, tags: tagsProp, category: categoryProp }, rows, truncated };
}
