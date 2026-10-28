const DASHBOARD_URL = 'https://www.canva.com/creators/template/dashboard/dashboard';
const BRANDS = {
  BADxbxKIT_Y: 'Chital',
  BAEtJgfxnTk: 'zahra.art',
  BAEUTwNzf0Y: 'impro',
  BAEWutmc71I: 'UiCreative.net',
  BAEZG0o0gf4: 'Antler',
};
const STALE_RUN_MS = 15 * 60 * 1000;
const $ = (id) => document.getElementById(id);
const brandName = (id) => BRANDS[id] ?? id;
const ago = (ms) => {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 60) return `${min} menit lalu`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} jam lalu` : `${Math.round(h / 24)} hari lalu`;
};

let tab;

function render({ settings = {}, status = {}, lastRuns = {} }) {
  const configured = !!(settings.baseUrl && settings.token);
  const onCanva = !!tab?.url?.startsWith('https://www.canva.com/');
  const running = status.state === 'running' && Date.now() - (status.startedAt ?? 0) < STALE_RUN_MS;
  $('setup').hidden = configured;
  $('not-dashboard').hidden = !configured || onCanva;
  $('ready').hidden = !configured || !onCanva;
  $('sync').disabled = running;

  if (running) $('state').textContent = `Berjalan${status.brandId ? ` · ${brandName(status.brandId)}` : ''}…`;
  else if (status.result) {
    const r = status.result;
    $('state').innerHTML = '';
    const span = document.createElement('span');
    span.className = r.status === 'OK' ? 'ok' : 'bad';
    span.textContent = `${r.brandId ? `${brandName(r.brandId)}: ` : ''}${r.status}`;
    $('state').append(span, document.createTextNode(r.message ? ` — ${r.message}` : ''));
  }
  $('lines').textContent = (status.lines ?? []).join('\n');

  const rows = Object.entries(lastRuns).sort((a, b) => b[1].at - a[1].at);
  $('runs').replaceChildren(
    ...rows.map(([id, r]) => {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = brandName(id);
      const st = document.createElement('td');
      st.className = r.status === 'OK' ? 'ok' : 'bad';
      st.textContent = r.status;
      const when = document.createElement('td');
      when.className = 'muted';
      when.textContent = ago(r.at);
      tr.append(name, st, when);
      return tr;
    }),
  );
  if (rows.length === 0) $('runs').innerHTML = '<tr><td class="muted">Belum ada.</td></tr>';
}

async function refresh() {
  render(await chrome.storage.local.get(['settings', 'status', 'lastRuns']));
}

$('open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('open-dashboard').addEventListener('click', () => {
  if (tab?.id) chrome.tabs.update(tab.id, { url: DASHBOARD_URL });
  else chrome.tabs.create({ url: DASHBOARD_URL });
  window.close();
});
$('sync').addEventListener('click', async () => {
  $('sync').disabled = true;
  const res = await chrome.runtime.sendMessage({ type: 'sync', tabId: tab.id, backfill: $('backfill').checked });
  if (!res?.started) {
    $('state').textContent = res?.error ?? 'Gagal memulai';
    $('sync').disabled = false;
  }
});
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') refresh();
});

[tab] = await chrome.tabs.query({ active: true, currentWindow: true });
await refresh();
