import { fetchAllPages } from './canva.js';
import { chunk, DAY_MS, log, rangeChunks, startOfUtcDay } from './util.js';

/** Rentang harian yang diambil ulang tiap run (spek §3.1 butir 5). */
export const DAILY_DAYS = 14;
/** Rentang BY_BRAND untuk menemukan template aktif (spek §5.3 langkah 3). */
export const DISCOVERY_DAYS = 90;
/** --backfill: sejarah maksimal yang diambil, dipecah per potongan (spek §5.3 langkah 5). */
export const BACKFILL_DAYS = 365;

/**
 * Parameter yang dikirim dashboard Creator sendiri ke endpoint templates (HAR zahra.art). Tanpa ini
 * Canva hanya mengembalikan sebagian template dan tanpa URL thumbnail (`m[0].C[0].A`).
 */
const TEMPLATE_PARAMS = {
  staging: 'false',
  deleted: 'false',
  forcePrerequisites: 'canva_pro',
  filesFromPage: '0',
  filesToPage: '1',
  includeContentFiles: 'false',
  previewFileSizes: '200',
  previewFileTypes: 'A',
  fileLocationType: 'B',
  mode: 'C',
  limit: '100',
};

/** Langkah sinkron, urut; `onStage` menerima key ini untuk progres di popup. */
export const STAGES = [
  { key: 'discover', label: 'Daftar template aktif (90 hari)' },
  { key: 'known', label: 'Gabung template yang dikenal dashboard' },
  { key: 'daily', label: 'Angka harian per template' },
  { key: 'brand', label: 'Total harian akun' },
  { key: 'tier', label: 'Skor tier' },
  { key: 'meta', label: 'Judul & thumbnail template baru' },
];

/**
 * Urutan kerja satu brand (spek §5.3). Tidak tahu soal browser: `fetchJson` dari sesi Canva,
 * `server` dari klien API (atau klien dry-run). Mengembalikan ringkasan untuk laporan run.
 * `onStage(key, detail)` dipanggil saat langkah berganti (detail harian: `{ group, groups }`).
 */
export async function collectBrand({ brand, fetchJson, server, pagination, runId, backfill = false, now = Date.now(), onStage = () => {} }) {
  const brandId = brand.brandId;
  const toDate = startOfUtcDay(now) + DAY_MS; // eksklusif: termasuk hari ini (UTC)
  const summary = { batches: 0, rejected: 0, rows: 0, templates: 0 };

  async function post(endpoint, query, payload) {
    const result = await server.ingest({ brandId, endpoint, query, payload, runId });
    summary.batches++;
    summary.rows += payload?.A?.length ?? 0;
    if (result.status === 'REJECTED') {
      summary.rejected++;
      log('WARN', `${brand.slug} ${endpoint} REJECTED`, { error: result.error, batchId: result.batchId });
    }
  }

  const pages = (endpoint, params, onRows) =>
    fetchAllPages({
      fetchJson,
      endpoint,
      params,
      pagination,
      onPage: async (query, payload) => {
        onRows?.(payload?.A ?? []);
        await post(endpoint, query, payload);
      },
    });

  // 1. BY_BRAND 90 hari → daftar template aktif.
  onStage('discover');
  const ids = new Set();
  await pages(
    'content.by_brand',
    {
      type: 'BY_BRAND',
      brandId,
      fromDate: toDate - DISCOVERY_DAYS * DAY_MS,
      toDate,
      contentType: 'B',
      sortOrder: 'C',
      orderBy: 'B',
      limit: '50',
    },
    (rows) => rows.forEach((r) => r.e && ids.add(r.e)),
  );

  // 2. Gabung dengan template yang sudah dikenal server (template sepi tetap diambil hariannya).
  onStage('known');
  const known = await server.knownIds(brandId);
  const knownSet = new Set(known.ids);
  known.ids.forEach((id) => ids.add(id));
  summary.templates = ids.size;
  log('INFO', `${brand.slug}: ${ids.size} template (${known.ids.length} dikenal server)`);

  // 3. BY_CONTENT per 50 template, harian + Free/Pro.
  const dailyRanges = backfill
    ? rangeChunks(toDate - BACKFILL_DAYS * DAY_MS, toDate, 90)
    : [[toDate - DAILY_DAYS * DAY_MS, toDate]];
  const groups = chunk([...ids].sort(), 50);
  for (const [g, group] of groups.entries()) {
    onStage('daily', { group: g + 1, groups: groups.length });
    for (const [fromDate, rangeTo] of dailyRanges) {
      await pages('content.by_content', {
        type: 'BY_CONTENT',
        brandId,
        contentType: 'B',
        rollupPeriod: 'B',
        fromDate,
        toDate: rangeTo,
        limit: '100',
        contentIds: group,
        contentRoyalties: ['B', 'C'],
      });
    }
  }

  // 4. Total harian akun. limit=100 baris = 50 hari (2 baris per hari), jadi backfill per 45 hari.
  const brandRanges = backfill
    ? rangeChunks(toDate - BACKFILL_DAYS * DAY_MS, toDate, 45)
    : [[toDate - DAILY_DAYS * DAY_MS, toDate]];
  onStage('brand');
  for (const [fromDate, rangeTo] of brandRanges) {
    await pages('brand.breakdowns', {
      brandId,
      rollupPeriod: 'B',
      fromDate,
      toDate: rangeTo,
      limit: '100',
      contentType: 'B',
      contentRoyalties: ['B', 'C'],
    });
  }

  // 5. Skor tier.
  onStage('tier');
  await pages('tier_scores', {
    brand: brandId,
    after: toDate - (backfill ? BACKFILL_DAYS : DAILY_DAYS) * DAY_MS,
    limit: '100',
  });

  // 6. Metadata hanya untuk template baru / yang belum punya judul di server.
  onStage('meta');
  const missing = new Set(known.missingMetadata);
  for (const id of ids) if (!knownSet.has(id)) missing.add(id);
  for (const group of chunk([...missing].sort(), 50)) {
    await pages('templates', { id: group, ...TEMPLATE_PARAMS });
  }

  return summary;
}
