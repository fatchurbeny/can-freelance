/** Klien API dashboard can-freelance (spek §5.1, §5.2). Token hanya dikirim di header Authorization. */

export class ServerAuthError extends Error {
  constructor(status) {
    super(`Dashboard menolak token (${status}); cek token di Pengaturan extension = INSIGHTS_INGEST_TOKEN server`);
    this.name = 'ServerAuthError';
  }
}

/** `baseUrl` = URL dashboard termasuk basePath, mis. https://portal.fatchurbeny.com/can-freelance */
/** Server sedang restart (PM2) atau proxy putus: coba lagi dengan jeda, total ±2 menit. */
const RETRY_STATUS = new Set([502, 503, 504, 520, 521, 522, 523, 524]);
export const RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000, 45_000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createServerClient({ baseUrl, token, host, collectorVersion, retryDelays = RETRY_DELAYS_MS, onRetry }) {
  const api = `${baseUrl.replace(/\/+$/, '')}/api/insights`;

  async function call(path, init = {}) {
    let res;
    for (let attempt = 0; ; attempt++) {
      const wait = retryDelays[attempt];
      try {
        res = await fetch(`${api}${path}`, {
          ...init,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
        });
        if (!RETRY_STATUS.has(res.status) || wait === undefined) break;
        onRetry?.(`Server ${res.status}`, attempt + 1, wait);
      } catch (err) {
        // fetch gagal total (jaringan putus): sama dengan server tidak terjangkau.
        if (wait === undefined) throw err;
        onRetry?.(err.message, attempt + 1, wait);
      }
      await sleep(wait);
    }
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) throw new ServerAuthError(res.status);
    return { status: res.status, body };
  }

  return {
    async startRun(brandId) {
      const { status, body } = await call('/runs', {
        method: 'POST',
        body: JSON.stringify({ action: 'start', brandId, host: host ?? null }),
      });
      if (status === 403) throw new Error(`Brand ${brandId} belum terdaftar di dashboard (Account.canvaBrandId)`);
      if (status !== 200 || !body.runId) throw new Error(`Gagal memulai run (${status}): ${body.error ?? ''}`);
      return body.runId;
    },

    async finishRun(runId, status, message) {
      if (!runId) return;
      await call('/runs', {
        method: 'POST',
        body: JSON.stringify({ action: 'finish', runId, status, message: message ?? null }),
      });
    },

    async knownIds(brandId) {
      const { status, body } = await call(`/known-ids?brandId=${encodeURIComponent(brandId)}`, { method: 'GET' });
      if (status !== 200) throw new Error(`Gagal mengambil known-ids (${status}): ${body.error ?? ''}`);
      return { ids: body.ids ?? [], missingMetadata: body.missingMetadata ?? [] };
    },

    /** 200 PARSED, 422 REJECTED (batch tetap tersimpan di server); selain itu dilempar sebagai error. */
    async ingest(batch) {
      const { status, body } = await call('/ingest', {
        method: 'POST',
        body: JSON.stringify({ ...batch, collectorVersion }),
      });
      if (status === 200 || status === 422) return body;
      throw new Error(`Ingest gagal (${status}): ${body.error ?? ''}`);
    },
  };
}
