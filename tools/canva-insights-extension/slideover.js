// Panel slide-over Canva Insights di halaman Canva Creator: selalu terlihat, bisa diciutkan.
// Isi panel = popup.html (iframe halaman extension), jadi tampilan & logikanya sama dengan popup.
(() => {
  if (window.top !== window || document.getElementById('can-insights-slideover')) return;

  const WIDTH = 380;
  const COLORS = { run: '#2563eb', ok: '#16a34a', bad: '#dc2626', warn: '#d97706', idle: '#9ca3af' };
  const HEARTBEAT_STALE_MS = 2 * 60 * 1000;

  const host = document.createElement('div');
  host.id = 'can-insights-slideover';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .wrap { position: fixed; top: 72px; right: 0; bottom: 16px; z-index: 2147483000; display: flex; align-items: flex-start;
        transform: translateX(${WIDTH}px); transition: transform .2s ease; font: 13px/1.4 Inter, system-ui, sans-serif; }
      .wrap.open { transform: translateX(0); }
      @media (prefers-reduced-motion: reduce) { .wrap { transition: none; } }
      .handle { margin-top: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 6px;
        background: #111827; color: #f9fafb; border: 1px solid #374151; border-right: 0; cursor: pointer; writing-mode: vertical-rl; }
      .handle:focus-visible { outline: 2px solid #60a5fa; }
      .dot { width: 10px; height: 10px; border-radius: 50%; background: ${COLORS.idle}; }
      .dot.run { animation: pulse 1.2s ease-in-out infinite; }
      @keyframes pulse { 50% { opacity: .3; } }
      @media (prefers-reduced-motion: reduce) { .dot.run { animation: none; } }
      iframe { width: ${WIDTH}px; height: 100%; border: 1px solid #374151; border-right: 0; background: #111827; color-scheme: normal; }
    </style>
    <div class="wrap">
      <button class="handle" type="button" aria-expanded="false" aria-controls="panel">
        <span class="dot" aria-hidden="true"></span><span class="label">Canva Insights</span>
      </button>
      <iframe id="panel" title="Canva Insights" src="${chrome.runtime.getURL('popup.html?embed=1')}"></iframe>
    </div>`;

  const wrap = root.querySelector('.wrap');
  const handle = root.querySelector('.handle');
  const dot = root.querySelector('.dot');
  const label = root.querySelector('.label');

  function setOpen(open) {
    wrap.classList.toggle('open', open);
    handle.setAttribute('aria-expanded', String(open));
  }

  function paint(status) {
    let kind = 'idle';
    let text = 'Canva Insights';
    const fresh = Date.now() - (status?.heartbeatAt ?? status?.startedAt ?? 0) < HEARTBEAT_STALE_MS;
    if (status?.state === 'running' && fresh) [kind, text] = ['run', 'Insights · berjalan'];
    else if (status?.state === 'running') [kind, text] = ['warn', 'Insights · terhenti'];
    else if (status?.state === 'done' && status.result?.status === 'OK') [kind, text] = ['ok', 'Insights · berhasil'];
    else if (status?.state === 'done') [kind, text] = [status.result?.status === 'NEEDS_LOGIN' ? 'warn' : 'bad', 'Insights · gagal'];
    dot.style.background = COLORS[kind];
    dot.classList.toggle('run', kind === 'run');
    label.textContent = text;
  }

  function toggle() {
    const open = !wrap.classList.contains('open');
    setOpen(open);
    chrome.storage.local.set({ panelOpen: open }).catch(() => {});
  }
  handle.addEventListener('click', toggle);
  // Ikon toolbar di halaman Creator (background.js) membuka/menutup panel ini.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'togglePanel') toggle();
  });

  chrome.storage.local
    .get('panelOpen')
    .then(({ panelOpen = true }) => setOpen(panelOpen))
    .catch(() => setOpen(true));

  // Status hidup ada di service worker (bukan storage); minta tiap 3 detik untuk titik di tab panel.
  const poll = () =>
    chrome.runtime
      .sendMessage({ type: 'getStatus' })
      .then(paint)
      .catch(() => {});
  poll();
  setInterval(poll, 3000);

  document.documentElement.appendChild(host);
})();
