import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandHome } from './util.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_CONFIG_PATH = join(ROOT, 'config.json');
const PROFILE_ROOT = join(homedir(), 'Library', 'Application Support', 'canva-insights-collector', 'profiles');

/**
 * Baca config.json (lihat config.example.json). `profileDir` default per brand:
 * ~/Library/Application Support/canva-insights-collector/profiles/<slug>.
 */
export function loadConfig(path = DEFAULT_CONFIG_PATH, { requireServer = true } = {}) {
  if (!existsSync(path)) {
    throw new Error(`Config tidak ditemukan: ${path}. Salin config.example.json menjadi config.json lalu isi.`);
  }
  const cfg = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(cfg.brands) || cfg.brands.length === 0) throw new Error('config.brands kosong');
  if (requireServer) {
    for (const key of ['ingestUrl', 'runsUrl', 'knownIdsUrl', 'token']) {
      if (!cfg[key] || String(cfg[key]).includes('ISI_') || String(cfg[key]).includes('SERVER/')) {
        throw new Error(`config.${key} belum diisi`);
      }
    }
  }
  cfg.brands = cfg.brands.map((b) => {
    if (!b.slug || !b.brandId) throw new Error(`Brand tanpa slug/brandId: ${JSON.stringify(b)}`);
    return { ...b, profileDir: expandHome(b.profileDir ?? join(PROFILE_ROOT, b.slug)) };
  });
  cfg.path = path;
  return cfg;
}

/** Simpan satu kunci ke config.json tanpa menyentuh isi lain (dipakai untuk `paginationParam`). */
export function saveConfigValue(path, key, value) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  raw[key] = value;
  writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
}
