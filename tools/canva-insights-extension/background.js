/**
 * Service worker extension Canva Insights (docs/knowledge/canva-insights-spec.md §3, §5).
 * Berjalan di Chrome harian user: header sesi Canva dibaca dari request dashboard sendiri,
 * request data dijalankan dari dalam tab Canva, hasilnya dikirim ke API ingest dashboard.
 * Token sesi Canva hanya disimpan di chrome.storage.session (memori, hilang saat Chrome ditutup).
 */
import { CanvaHttpError, ENDPOINTS, PaginationError, SESSION_HEADERS, buildUrl, parseCanvaJson } from './lib/canva.js';
import { collectBrand, STAGES } from './lib/collect-brand.js';
import { createServerClient, ServerAuthError } from './lib/server.js';
import { log, politeDelay, setLogSink, sleep } from './lib/util.js';

const DASHBOARD_URL = 'https://www.canva.com/creators/template/dashboard/dashboard';
const COLLECTOR_VERSION = 1;
const HEADER_WAIT_MS = 30_000;
const MAX_STATUS_LINES = 15;
const MAX_LINE_CHARS = 140;

// ── Header sesi dari request dashboard Creator ─────────────────────────────────
const lastHeaders = new Map();
// Diagnosis bila header tak tertangkap: berapa request creatorinsight terlihat, dari tab mana, dan apakah membawa authz.
const seen = { requests: 0, withAuthz: 0, tabIds: new Set(), names: new Set() };
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    seen.requests += 1;
    seen.tabIds.add(details.tabId);
    // Hanya nama header (tanpa nilai) untuk diagnosis.
    for (const h of details.requestHeaders ?? []) seen.names.add(h.name.toLowerCase());
    if ((details.requestHeaders ?? []).some((h) => h.name.toLowerCase() === 'x-canva-authz')) seen.withAuthz += 1;
    if (details.tabId < 0) return;
    const headers = {};
    for (const h of details.requestHeaders ?? []) {
      const name = h.name.toLowerCase();
      if (SESSION_HEADERS.includes(name)) headers[name] = h.value;
    }
    if (!headers['x-canva-authz']) return;
    // Header disimpan di memori (utama) dan storage.session (cadangan bila service worker dimulai ulang).
    // Request extension sendiri juga lewat sini (ribuan per sinkron): tulis storage hanya bila berubah.
    const json = JSON.stringify(headers);
    if (lastHeaders.get(details.tabId)?.json === json) return;
    lastHeaders.set(details.tabId, { json, headers });
    chrome.storage.session.set({ [`headers:${details.tabId}`]: headers }).catch((e) => console.warn('[canva-insights] header tidak tersimpan:', e?.message ?? e));
  },
  { urls: ['https://www.canva.com/_ajax/creatorinsight/*'] },
  ['requestHeaders', 'extraHeaders'],
);

// ── Ikon toolbar ───────────────────────────────────────────────────────────────
// Di halaman Creator sudah ada panel slide-over: ikon membuka/menutup panel itu, bukan popup kedua.
const CREATOR_PREFIX = 'https://www.canva.com/creators/';
function syncActionPopup(tabId, url = '') {
  chrome.action.setPopup({ tabId, popup: url.startsWith(CREATOR_PREFIX) ? '' : 'popup.html' }).catch(() => {});
}
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.url || info.status === 'loading') syncActionPopup(tabId, info.url ?? tab.url);
});
chrome.tabs.query({ url: `${CREATOR_PREFIX}*` }).then((tabs) => tabs.forEach((t) => syncActionPopup(t.id, t.url)));
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'togglePanel' });
  } catch {
    // Tab dibuka sebelum extension dimuat: pasang panel dulu (terbuka sesuai pilihan terakhir).
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['slideover.js'] }).catch(() => {});
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  lastHeaders.delete(tabId);
  chrome.storage.session.remove(`headers:${tabId}`);
});

async function readHeaders(tabId) {
  const mem = lastHeaders.get(tabId)?.headers;
  if (mem) return mem;
  const key = `headers:${tabId}`;
  try {
    return (await chrome.storage.session.get(key))[key] ?? null;
  } catch {
    return null;
  }
}

async function waitForHeaders(tabId) {
  let stored = await readHeaders(tabId);
  if (stored) return stored;
  // Belum ada request creatorinsight di tab ini (mis. extension baru dimuat ulang): muat ulang dashboard
  // agar header tertangkap. Panel di halaman ikut dimuat ulang dan langsung menampilkan status berjalan.
  log('INFO', 'Memuat ulang dashboard Creator untuk membaca sesi Canva…');
  await chrome.tabs.update(tabId, { url: DASHBOARD_URL });
  for (let waited = 0; waited < HEADER_WAIT_MS; waited += 1000) {
    await sleep(1000);
    stored = await readHeaders(tabId);
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

// ── Status untuk popup & panel ─────────────────────────────────────────────────
// Status berjalan hanya di memori service worker; popup/panel memintanya lewat pesan `getStatus`.
// Yab (Chromium) menolak storage.local.set ("Exceeded storage quota"), jadi storage hanya dipakai
// untuk hasil akhir & riwayat (jarang ditulis, kegagalannya diabaikan).
let lines = [];
let current = { state: 'idle' };

function setStatus(patch) {
  current = { ...current, ...patch, lines };
}

async function persist(items) {
  try {
    await chrome.storage.local.set(items);
  } catch (e) {
    console.warn('[canva-insights] penyimpanan ditolak browser:', e?.message ?? e);
  }
}

// Saat service worker mulai: buang status lama (versi sebelumnya menulisnya terus-menerus) dan
// tampilkan hasil sinkron terakhir yang tersimpan.
chrome.storage.local.remove('status').catch(() => {});
chrome.storage.local
  .get('lastResult')
  .then(({ lastResult }) => {
    if (lastResult && current.state === 'idle') current = { state: 'done', ...lastResult, lines: [] };
  })
  .catch(() => {});

setLogSink((level, message) => {
  const line = `${new Date().toLocaleTimeString('id-ID')} ${message}`.slice(0, MAX_LINE_CHARS);
  lines = [...lines, line].slice(-MAX_STATUS_LINES);
  setStatus({});
});

function badge(text, color, title) {
  chrome.action.setBadgeText({ text });
  if (color) chrome.action.setBadgeBackgroundColor({ color });
  if (title) chrome.action.setTitle({ title: `Canva Insights — ${title}` });
}

/** Terjemahkan kegagalan menjadi status, pesan, dan saran yang bisa dilakukan user. */
function explainError(e) {
  if (e instanceof ServerAuthError) {
    return { status: 'ERROR', message: 'Token ditolak dashboard can-freelance.', hint: 'Buka Pengaturan extension, tempel ulang token INSIGHTS_INGEST_TOKEN, lalu Uji koneksi.' };
  }
  if (e instanceof CanvaHttpError && e.status === 401) {
    return { status: 'NEEDS_LOGIN', message: 'Sesi Canva habis.', hint: 'Login ulang di canva.com, buka dashboard Creator, lalu sinkronkan lagi.' };
  }
  if (e instanceof CanvaHttpError && e.status === 429) {
    return { status: 'ERROR', message: 'Canva membatasi permintaan (terlalu sering).', hint: 'Tunggu sekitar 15 menit, lalu sinkronkan lagi. Data yang sudah masuk tetap tersimpan.' };
  }
  if (e instanceof CanvaHttpError) {
    return { status: 'ERROR', message: `Canva membalas ${e.status}.`, hint: 'Muat ulang dashboard Creator lalu sinkronkan lagi. Bila berulang, kabari admin.' };
  }
  if (e instanceof PaginationError) {
    return { status: 'ERROR', message: `Paginasi Canva berubah: ${e.message}`, hint: 'Kabari admin: format data Canva mungkin berubah.' };
  }
  // Pesan error jaringan beda per browser: Chrome "Failed to fetch", Yab/WebKit "Load failed", Firefox "NetworkError…".
  if (e instanceof TypeError && /fetch|load failed|networkerror/i.test(e.message)) {
    return { status: 'ERROR', message: 'Dashboard can-freelance tidak bisa dihubungi.', hint: 'Pastikan server dashboard menyala dan URL di Pengaturan benar.' };
  }
  return { status: 'ERROR', message: e.message, hint: e.hint ?? null };
}

function notify(title, message) {
  try {
    chrome.notifications.create({ type: 'basic', iconUrl: 'icon-128.png', title, message, priority: 1 });
  } catch {
    // Notifikasi opsional.
  }
}

// ── Sinkronisasi satu brand (akun Canva yang login di tab ini) ─────────────────
let running = false;
let lastBeat = 0;
const STUCK_MS = 2 * 60 * 1000;

async function runSync(tabId, { backfill }) {
  const { settings = {} } = await chrome.storage.local.get('settings');
  if (!settings.baseUrl || !settings.token) {
    throw Object.assign(new Error('URL dashboard dan token belum diisi.'), { hint: 'Klik Buka Pengaturan, isi keduanya, Simpan, lalu Uji koneksi.' });
  }

  log('INFO', 'Menunggu header sesi dashboard Creator…');
  const headers = await waitForHeaders(tabId);
  if (!headers) {
    log('WARN', `Diagnosis: tab ${tabId}; request creatorinsight terlihat ${seen.requests} (authz ${seen.withAuthz}), dari tab [${[...seen.tabIds].join(', ')}]`);
    // Baris log dipotong 140 karakter: nama header dibagi per 6.
    const names = [...seen.names].sort();
    for (let i = 0; i < names.length; i += 6) log('WARN', `Header: ${names.slice(i, i + 6).join(', ')}`);
    throw Object.assign(new Error('Dashboard Creator tidak memuat data dalam 30 detik.'), {
      hint: 'Pastikan sudah login Canva dan grafik di dashboard Creator tampil, lalu sinkronkan lagi.',
    });
  }
  const brandId = headers['x-canva-brand'];
  if (!brandId) throw Object.assign(new Error('Brand tidak terbaca dari dashboard.'), { hint: 'Muat ulang dashboard Creator lalu coba lagi.' });
  await setStatus({ brandId });

  const client = createServerClient({ ...settings, host: settings.host || 'chrome-extension', collectorVersion: COLLECTOR_VERSION });
  const progress = { batches: 0, rows: 0 };
  const server = {
    ...client,
    async ingest(batch) {
      const result = await client.ingest(batch);
      progress.batches += 1;
      progress.rows += batch.payload?.A?.length ?? 0;
      // Tanda hidup tiap batch: popup menganggap macet bila > 2 menit tanpa kabar.
      lastBeat = Date.now();
      await setStatus({ heartbeatAt: lastBeat, progress: { ...progress } });
      return result;
    },
  };
  const runId = await server.startRun(brandId).catch((e) => {
    if (/belum terdaftar/.test(e.message)) e.hint = 'Brand ini belum dihubungkan di dashboard. Kabari admin (Account.canvaBrandId).';
    throw e;
  });
  const pagination = { param: settings.paginationParam ?? null, detected: false };
  let status = 'ERROR';
  let message = null;
  let hint = null;
  try {
    log('INFO', `Mulai${backfill ? ' (365 hari)' : ' (14 hari terakhir)'}`);
    const summary = await collectBrand({
      onStage: (key, detail) => {
        const index = STAGES.findIndex((st) => st.key === key);
        if (key !== 'daily' || detail?.group === 1) log('INFO', STAGES[index].label);
        lastBeat = Date.now();
        setStatus({ stage: { key, index, total: STAGES.length, ...(detail ?? {}) }, heartbeatAt: lastBeat });
      },
      brand: { slug: brandId, brandId },
      fetchJson: pageFetcher(tabId, headers),
      server,
      pagination,
      runId,
      backfill,
    });
    status = summary.rejected > 0 ? 'ERROR' : 'OK';
    message = `${summary.templates.toLocaleString('id-ID')} template, ${summary.rows.toLocaleString('id-ID')} baris data dalam ${summary.batches.toLocaleString('id-ID')} halaman${
      summary.rejected ? `; ${summary.rejected} halaman ditolak server` : ''
    }.`;
    if (summary.rejected) hint = 'Sebagian data ditolak dashboard. Data lain tetap tersimpan; kabari admin.';
  } catch (e) {
    ({ status, message, hint } = explainError(e));
    if (status === 'NEEDS_LOGIN') {
      lastHeaders.delete(tabId);
      await chrome.storage.session.remove(`headers:${tabId}`).catch(() => {});
    }
  } finally {
    if (pagination.detected && pagination.param) {
      await persist({ settings: { ...settings, paginationParam: pagination.param } });
      log('INFO', `Parameter paginasi "${pagination.param}" disimpan; catat di spek §1.3 & §9`);
    }
    await server.finishRun(runId, status, message).catch((e) => log('ERROR', `Gagal melapor run: ${e.message}`));
  }
  return { brandId, status, message, hint, progress: { ...progress } };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'sync') return false;
  // Dari panel slide-over, `sender.tab` = tab Canva; dipakai bila popup tidak bisa membaca tab aktif.
  const tabId = msg.tabId ?? sender.tab?.id;
  if (!tabId) {
    sendResponse({ started: false, error: 'Tab Canva tidak dikenali. Buka dashboard Creator lalu klik Sinkronkan dari sana.' });
    return false;
  }
  if (running && Date.now() - lastBeat < STUCK_MS) {
    sendResponse({ started: false, error: `Sinkronisasi sedang berjalan (kabar terakhir ${Math.round((Date.now() - lastBeat) / 1000)} detik lalu). Tunggu sampai selesai.` });
    return false;
  }
  // Run sebelumnya macet (> 2 menit tanpa kabar) tidak lagi mengunci tombol.
  running = true;
  lastBeat = Date.now();
  lines = [];
  sendResponse({ started: true });
  badge('…', '#6b7280', 'sinkron berjalan');
  setStatus({ state: 'running', startedAt: Date.now(), heartbeatAt: Date.now(), progress: null, stage: null, brandId: null, result: null });
  (async () => {
    let result;
    const startedAt = Date.now();
    try {
      result = await runSync(tabId, { backfill: !!msg.backfill });
    } catch (e) {
      result = { brandId: null, ...explainError(e) };
    }
    result.durationMs = Date.now() - startedAt;
    const ok = result.status === 'OK';
    log(ok ? 'INFO' : 'WARN', `${ok ? 'Berhasil' : 'Gagal'}: ${result.message}`);
    const finishedAt = Date.now();
    setStatus({ state: 'done', finishedAt, result });
    const { lastRuns = {} } = await chrome.storage.local.get('lastRuns').catch(() => ({}));
    if (result.brandId) lastRuns[result.brandId] = { status: result.status, message: result.message, at: finishedAt };
    await persist({ lastRuns, lastResult: { finishedAt, result, stage: current.stage ?? null } });
    badge(ok ? 'OK' : '!', ok ? '#16a34a' : '#dc2626', ok ? 'sinkron terakhir berhasil' : 'sinkron terakhir gagal');
    notify(ok ? 'Sinkron Canva Insights berhasil' : 'Sinkron Canva Insights gagal', `${result.message}${result.hint ? ` ${result.hint}` : ''}`);
    running = false;
  })();
  return false;
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'getStatus') return false;
  sendResponse({ ...current, lines });
  return false;
});
