// Uji manual background.js dengan `chrome` palsu + Canva palsu → API dashboard sungguhan.
// Pakai: BASE_URL=http://127.0.0.1:3002/can-freelance TOKEN=... BRAND=BADxbxKIT_Y [FAIL_STORAGE=1] node test/background-e2e.mjs
const DAY = 86_400_000;
const brandId = process.env.BRAND;
const store = { local: new Map(), session: new Map() };
const area = (m) => ({
  async get(keys) {
    const list = keys == null ? [...m.keys()] : [keys].flat();
    return Object.fromEntries(list.filter((k) => m.has(k)).map((k) => [k, structuredClone(m.get(k))]));
  },
  async set(obj) {
    // FAIL_STORAGE=1 meniru Yab: semua storage.local.set ditolak "Exceeded storage quota".
    if (process.env.FAIL_STORAGE && m === store.local && !seeding) throw new Error('Invalid call to browser.storage.local.set(). Exceeded storage quota.');
    for (const [k, v] of Object.entries(obj)) m.set(k, structuredClone(v));
  },
  async remove(keys) { for (const k of [keys].flat()) m.delete(k); },
});
let onHeaders;
const messageListeners = [];
function send(msg, sender = {}) {
  let reply;
  for (const l of messageListeners) l(msg, sender, (r) => { reply = r; });
  return reply;
}
const canvaCalls = [];
globalThis.chrome = {
  webRequest: { onBeforeSendHeaders: { addListener: (cb) => { onHeaders = cb; } } },
  tabs: {
    onRemoved: { addListener() {} },
    async update(tabId) {
      // Dashboard dimuat → request creatorinsight pertama membawa header sesi.
      setTimeout(() => onHeaders({ tabId, requestHeaders: [
        { name: 'X-Canva-Authz', value: 'secret-session-token' }, { name: 'x-canva-brand', value: brandId },
        { name: 'x-canva-user', value: 'UAEtest' }, { name: 'x-canva-app', value: 'home' }, { name: 'cookie', value: 'nope' },
      ] }), 300);
    },
  },
  storage: { local: area(store.local), session: area(store.session) },
  action: { setBadgeText() {}, setBadgeBackgroundColor() {}, setTitle() {} },
  notifications: { create: (o) => console.log('notification:', o.title, '|', o.message) },
  runtime: { onMessage: { addListener: (cb) => messageListeners.push(cb) } },
  scripting: {
    async executeScript({ world, func, args }) {
      if (world !== 'MAIN') throw new Error('harus MAIN world');
      return [{ result: await func(...args) }];
    },
  },
};

const ids = Array.from({ length: 8 }, (_, i) => `EAHbg00000${i}`);
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = new URL(url);
  if (u.host !== 'www.canva.com') return realFetch(url, init);
  canvaCalls.push({ path: u.pathname, headers: init.headers, credentials: init.credentials });
  const p = (k) => u.searchParams.getAll(k);
  const now = Date.now();
  const from = Number(p('fromDate')[0] ?? p('after')[0]);
  const to = Number(p('toDate')[0] ?? Math.floor(now / DAY) * DAY + DAY);
  const days = []; for (let d = from; d < to; d += DAY) days.push(d);
  let body;
  if (u.pathname.endsWith('/content/usages') && p('type')[0] === 'BY_BRAND') body = { A: ids.map((e) => ({ e, C: 3, D: 1, j: now - 30 * DAY })) };
  else if (u.pathname.endsWith('/content/usages')) {
    const rows = days.flatMap((d) => p('contentIds').map((e) => ({ e, k: d, l: d + DAY, C: 2, D: 1, F: 'C' })));
    const off = Number(p('cursor')[0] ?? 0); const page = rows.slice(off, off + Number(p('limit')[0]));
    body = off + page.length < rows.length ? { A: page, B: String(off + page.length) } : { A: page };
  } else if (u.pathname.endsWith('/breakdowns')) body = { A: days.map((d) => ({ e: d, f: d + DAY, C: 6, D: 3, F: 'C' })) };
  else if (u.pathname.endsWith('/tier_scores')) body = { A: days.map((d) => ({ A: 2, B: d, C: 'LOW', F: 0.5 })) };
  else body = { A: p('id').map((A) => ({ A, I: 'DAHbg000000', R: `BG ${A}`, T: [], 0: 'none', d: 12, D: brandId })) };
  return new Response(`'"])}while(1);</x>//${JSON.stringify(body)}`, { status: 200 });
};

let seeding = true;
await chrome.storage.local.set({ settings: { baseUrl: process.env.BASE_URL, token: process.env.TOKEN, host: 'bg-e2e' } });
seeding = false;
await import('../background.js');
const reply = send({ type: 'sync', tabId: 7, backfill: false });
console.log('reply', reply);
for (let i = 0; i < 120; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const status = send({ type: 'getStatus' });
  if (status?.state === 'done') {
    const { settings = {}, lastRuns = null } = await chrome.storage.local.get(['settings', 'lastRuns']);
    if (process.env.FAIL_STORAGE) console.log('FAIL_STORAGE: status tetap terbaca lewat pesan meski storage menolak');
    console.log('result', JSON.stringify(status.result));
    console.log('lines', JSON.stringify(status.lines.map((l) => l.replace(/^\S+ /, ''))));
    console.log('paginationParam', settings.paginationParam, '| lastRuns', JSON.stringify(lastRuns));
    const sent = canvaCalls[0].headers;
    console.log('canva calls', canvaCalls.length, '| credentials', canvaCalls[0].credentials, '| headers sent', Object.keys(sent).sort().join(','));
    console.log('status lines contain token?', JSON.stringify(status.lines).includes('secret-session-token'));
    process.exit(0);
  }
}
console.log('timeout'); process.exit(1);
