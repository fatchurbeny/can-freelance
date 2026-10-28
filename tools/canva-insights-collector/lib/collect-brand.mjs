import { fetchAllPages } from './canva.mjs';
import { chunk, DAY_MS, log, rangeChunks, startOfUtcDay } from './util.mjs';

/** Rentang harian yang diambil ulang tiap run (spek §3.1 butir 5). */
export const DAILY_DAYS = 14;
/** Rentang BY_BRAND untuk menemukan template aktif (spek §5.3 langkah 3). */
export const DISCOVERY_DAYS = 90;
/** --backfill: sejarah maksimal yang diambil, dipecah per potongan (spek §5.3 langkah 5). */
export const BACKFILL_DAYS = 365;

/**
 * Urutan kerja satu brand (spek §5.3). Tidak tahu soal browser: `fetchJson` dari sesi Canva,
 * `server` dari klien API (atau klien dry-run). Mengembalikan ringkasan untuk laporan run.
 */
export async function collectBrand({ brand, fetchJson, server, pagination, runId, backfill = false, now = Date.now() }) {
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
  const known = await server.knownIds(brandId);
  const knownSet = new Set(known.ids);
  known.ids.forEach((id) => ids.add(id));
  summary.templates = ids.size;
  log('INFO', `${brand.slug}: ${ids.size} template (${known.ids.length} dikenal server)`);

  // 3. BY_CONTENT per 50 template, harian + Free/Pro.
  const dailyRanges = backfill
    ? rangeChunks(toDate - BACKFILL_DAYS * DAY_MS, toDate, 90)
    : [[toDate - DAILY_DAYS * DAY_MS, toDate]];
  for (const group of chunk([...ids].sort(), 50)) {
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
  await pages('tier_scores', {
    brand: brandId,
    after: toDate - (backfill ? BACKFILL_DAYS : DAILY_DAYS) * DAY_MS,
    limit: '100',
  });

  // 6. Metadata hanya untuk template baru / yang belum punya judul di server.
  const missing = new Set(known.missingMetadata);
  for (const id of ids) if (!knownSet.has(id)) missing.add(id);
  for (const group of chunk([...missing].sort(), 50)) {
    await pages('templates', { id: group });
  }

  return summary;
}
