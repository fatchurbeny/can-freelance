/** Klien API dashboard can-freelance (spek §5.1, §5.2). Token hanya dikirim di header Authorization. */

export class ServerAuthError extends Error {
  constructor(status) {
    super(`Dashboard menolak token (${status}); cek token di Pengaturan extension = INSIGHTS_INGEST_TOKEN server`);
    this.name = 'ServerAuthError';
  }
}

/** `baseUrl` = URL dashboard termasuk basePath, mis. https://portal.fatchurbeny.com/can-freelance */
export function createServerClient({ baseUrl, token, host, collectorVersion }) {
  const api = `${baseUrl.replace(/\/+$/, '')}/api/insights`;

  async function call(path, init = {}) {
    const res = await fetch(`${api}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    });
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
