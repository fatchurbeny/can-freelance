import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const LOG_FILE =
  process.env.CANVA_INSIGHTS_LOG ?? join(homedir(), 'Library', 'Logs', 'canva-insights-collector.log');

/** Log ke stdout + file. Jangan pernah mengirim header, cookie, atau token ke sini. */
export function log(level, message, extra) {
  const line = `${new Date().toISOString()} ${level.padEnd(5)} ${message}${extra ? ` ${JSON.stringify(extra)}` : ''}`;
  (level === 'ERROR' ? console.error : console.log)(line);
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `${line}\n`);
  } catch {
    // Log file opsional; stdout tetap ada (launchd menyalinnya ke file yang sama).
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Jeda antar-request ke Canva: 1–2 detik + jitter (spek §5.3 langkah 8). */
export function politeDelay(minMs = 1000, maxMs = 2000) {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}

export function startOfUtcDay(ms) {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

/** Pecah [fromMs, toMs) menjadi rentang maksimal `days` hari, urut dari yang lama. */
export function rangeChunks(fromMs, toMs, days) {
  const chunks = [];
  for (let start = fromMs; start < toMs; start += days * DAY_MS) {
    chunks.push([start, Math.min(start + days * DAY_MS, toMs)]);
  }
  return chunks;
}

export function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export function expandHome(path) {
  return path.startsWith('~/') ? join(homedir(), path.slice(2)) : path;
}
