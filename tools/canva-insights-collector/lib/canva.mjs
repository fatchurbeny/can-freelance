import { log, politeDelay, sleep } from './util.mjs';

/**
 * Akses endpoint internal dashboard Canva Creator dari dalam tab Canva (spek §1, §5.3, §5.4):
 * cookie, origin, dan TLS sama dengan dashboard asli. Header sesi hanya disimpan di memori.
 */

export const DASHBOARD_URL = 'https://www.canva.com/creators/template/dashboard/dashboard';
const AJAX_BASE = 'https://www.canva.com/_ajax';

export const ENDPOINTS = {
  'content.by_brand': { path: '/creatorinsight/content/usages', request: 'findcontentusagesv2' },
  'content.by_content': { path: '/creatorinsight/content/usages', request: 'findcontentusagesv2' },
  'brand.breakdowns': { path: '/creatorinsight/brand/usage/breakdowns', request: 'findbrandusagebreakdownsv2' },
  tier_scores: { path: '/creatorinsight/tier_scores', request: 'findtierscores' },
  templates: { path: '/template/templates', request: 'findtemplatesapi' },
};

/** Nama parameter token halaman belum terlihat di HAR; dicoba berurutan (spek §5.3). */
export const PAGINATION_CANDIDATES = ['continuation', 'continuationToken', 'cursor', 'pageToken'];

/** Header sesi yang disalin dari request dashboard; `x-canva-request` diisi per endpoint. */
const SESSION_HEADERS = ['x-canva-authz', 'x-canva-user', 'x-canva-brand', 'x-canva-app', 'x-canva-accept-prefix'];

export class CanvaHttpError extends Error {
  constructor(status, endpoint) {
    super(`Canva membalas ${status} untuk ${endpoint}`);
    this.name = 'CanvaHttpError';
    this.status = status;
  }
}

export class PaginationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PaginationError';
  }
}

export function buildUrl(endpoint, params) {
  const spec = ENDPOINTS[endpoint];
  if (!spec) throw new Error(`Endpoint tidak dikenal: ${endpoint}`);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, String(v));
  }
  return `${AJAX_BASE}${spec.path}?${search}`;
}

/** Respons Canva bisa diawali prefix anti-JSON-hijacking; buang semuanya sebelum `{` pertama. */
export function parseCanvaJson(text) {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('Respons Canva bukan JSON');
  return JSON.parse(text.slice(start));
}

function rowsKey(payload) {
  return JSON.stringify((payload?.A ?? []).map((r) => [r.e, r.k, r.F, r.A, r.B]));
}

/**
 * Ambil semua halaman satu request. `pagination.param` = nama parameter token (dari config);
 * bila kosong, dideteksi: parameter benar = halaman berikutnya berisi baris yang berbeda.
 * `onPage(query, payload)` dipanggil untuk setiap halaman (termasuk yang pertama).
 */
export async function fetchAllPages({ fetchJson, endpoint, params, pagination, onPage, maxPages = 200 }) {
  let query = params;
  let payload = await fetchJson(endpoint, query);
  await onPage(query, payload);

  const seen = new Set();
  for (let page = 1; typeof payload?.B === 'string' && payload.B; page++) {
    const token = payload.B;
    if (seen.has(token)) throw new PaginationError(`Token halaman berulang (${token}) di ${endpoint}`);
    if (page >= maxPages) throw new PaginationError(`Lebih dari ${maxPages} halaman di ${endpoint}`);
    seen.add(token);

    let next = null;
    let nextQuery = null;
    if (pagination.param) {
      nextQuery = { ...params, [pagination.param]: token };
      next = await fetchJson(endpoint, nextQuery);
      if (rowsKey(next) === rowsKey(payload)) {
        throw new PaginationError(`Parameter "${pagination.param}" tidak lagi menggeser halaman di ${endpoint}`);
      }
    } else {
      for (const candidate of PAGINATION_CANDIDATES) {
        const q = { ...params, [candidate]: token };
        const r = await fetchJson(endpoint, q);
        if ((r?.A?.length ?? 0) > 0 && rowsKey(r) !== rowsKey(payload)) {
          pagination.param = candidate;
          pagination.detected = true;
          log('INFO', `Parameter paginasi terdeteksi: ${candidate}`);
          next = r;
          nextQuery = q;
          break;
        }
      }
      if (!next) {
        throw new PaginationError(`Parameter paginasi tidak ditemukan (dicoba: ${PAGINATION_CANDIDATES.join(', ')})`);
      }
    }
    query = nextQuery;
    payload = next;
    await onPage(query, payload);
  }
}

function isLoginUrl(url) {
  return /\/(login|signup|sign-in|signin)\b/.test(new URL(url).pathname);
}

/** Halaman pemeriksaan Cloudflare ("Just a moment…"). Collector tidak pernah mencoba melewatinya. */
async function isChallengePage(page) {
  const title = await page.title().catch(() => '');
  return /just a moment|attention required/i.test(title);
}

/**
 * Buka dashboard Creator di profil brand, tangkap header `x-canva-*` dari request creatorinsight
 * pertama. Mengembalikan `{ needsLogin: true }` bila diarahkan ke halaman login, atau
 * `{ challenge: true }` bila Canva menampilkan pemeriksaan Cloudflare (harus diselesaikan manusia).
 */
export async function openBrandSession(context, brand, { timeoutMs = 45_000 } = {}) {
  const page = context.pages()[0] ?? (await context.newPage());
  let resolveHeaders;
  const captured = new Promise((resolve) => {
    resolveHeaders = resolve;
  });
  const onRequest = async (req) => {
    if (!req.url().includes('/_ajax/creatorinsight/')) return;
    resolveHeaders(await req.allHeaders());
  };
  page.on('request', onRequest);

  await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // Selesai saat header tertangkap, halaman berpindah ke login, atau batas waktu habis.
  // Pemeriksaan Cloudflare biasanya selesai sendiri dalam beberapa detik; bila bertahan > 15 detik, berhenti.
  let done = false;
  let challengeSince = null;
  const blocked = (async () => {
    for (let waited = 0; !done && waited < timeoutMs; waited += 1000) {
      if (isLoginUrl(page.url())) return null;
      if (await isChallengePage(page)) {
        challengeSince ??= waited;
        if (waited - challengeSince >= 15_000) return null;
      } else {
        challengeSince = null;
      }
      await sleep(1000);
    }
    return null;
  })();
  const headers = await Promise.race([captured, blocked]);
  done = true;
  page.off('request', onRequest);

  if (!headers) {
    if (isLoginUrl(page.url())) return { needsLogin: true };
    if (await isChallengePage(page)) return { challenge: true };
    throw new Error(`Tidak ada request creatorinsight dalam ${timeoutMs / 1000} detik (halaman: ${new URL(page.url()).pathname})`);
  }

  const sessionHeaders = { 'x-canva-accept-prefix': 'no-prefix' };
  for (const key of SESSION_HEADERS) if (headers[key]) sessionHeaders[key] = headers[key];
  if (!sessionHeaders['x-canva-authz']) throw new Error('Header x-canva-authz tidak tertangkap');
  if (sessionHeaders['x-canva-brand'] && sessionHeaders['x-canva-brand'] !== brand.brandId) {
    throw new Error(`Profil ${brand.slug} login ke brand ${sessionHeaders['x-canva-brand']}, bukan ${brand.brandId}`);
  }

  /** Fetch satu endpoint dari dalam tab Canva, dengan jeda sopan sebelum tiap request. */
  async function fetchJson(endpoint, params) {
    await politeDelay();
    const url = buildUrl(endpoint, params);
    const res = await page.evaluate(
      async ({ url, headers }) => {
        const r = await fetch(url, { headers, credentials: 'include' });
        return { status: r.status, text: await r.text() };
      },
      { url, headers: { ...sessionHeaders, 'x-canva-request': ENDPOINTS[endpoint].request } },
    );
    if (res.status < 200 || res.status >= 300) throw new CanvaHttpError(res.status, endpoint);
    return parseCanvaJson(res.text);
  }

  return { needsLogin: false, challenge: false, fetchJson };
}
