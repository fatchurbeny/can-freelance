const DEFAULT_URL = 'https://portal.fatchurbeny.com/can-freelance';
const $ = (id) => document.getElementById(id);

function show(text, ok) {
  $('msg').textContent = text;
  $('msg').className = ok ? 'ok' : 'bad';
}

function readForm() {
  return {
    baseUrl: $('baseUrl').value.trim().replace(/\/+$/, ''),
    token: $('token').value.trim(),
    host: $('host').value.trim(),
  };
}

/** Hanya origin di host_permissions manifest yang bisa dihubungi extension. */
async function allowed(baseUrl) {
  try {
    return await chrome.permissions.contains({ origins: [`${new URL(baseUrl).origin}/*`] });
  } catch {
    return false;
  }
}

const { settings = {} } = await chrome.storage.local.get('settings');
$('baseUrl').value = settings.baseUrl ?? DEFAULT_URL;
$('token').value = settings.token ?? '';
$('host').value = settings.host ?? '';
if (settings.paginationParam) $('pagination').textContent = `Parameter paginasi terdeteksi: ${settings.paginationParam}`;

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const next = readForm();
  if (!(await allowed(next.baseUrl))) {
    show('URL ini tidak ada di host_permissions manifest.json; tambahkan origin-nya lalu muat ulang extension.', false);
    return;
  }
  const { settings: current = {} } = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({ settings: { ...current, ...next } });
  show('Tersimpan.', true);
});

$('test').addEventListener('click', async () => {
  const { baseUrl, token } = readForm();
  if (!(await allowed(baseUrl))) return show('URL ini tidak ada di host_permissions manifest.json.', false);
  try {
    const res = await fetch(`${baseUrl}/api/insights/known-ids?brandId=connection-test`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 200) show('Terhubung: token diterima dashboard.', true);
    else if (res.status === 401) show('Token ditolak (401). Cek INSIGHTS_INGEST_TOKEN di server.', false);
    else show(`Dashboard membalas ${res.status}.`, false);
  } catch (err) {
    show(`Tidak bisa menghubungi dashboard: ${err.message}`, false);
  }
});
