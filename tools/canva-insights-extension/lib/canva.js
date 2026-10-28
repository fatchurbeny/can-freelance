import { log } from './util.js';

/**
 * Endpoint internal dashboard Canva Creator (spek §1, §5.3). Murni: tanpa API Chrome, sehingga
 * bisa diuji dengan Node. Pemanggilan dari tab Canva ada di background.js.
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
export const SESSION_HEADERS = ['x-canva-authz', 'x-canva-user', 'x-canva-brand', 'x-canva-app', 'x-canva-accept-prefix'];

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
