// Bangun versi Firefox dari kode yang sama: salin file extension ke dist/firefox/ dengan manifest.firefox.json
// sebagai manifest.json, lalu kemas jadi dist/canva-insights-firefox-<versi>.zip (bisa diganti nama ke .xpi).
// Jalankan: npm run build:firefox
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'firefox');
const FILES = ['background.js', 'icon-128.png', 'options.html', 'options.js', 'popup.html', 'popup.js', 'slideover.js', 'ui.css', 'lib'];

const chrome = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const firefox = JSON.parse(readFileSync(join(root, 'manifest.firefox.json'), 'utf8'));
// Versi & izin harus sama dengan manifest Chrome agar kedua build tidak bergeser.
for (const key of ['version', 'permissions', 'host_permissions', 'content_scripts', 'web_accessible_resources']) {
  if (JSON.stringify(chrome[key]) !== JSON.stringify(firefox[key])) {
    console.error(`manifest.firefox.json: "${key}" berbeda dari manifest.json; samakan dulu.`);
    process.exit(1);
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of FILES) cpSync(join(root, f), join(out, f), { recursive: true });
writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(firefox, null, 2)}\n`);

const zip = join(root, 'dist', `canva-insights-firefox-${firefox.version}.zip`);
if (existsSync(zip)) rmSync(zip);
execFileSync('zip', ['-qr', '-X', zip, '.'], { cwd: out });
console.log(`Folder: ${out}\nPaket:  ${zip}`);
