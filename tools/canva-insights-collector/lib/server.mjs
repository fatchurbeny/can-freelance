import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Klien API dashboard can-freelance (spek §5.1, §5.2). Token hanya dikirim di header Authorization. */

export class ServerAuthError extends Error {
  constructor(status) {
    super(`API dashboard menolak token (${status}); cek config.token = INSIGHTS_INGEST_TOKEN server`);
    this.name = 'ServerAuthError';
  }
}

export function createServerClient(cfg) {
  async function call(url, init = {}) {
    const res = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json', ...init.headers },
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) throw new ServerAuthError(res.status);
    return { status: res.status, body };
  }

  return {
    async startRun(brandId) {
      const { status, body } = await call(cfg.runsUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'start', brandId, host: cfg.host ?? null }),
      });
      if (status !== 200 || !body.runId) throw new Error(`Gagal memulai run (${status}): ${body.error ?? ''}`);
      return body.runId;
    },

    async finishRun(runId, status, message) {
      if (!runId) return;
      await call(cfg.runsUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'finish', runId, status, message: message ?? null }),
      });
    },

    async knownIds(brandId) {
      const url = `${cfg.knownIdsUrl}?brandId=${encodeURIComponent(brandId)}`;
      const { status, body } = await call(url, { method: 'GET' });
      if (status !== 200) throw new Error(`Gagal mengambil known-ids (${status}): ${body.error ?? ''}`);
      return { ids: body.ids ?? [], missingMetadata: body.missingMetadata ?? [] };
    },

    /** 200 PARSED, 422 REJECTED (batch tetap tersimpan di server); selain itu dilempar sebagai error. */
    async ingest(batch) {
      const { status, body } = await call(cfg.ingestUrl, {
        method: 'POST',
        body: JSON.stringify({ ...batch, collectorVersion: cfg.collectorVersion }),
      });
      if (status === 200 || status === 422) return body;
      throw new Error(`Ingest gagal (${status}): ${body.error ?? ''}`);
    },
  };
}

/** Mode --dry-run: respons ditulis ke ./out/<slug>/ tanpa memanggil server (bisa diimpor lewat scripts/import-canva-insights.ts). */
export function createDryRunClient(outDir) {
  let n = 0;
  mkdirSync(outDir, { recursive: true });
  return {
    async startRun() {
      return null;
    },
    async finishRun() {},
    async knownIds() {
      return { ids: [], missingMetadata: [] };
    },
    async ingest(batch) {
      n++;
      const file = join(outDir, `${String(n).padStart(3, '0')}-${batch.endpoint}.json`);
      writeFileSync(file, `${JSON.stringify({ brandId: batch.brandId, endpoint: batch.endpoint, query: batch.query, response: batch.payload }, null, 2)}\n`);
      return { status: 'DRY', rowCount: batch.payload?.A?.length ?? 0 };
    },
  };
}
