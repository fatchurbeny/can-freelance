import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildUrl, fetchAllPages, PaginationError, parseCanvaJson } from '../lib/canva.mjs';
import { collectBrand } from '../lib/collect-brand.mjs';
import { DAY_MS, rangeChunks, startOfUtcDay } from '../lib/util.mjs';

process.env.CANVA_INSIGHTS_LOG = '/dev/null';

const NOW = Date.UTC(2026, 9, 28, 1, 15); // 28 Okt 2026 08:15 WIB

/**
 * Canva palsu: `limit` menghitung baris, token `B` = offset base36, dan hanya parameter
 * `pageParam` yang benar-benar menggeser halaman (parameter lain diabaikan, seperti server asli).
 */
function fakeCanva({ pageParam = 'cursor', templates = 60 } = {}) {
  const ids = Array.from({ length: templates }, (_, i) => `EAH${String(i).padStart(8, '0')}`);
  const calls = [];
  async function fetchJson(endpoint, params) {
    calls.push({ endpoint, params });
    let rows;
    const from = Number(params.fromDate ?? params.after);
    const to = Number(params.toDate ?? NOW);
    const days = [];
    for (let d = from; d < to; d += DAY_MS) days.push(d);
    if (endpoint === 'content.by_brand') rows = ids.map((e) => ({ e, C: 1, D: 0, j: from }));
    else if (endpoint === 'content.by_content') {
      rows = [];
      for (const d of days) for (const e of [params.contentIds].flat()) for (const F of ['B', 'C']) rows.push({ e, k: d, l: d + DAY_MS, C: 2, D: 1, F });
    } else if (endpoint === 'brand.breakdowns') rows = days.flatMap((d) => ['B', 'C'].map((F) => ({ e: d, f: d + DAY_MS, C: 5, D: 2, F })));
    else if (endpoint === 'tier_scores') rows = days.map((d) => ({ B: d, C: 'LOW' }));
    else rows = [params.id].flat().map((A) => ({ A, R: `Template ${A}` }));

    const limit = Number(params.limit ?? 1000);
    const offset = params[pageParam] ? parseInt(params[pageParam], 36) : 0;
    const page = rows.slice(offset, offset + limit);
    const next = offset + limit < rows.length ? (offset + limit).toString(36) : undefined;
    return next ? { A: page, B: next } : { A: page };
  }
  return { fetchJson, calls, ids };
}

function fakeServer({ known = [], missingMetadata = [] } = {}) {
  const batches = [];
  return {
    batches,
    async knownIds() {
      return { ids: known, missingMetadata };
    },
    async ingest(batch) {
      batches.push(batch);
      return { status: 'PARSED', rowCount: batch.payload.A.length };
    },
  };
}

test('buildUrl mengulang parameter array (contentIds, contentRoyalties)', () => {
  const url = buildUrl('content.by_content', { brandId: 'BAE1', contentIds: ['EA1', 'EA2'], contentRoyalties: ['B', 'C'] });
  assert.equal(
    url,
    'https://www.canva.com/_ajax/creatorinsight/content/usages?brandId=BAE1&contentIds=EA1&contentIds=EA2&contentRoyalties=B&contentRoyalties=C',
  );
});

test('parseCanvaJson membuang prefix anti-hijacking', () => {
  assert.deepEqual(parseCanvaJson(`'"])}while(1);</x>//{"A":[1]}`), { A: [1] });
  assert.deepEqual(parseCanvaJson('{"A":[]}'), { A: [] });
});

test('rangeChunks memecah rentang tanpa celah', () => {
  const from = Date.UTC(2026, 0, 1);
  const chunks = rangeChunks(from, from + 100 * DAY_MS, 45);
  assert.deepEqual(chunks.map(([a, b]) => (b - a) / DAY_MS), [45, 45, 10]);
  assert.equal(chunks.at(-1)[1], from + 100 * DAY_MS);
});

test('fetchAllPages mendeteksi parameter paginasi lalu memakainya', async () => {
  const canva = fakeCanva({ pageParam: 'cursor' });
  const pagination = { param: null, detected: false };
  const pages = [];
  await fetchAllPages({
    fetchJson: canva.fetchJson,
    endpoint: 'content.by_brand',
    params: { fromDate: NOW - DAY_MS, toDate: NOW, limit: '25' },
    pagination,
    onPage: async (query, payload) => pages.push({ query, n: payload.A.length }),
  });
  assert.equal(pagination.param, 'cursor');
  assert.equal(pagination.detected, true);
  assert.deepEqual(pages.map((p) => p.n), [25, 25, 10]);
  assert.equal(pages[1].query.cursor, (25).toString(36));
  // continuation & continuationToken dicoba lebih dulu (tidak menggeser halaman), lalu cursor.
  assert.deepEqual(canva.calls.slice(1, 4).map((c) => Object.keys(c.params).at(-1)), ['continuation', 'continuationToken', 'cursor']);
});

test('fetchAllPages gagal jelas bila tidak ada parameter yang menggeser halaman', async () => {
  const canva = fakeCanva({ pageParam: 'somethingElse' });
  const pagination = { param: null, detected: false };
  const pages = [];
  await assert.rejects(
    fetchAllPages({
      fetchJson: canva.fetchJson,
      endpoint: 'content.by_brand',
      params: { fromDate: NOW - DAY_MS, toDate: NOW, limit: '25' },
      pagination,
      onPage: async (q, p) => pages.push(p),
    }),
    PaginationError,
  );
  assert.equal(pages.length, 1, 'halaman pertama tetap dikirim');
});

test('collectBrand: urutan kerja, semua halaman, metadata hanya template baru', async () => {
  const canva = fakeCanva({ pageParam: 'continuation', templates: 60 });
  const server = fakeServer({ known: ['EAH00000000', 'EAHold000001'], missingMetadata: ['EAHold000001'] });
  const pagination = { param: 'continuation', detected: false };
  const summary = await collectBrand({
    brand: { slug: 'zahra', brandId: 'BAEtJgfxnTk' },
    fetchJson: canva.fetchJson,
    server,
    pagination,
    runId: 'run-1',
    now: NOW,
  });

  const order = [...new Set(server.batches.map((b) => b.endpoint))];
  assert.deepEqual(order, ['content.by_brand', 'content.by_content', 'brand.breakdowns', 'tier_scores', 'templates']);
  assert.ok(server.batches.every((b) => b.brandId === 'BAEtJgfxnTk' && b.runId === 'run-1'));

  // 60 template dari BY_BRAND + 1 template lama yang hanya dikenal server = 61.
  assert.equal(summary.templates, 61);
  const daily = server.batches.filter((b) => b.endpoint === 'content.by_content').flatMap((b) => b.payload.A);
  assert.equal(daily.length, 61 * 14 * 2, '14 hari × Free/Pro untuk tiap template, lintas halaman');
  assert.equal(new Set(daily.map((r) => r.k)).size, 14);
  const lastDay = Math.max(...daily.map((r) => r.k));
  assert.equal(lastDay, startOfUtcDay(NOW), 'hari ini (UTC) ikut diminta');
  assert.ok(
    canva.calls.filter((c) => c.endpoint === 'content.by_content').every((c) => [c.params.contentIds].flat().length <= 50),
    'contentIds per request ≤ 50',
  );

  const breakdowns = server.batches.filter((b) => b.endpoint === 'brand.breakdowns').flatMap((b) => b.payload.A);
  assert.equal(breakdowns.length, 28);

  // Metadata: 59 template baru (bukan EAH00000000 yang sudah dikenal) + EAHold000001 yang belum berjudul.
  const meta = server.batches.filter((b) => b.endpoint === 'templates').flatMap((b) => b.payload.A.map((r) => r.A));
  assert.equal(meta.length, 60);
  assert.ok(!meta.includes('EAH00000000'));
  assert.ok(meta.includes('EAHold000001'));
});

test('collectBrand --backfill memecah 365 hari per 90 (harian) dan 45 (breakdowns)', async () => {
  const canva = fakeCanva({ pageParam: 'continuation', templates: 3 });
  const server = fakeServer();
  await collectBrand({
    brand: { slug: 'antler', brandId: 'BAEZG0o0gf4' },
    fetchJson: canva.fetchJson,
    server,
    pagination: { param: 'continuation' },
    backfill: true,
    now: NOW,
  });
  const firstPages = (endpoint) => canva.calls.filter((c) => c.endpoint === endpoint && !c.params.continuation);
  assert.equal(firstPages('content.by_content').length, 5); // ceil(365 / 90)
  assert.equal(firstPages('brand.breakdowns').length, 9); // ceil(365 / 45)
  const daily = server.batches.filter((b) => b.endpoint === 'content.by_content').flatMap((b) => b.payload.A);
  assert.equal(new Set(daily.map((r) => r.k)).size, 365);
});
