/**
 * Service worker extension Canva Insights (docs/knowledge/canva-insights-spec.md §3, §5).
 * Berjalan di Chrome harian user: header sesi Canva dibaca dari request dashboard sendiri,
 * request data dijalankan dari dalam tab Canva, hasilnya dikirim ke API ingest dashboard.
 * Token sesi Canva hanya disimpan di chrome.storage.session (memori, hilang saat Chrome ditutup).
 */
import { CanvaHttpError, ENDPOINTS, PaginationError, SESSION_HEADERS, buildUrl, parseCanvaJson } from './lib/canva.js';
import { collectBrand } from './lib/collect-brand.js';
import { createServerClient, ServerAuthError } from './lib/server.js';
import { log, politeDelay, setLogSink, sleep } from './lib/util.js';

const DASHBOARD_URL = 'https://www.canva.com/creators/template/dashboard/dashboard';
const COLLECTOR_VERSION = 1;
const HEADER_WAIT_MS = 30_000;
const MAX_STATUS_LINES = 40;

// ── Header sesi dari request dashboard Creator ─────────────────────────────────
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const headers = {};
    for (const h of details.requestHeaders ?? []) {
      const name = h.name.toLowerCase();
      if (SESSION_HEADERS.includes(name)) headers[name] = h.value;
    }
    if (headers['x-canva-authz']) chrome.storage.session.set({ [`headers:${details.tabId}`]: headers });
  },
  { urls: ['https://www.canva.com/_ajax/creatorinsight/*'] },
  ['requestHeaders', 'extraHeaders'],
);

chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(`headers:${tabId}`));

async function waitForHeaders(tabId) {
  const key = `headers:${tabId}`;
  let stored = (await chrome.storage.session.get(key))[key];
  if (stored) return stored;
  // Belum ada request creatorinsight di tab ini: muat ulang dashboard agar header tertangkap.
  await chrome.tabs.update(tabId, { url: DASHBOARD_URL });
  for (let waited = 0; waited < HEADER_WAIT_MS; waited += 1000) {
    await sleep(1000);
    stored = (await chrome.storage.session.get(key))[key];
    if (stored) return stored;
  }
  return null;
}

/** Dijalankan di dunia halaman (MAIN) tab Canva: cookie & origin sama dengan dashboard. */
async function inPageFetch(url, headers) {
  const r = await fetch(url, { headers, credentials: 'include' });
  return { status: r.status, text: await r.text() };
}

function pageFetcher(tabId, sessionHeaders) {
  return async function fetchJson(endpoint, params) {
    await politeDelay();
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: inPageFetch,
      args: [buildUrl(endpoint, params), { ...sessionHeaders, 'x-canva-accept-prefix': 'no-prefix', 'x-canva-request': ENDPOINTS[endpoint].request }],
    });
    const res = injection?.result;
    if (!res) throw new Error('Tab Canva tidak merespons (ditutup atau berpindah halaman?)');
    if (res.status < 200 || res.status >= 300) throw new CanvaHttpError(res.status, endpoint);
    return parseCanvaJson(res.text);
  };
}

// ── Status untuk popup ─────────────────────────────────────────────────────────
let lines = [];

async function setStatus(patch) {
  const { status = {} } = await chrome.storage.local.get('status');
  await chrome.storage.local.set({ status: { ...status, ...patch, lines } });
}

setLogSink((level, message) => {
  lines = [...lines, `${new Date().toLocaleTimeString('id-ID')} ${message}`].slice(-MAX_STATUS_LINES);
  setStatus({});
});

function badge(text, color) {
  chrome.action.setBadgeText({ text });
  if (color) chrome.action.setBadgeBackgroundColor({ color });
}

// ── Sinkronisasi satu brand (akun Canva yang login di tab ini) ─────────────────
let running = false;

async function runSync(tabId, { backfill }) {
  const { settings = {} } = await chrome.storage.local.get('settings');
  if (!settings.baseUrl || !settings.token) throw new Error('Isi URL dashboard dan token di Pengaturan extension');

  log('INFO', 'Menunggu header sesi dashboard Creator…');
  const headers = await waitForHeaders(tabId);
  if (!headers) throw new Error('Dashboard Creator tidak memuat data dalam 30 detik. Pastikan sudah login Canva dan halaman tampil normal.');
  const brandId = headers['x-canva-brand'];
  if (!brandId) throw new Error('Brand ID tidak terbaca dari dashboard');
  await setStatus({ brandId });

  const server = createServerClient({ ...settings, host: settings.host || 'chrome-extension', collectorVersion: COLLECTOR_VERSION });
  const runId = await server.startRun(brandId);
  const pagination = { param: settings.paginationParam ?? null, detected: false };
  let status = 'ERROR';
  let message = null;
  try {
    log('INFO', `Brand ${brandId}: mulai${backfill ? ' (365 hari)' : ''}`);
    const summary = await collectBrand({
      brand: { slug: brandId, brandId },
      fetchJson: pageFetcher(tabId, headers),
      server,
      pagination,
      runId,
      backfill,
    });
    status = summary.rejected > 0 ? 'ERROR' : 'OK';
    message = `${summary.batches} batch, ${summary.rows} baris, ${summary.templates} template${summary.rejected ? `, ${summary.rejected} REJECTED` : ''}`;
  } catch (e) {
    if (e instanceof ServerAuthError) throw e;
    if (e instanceof CanvaHttpError && e.status === 401) {
      status = 'NEEDS_LOGIN';
      message = 'Sesi Canva habis: login ulang di canva.com lalu sinkronkan lagi';
      await chrome.storage.session.remove(`headers:${tabId}`);
    } else {
      message = `${e instanceof PaginationError ? 'Paginasi: ' : ''}${e.message}`;
    }
  } finally {
    if (pagination.detected && pagination.param) {
      await chrome.storage.local.set({ settings: { ...settings, paginationParam: pagination.param } });
      log('INFO', `Parameter paginasi "${pagination.param}" disimpan; catat di spek §1.3 & §9`);
    }
    await server.finishRun(runId, status, message).catch((e) => log('ERROR', `Gagal melapor run: ${e.message}`));
  }
  return { brandId, status, message };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'sync') return false;
  if (running) {
    sendResponse({ started: false, error: 'Sinkronisasi lain masih berjalan' });
    return false;
  }
  running = true;
  lines = [];
  sendResponse({ started: true });
  badge('…', '#6b7280');
  setStatus({ state: 'running', startedAt: Date.now(), brandId: null, result: null }).then(async () => {
    let result;
    try {
      result = await runSync(msg.tabId, { backfill: !!msg.backfill });
    } catch (e) {
      result = { brandId: null, status: 'ERROR', message: e.message };
    }
    log(result.status === 'OK' ? 'INFO' : 'WARN', `${result.status}${result.message ? ` — ${result.message}` : ''}`);
    const { lastRuns = {} } = await chrome.storage.local.get('lastRuns');
    if (result.brandId) lastRuns[result.brandId] = { status: result.status, message: result.message, at: Date.now() };
    await chrome.storage.local.set({ lastRuns });
    await setStatus({ state: 'done', finishedAt: Date.now(), result });
    badge(result.status === 'OK' ? 'OK' : '!', result.status === 'OK' ? '#16a34a' : '#dc2626');
    running = false;
  });
  return false;
});
