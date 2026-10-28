// Uji manual: collectBrand + Canva palsu → API dashboard sungguhan. Pakai: node test/e2e-local.mjs <config.json>
import { collectBrand } from '../lib/collect-brand.mjs';
import { loadConfig } from '../lib/config.mjs';
import { createServerClient } from '../lib/server.mjs';
import { DAY_MS, startOfUtcDay } from '../lib/util.mjs';

const cfg = loadConfig(process.argv[2]);
const brand = cfg.brands[0];
const now = Date.now();
const ids = Array.from({ length: 8 }, (_, i) => `EAHe2e0000${i}`);
async function fetchJson(endpoint, params) {
  const from = Number(params.fromDate ?? params.after);
  const to = Number(params.toDate ?? startOfUtcDay(now) + DAY_MS);
  const days = [];
  for (let d = from; d < to; d += DAY_MS) days.push(d);
  if (endpoint === 'content.by_brand') return { A: ids.map((e) => ({ 'A?': 'A', e, C: 3, D: 1, j: now - 30 * DAY_MS, E: now })) };
  if (endpoint === 'content.by_content') {
    const rows = days.flatMap((d) => [params.contentIds].flat().map((e) => ({ 'A?': 'A', e, k: d, l: d + DAY_MS, C: 2, D: 1, F: 'C', j: now - 30 * DAY_MS })));
    const offset = params.continuation ? Number(params.continuation) : 0;
    const page = rows.slice(offset, offset + Number(params.limit));
    return offset + page.length < rows.length ? { A: page, B: String(offset + page.length) } : { A: page };
  }
  if (endpoint === 'brand.breakdowns') return { A: days.map((d) => ({ 'A?': 'B', e: d, f: d + DAY_MS, C: 6, D: 3, F: 'C' })) };
  if (endpoint === 'tier_scores') return { A: days.map((d) => ({ A: 2, B: d, C: 'LOW', F: 0.5 })) };
  return { A: [params.id].flat().map((A) => ({ A, I: 'DAHe2e00000', R: `E2E ${A}`, T: ['e2e'], 0: 'none', d: 12, D: brand.brandId })) };
}
const server = createServerClient(cfg);
const runId = await server.startRun(brand.brandId);
const summary = await collectBrand({ brand, fetchJson, server, pagination: { param: null, detected: false }, runId, now });
await server.finishRun(runId, summary.rejected ? 'ERROR' : 'OK', JSON.stringify(summary));
console.log(JSON.stringify({ runId, summary }));
