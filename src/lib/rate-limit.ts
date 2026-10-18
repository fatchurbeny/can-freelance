/**
 * Pembatas percobaan login per IP (in-memory; efektif untuk 1 proses PM2 — bila cluster >1,
 * pindahkan ke DB). Melengkapi kunci per akun di loginAction.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;

const hits = new Map<string, number[]>();

export function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX_ATTEMPTS;
}
