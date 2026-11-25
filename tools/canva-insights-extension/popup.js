const DASHBOARD_URL = 'https://www.canva.com/creators/template/dashboard/dashboard';
const BRANDS = {
  BADxbxKIT_Y: 'Chital Graphic',
  BAEtJgfxnTk: 'Zahra Art',
  BAEUTwNzf0Y: 'Improstd',
  BAEWutmc71I: 'UICreative.net',
  BAEZG0o0gf4: 'Antler',
};
/** Sama dengan STAGES di lib/collect-brand.js; `weight` = perkiraan porsi waktu. */
const STAGES = [
  { key: 'discover', label: 'Daftar template aktif (90 hari)', weight: 5 },
  { key: 'known', label: 'Gabung template yang dikenal dashboard', weight: 2 },
  { key: 'daily', label: 'Angka harian per template', weight: 80 },
  { key: 'brand', label: 'Total harian akun', weight: 5 },
  { key: 'tier', label: 'Skor tier', weight: 3 },
  { key: 'meta', label: 'Judul & thumbnail template baru', weight: 5 },
];
/** Berjalan = ada tanda hidup (tiap halaman data) dalam 2 menit terakhir. */
const HEARTBEAT_STALE_MS = 2 * 60 * 1000;
const NUM = new Intl.NumberFormat('id-ID');
const $ = (id) => document.getElementById(id);

// ?embed=1: dimuat di panel slide-over halaman Canva (slideover.js), lebar mengikuti panel.
const EMBED = new URLSearchParams(location.search).has('embed');
// ?sidebar=1: sidebar Firefox (manifest.firefox.json). Tetap terbuka saat pindah tab, jadi tab Canva dicari ulang tiap refresh.
const SIDEBAR = new URLSearchParams(location.search).has('sidebar');
if (EMBED || SIDEBAR) document.body.classList.add('embed');
const brandName = (id) => BRANDS[id] ?? id;

function duration(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'kurang dari 1 menit';
  const h = Math.floor(min / 60);
  return h ? `${h} j ${min % 60} m` : `${min} menit`;
}
function ago(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} jam lalu` : `${Math.round(h / 24)} hari lalu`;
}
function percent(stage) {
  if (!stage) return 2;
  let done = 0;
  for (let i = 0; i < stage.index; i++) done += STAGES[i].weight;
  const cur = STAGES[stage.index];
  const frac = stage.key === 'daily' && stage.groups ? (stage.group - 1) / stage.groups : 0;
  return Math.min(99, Math.round(done + cur.weight * frac));
}

function renderSteps(stage, mode) {
  const list = $('steps');
  list.hidden = !stage && mode !== 'ok';
  list.replaceChildren(
    ...STAGES.map((st, i) => {
      const li = document.createElement('li');
      let mark = '○';
      if (mode === 'ok' || (stage && i < stage.index)) [li.className, mark] = ['done', '✓'];
      else if (stage && i === stage.index) [li.className, mark] = mode === 'fail' ? ['fail', '✕'] : ['now', '●'];
      const m = document.createElement('span');
      m.className = 'mark';
      m.textContent = mark;
      const t = document.createElement('span');
      t.textContent = st.key === 'daily' && stage?.key === 'daily' && stage.groups && mode === 'run' ? `${st.label} · grup ${stage.group}/${stage.groups}` : st.label;
      li.append(m, t);
      return li;
    }),
  );
}

function setCard(kind, title, text, meta, hint) {
  $('status').className = `status ${kind}`;
  $('status-title').textContent = title;
  $('status-text').textContent = text ?? '';
  $('status-meta').textContent = meta ?? '';
  $('status-hint').hidden = !hint;
  $('status-hint').textContent = hint ? `Yang perlu dilakukan: ${hint}` : '';
}

let tab;
// Firefox (MV3) membiarkan user mencabut izin situs; tanpa akses canva.com, tab.url kosong dan sinkron tidak bisa jalan.
let canvaAccess = true;

/** "Sinkron otomatis: tiap hari 12.00 · berikutnya Sab 31 Okt 12.00" dari alarm `daily-sync` (background.js). */
async function renderSchedule(settings) {
  const el = $('schedule');
  if (!settings.baseUrl || !settings.token) return void (el.textContent = '');
  if (settings.scheduleEnabled === false) return void (el.textContent = 'Sinkron otomatis: nonaktif (atur di Pengaturan).');
  const alarm = await chrome.alarms.get('daily-sync').catch(() => null);
  const time = (settings.scheduleTime || '12:00').replace(':', '.');
  const next = alarm ? new Date(alarm.scheduledTime).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'belum terjadwal';
  el.textContent = `Sinkron otomatis: tiap hari ${time} · berikutnya ${next}`;
}


function render({ settings = {}, status = {}, lastRuns = {} }) {
  const configured = !!(settings.baseUrl && settings.token);
  // Panel slide-over hanya dipasang di canva.com/creators/*, jadi tidak perlu membaca tab.url (Firefox bisa
  // mengosongkannya). Popup toolbar tetap memeriksa URL tab.
  // Hanya halaman Creator: sinkron memuat ulang dashboard di tab itu, jangan sampai menimpa desain yang sedang dibuka.
  const onCanva = EMBED || !!tab?.url?.startsWith('https://www.canva.com/creators/');
  const fresh = Date.now() - (status.heartbeatAt ?? status.startedAt ?? 0) < HEARTBEAT_STALE_MS;
  const running = status.state === 'running' && fresh;
  const stalled = status.state === 'running' && !fresh;

  $('conn').textContent = configured ? `Terhubung ke ${new URL(settings.baseUrl).host}` : 'Belum diatur';
  $('setup').hidden = configured;
  $('no-access').hidden = !configured || canvaAccess || running;
  $('not-dashboard').hidden = !configured || !canvaAccess || onCanva || running;
  $('ready').hidden = !configured || !canvaAccess || !onCanva || running;
  $('bar').hidden = !running;
  renderSchedule(settings);

  const who = status.brandId ? brandName(status.brandId) : 'brand';
  const p = status.progress;
  const counts = p ? `${NUM.format(p.batches)} halaman · ${NUM.format(p.rows)} baris` : 'menyiapkan…';
  if (running) {
    const pct = percent(status.stage);
    $('bar-fill').style.width = `${pct}%`;
    setCard('run', `Sedang sinkron · ${who}`, `${pct}% · ${counts}`, `Berjalan ${duration(Date.now() - status.startedAt)}. Biarkan tab Canva tetap terbuka; popup boleh ditutup.`);
    renderSteps(status.stage, 'run');
  } else if (stalled) {
    setCard('warn', `Terhenti · ${who}`, `Tidak ada kabar sejak ${ago(status.heartbeatAt ?? status.startedAt)} (${counts}).`, null,
      'Tab Canva mungkin ditutup, Chrome dimuat ulang, atau Mac tidur. Buka dashboard Creator lalu sinkronkan lagi; data yang sudah masuk tetap tersimpan.');
    renderSteps(status.stage, 'fail');
  } else if (status.state === 'done' && status.result) {
    const r = status.result;
    const name = r.brandId ? brandName(r.brandId) : '';
    const when = `Selesai ${ago(status.finishedAt)}${r.durationMs ? ` · durasi ${duration(r.durationMs)}` : ''}`;
    if (r.status === 'OK') {
      setCard('ok', `Berhasil${name ? ` · ${name}` : ''}`, r.message, when);
      renderSteps(null, 'ok');
    } else {
      const login = r.status === 'NEEDS_LOGIN';
      setCard(login ? 'warn' : 'bad', `${login ? 'Perlu login' : 'Gagal'}${name ? ` · ${name}` : ''}`, r.message, when, r.hint);
      renderSteps(status.stage, 'fail');
    }
  } else {
    setCard('', 'Siap', configured ? 'Buka dashboard Creator brand, lalu klik Sinkronkan sekarang.' : 'Atur URL dashboard dan token dulu.', null);
    $('steps').hidden = true;
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
      st.textContent = r.status === 'OK' ? '✓ Berhasil' : r.status === 'NEEDS_LOGIN' ? '! Perlu login' : '✕ Gagal';
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
  // Panel lama di tab Canva setelah extension di-reload: konteksnya putus, jangan memanggil API lagi.
  if (!chrome.runtime?.id) return;
  if (SIDEBAR) tab = await activeTab().catch(() => tab);
  const [stored, status] = await Promise.all([
    chrome.storage.local.get(['settings', 'lastRuns']).catch(() => ({})),
    // Status langsung dari service worker (tidak disimpan di storage; lihat background.js).
    chrome.runtime.sendMessage({ type: 'getStatus' }).catch(() => null),
  ]);
  render({ ...stored, status: status ?? {} });
}

$('open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('open-options-access').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('open-dashboard').addEventListener('click', () => {
  // Tab Canva dipakai ulang; tab lain (mis. di sidebar Firefox) tidak ditimpa: buka tab baru.
  if (tab?.id && tab.url?.startsWith('https://www.canva.com/')) chrome.tabs.update(tab.id, { url: DASHBOARD_URL });
  else chrome.tabs.create({ url: DASHBOARD_URL });
  if (!document.body.classList.contains('embed')) window.close();
});
$('sync').addEventListener('click', async () => {
  $('sync').disabled = true;
  const res = await chrome.runtime.sendMessage({ type: 'sync', tabId: tab?.id, backfill: $('backfill').checked });
  $('sync').disabled = false;
  if (!res?.started) {
    setCard('warn', 'Belum bisa mulai', res?.error ?? 'Extension tidak merespons.', null, 'Bila tidak ada sinkron yang terlihat berjalan, tunggu 2 menit lalu klik lagi, atau muat ulang tab dashboard Creator.');
  }
});
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') refresh();
});
// Status diminta ulang tiap detik selama popup/panel terbuka.
setInterval(refresh, 1000);

// Sebagian browser menampilkan popup sebagai jendela sendiri, sehingga "tab aktif jendela ini" bukan tab Canva:
// cari tab dashboard Creator. Di panel slide-over, tab = tab Canva yang memuat panel.
/** Sidebar: tab aktif di jendela sidebar ini (bukan tab Creator lain di latar). */
async function activeTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  return active;
}
async function findCanvaTab() {
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (active?.url?.startsWith('https://www.canva.com/creators/')) return active;
  const creators = await chrome.tabs.query({ url: 'https://www.canva.com/creators/*' });
  return creators.find((t) => t.active) ?? creators[0] ?? active;
}
canvaAccess = await chrome.permissions.contains({ origins: ['https://www.canva.com/*'] }).catch(() => true);
// Di panel: tab = tab Canva yang memuat panel. Bila Firefox tidak memberikannya, `tabId` dibiarkan kosong dan
// background memakai `sender.tab` dari pesan panel (lihat background.js).
tab = EMBED ? await chrome.tabs.getCurrent().catch(() => undefined) : SIDEBAR ? await activeTab() : await findCanvaTab();
await refresh();
