import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServerClient, migrateBaseUrl } from '../lib/server.js';

function fakeFetch(responses) {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status });
  };
  return calls;
}
const client = (retries) =>
  createServerClient({ baseUrl: 'https://x.test/app/', token: 't', retryDelays: [0, 0], onRetry: (...a) => retries.push(a) });

test('ingest mencoba lagi saat 502 dan jaringan putus, lalu berhasil', async () => {
  const calls = fakeFetch([{ status: 502 }, new TypeError('Failed to fetch'), { status: 200, body: { status: 'PARSED' } }]);
  const retries = [];
  assert.deepEqual(await client(retries).ingest({}), { status: 'PARSED' });
  assert.equal(calls.length, 3);
  assert.deepEqual(retries.map((r) => r[0]), ['Server 502', 'Failed to fetch']);
});

test('ingest menyerah setelah jatah coba habis', async () => {
  fakeFetch([{ status: 502 }, { status: 502 }, { status: 502 }]);
  await assert.rejects(client([]).ingest({}), /Ingest gagal \(502\)/);
});

test('ingest tidak mencoba lagi untuk 400', async () => {
  const calls = fakeFetch([{ status: 400, body: { error: 'bad' } }]);
  await assert.rejects(client([]).ingest({}), /Ingest gagal \(400\): bad/);
  assert.equal(calls.length, 1);
});

test('migrateBaseUrl memindahkan domain lama, sisanya tidak diubah', () => {
  assert.equal(migrateBaseUrl('https://portal.fatchurbeny.com'), 'https://portal.meetimpro.site');
  assert.equal(migrateBaseUrl('https://portal.fatchurbeny.com/can-freelance'), 'https://portal.meetimpro.site');
  assert.equal(migrateBaseUrl('https://portal.meetimpro.site'), 'https://portal.meetimpro.site');
  assert.equal(migrateBaseUrl('http://127.0.0.1:3002'), 'http://127.0.0.1:3002');
  assert.equal(migrateBaseUrl('bukan url'), 'bukan url');
  assert.equal(migrateBaseUrl(undefined), undefined);
});
