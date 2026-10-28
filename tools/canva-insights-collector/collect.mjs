#!/usr/bin/env node
/**
 * Collector Canva Creator Insights (docs/knowledge/canva-insights-spec.md §5, README.md).
 *
 *   node collect.mjs login <slug>                         login manual + MFA di profil Chrome brand
 *   node collect.mjs run [--brand <slug>] [--dry-run] [--backfill] [--config <path>]
 *
 * Exit code ≠ 0 bila ada brand yang tidak OK.
 */
import { createInterface } from 'node:readline/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { CanvaHttpError, PaginationError, openBrandSession } from './lib/canva.mjs';
import { collectBrand } from './lib/collect-brand.mjs';
import { DEFAULT_CONFIG_PATH, loadConfig, saveConfigValue } from './lib/config.mjs';
import { createDryRunClient, createServerClient, ServerAuthError } from './lib/server.mjs';
import { log } from './lib/util.mjs';

const COLLECTOR_VERSION = 1;
const OUT_DIR = new URL('./out/', import.meta.url).pathname;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { command, positional: [], dryRun: false, backfill: false, brand: null, config: DEFAULT_CONFIG_PATH };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--backfill') opts.backfill = true;
    else if (a === '--brand') opts.brand = rest[++i];
    else if (a === '--config') opts.config = rest[++i];
    else opts.positional.push(a);
  }
  return opts;
}

function launch(cfg, brand) {
  return chromium.launchPersistentContext(brand.profileDir, {
    channel: cfg.chromeChannel ?? 'chrome',
    headless: cfg.headless ?? false,
    viewport: null,
  });
}

async function login(cfg, slug) {
  const brand = cfg.brands.find((b) => b.slug === slug);
  if (!brand) throw new Error(`Brand "${slug}" tidak ada di config (pilihan: ${cfg.brands.map((b) => b.slug).join(', ')})`);
  const context = await chromium.launchPersistentContext(brand.profileDir, {
    channel: cfg.chromeChannel ?? 'chrome',
    headless: false,
    viewport: null,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto('https://www.canva.com/login');
  console.log(`\nLogin ke akun Canva brand "${brand.name ?? brand.slug}" (${brand.brandId}) di jendela Chrome yang terbuka,`);
  console.log('selesaikan MFA, buka dashboard Creator sekali, lalu tekan Enter di sini.\n');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('Enter untuk menutup… ');
  rl.close();
  await context.close();
  log('INFO', `Profil ${brand.slug} disimpan di ${brand.profileDir}`);
}

async function runBrand(cfg, brand, opts) {
  const server = opts.dryRun ? createDryRunClient(join(OUT_DIR, brand.slug)) : createServerClient({ ...cfg, collectorVersion: COLLECTOR_VERSION });
  const runId = await server.startRun(brand.brandId);
  const pagination = { param: cfg.paginationParam ?? null, detected: false };
  let status = 'ERROR';
  let message = null;
  let context;
  try {
    log('INFO', `${brand.slug}: mulai${opts.dryRun ? ' (dry-run)' : ''}${opts.backfill ? ' (backfill)' : ''}`);
    context = await launch(cfg, brand);
    const session = await openBrandSession(context, brand);
    if (session.needsLogin) {
      status = 'NEEDS_LOGIN';
      message = `Sesi Canva habis; jalankan: node collect.mjs login ${brand.slug}`;
      return status;
    }
    if (session.challenge) {
      status = 'ERROR';
      message = `Canva menampilkan pemeriksaan Cloudflare; jalankan: node collect.mjs login ${brand.slug}, selesaikan di jendela Chrome, lalu ulangi`;
      return status;
    }
    const summary = await collectBrand({
      brand,
      fetchJson: session.fetchJson,
      server,
      pagination,
      runId,
      backfill: opts.backfill,
    });
    status = summary.rejected > 0 ? 'ERROR' : 'OK';
    message = `${summary.batches} batch, ${summary.rows} baris, ${summary.templates} template${summary.rejected ? `, ${summary.rejected} REJECTED` : ''}`;
    return status;
  } catch (e) {
    if (e instanceof ServerAuthError) throw e;
    if (e instanceof CanvaHttpError && e.status === 401) {
      status = 'NEEDS_LOGIN';
      message = `Canva 401; jalankan: node collect.mjs login ${brand.slug}`;
    } else {
      status = 'ERROR';
      message = `${e instanceof PaginationError ? 'Paginasi: ' : ''}${e.message}`;
    }
    return status;
  } finally {
    if (pagination.detected && pagination.param) {
      saveConfigValue(cfg.path, 'paginationParam', pagination.param);
      cfg.paginationParam = pagination.param;
      log('INFO', `paginationParam="${pagination.param}" disimpan ke config.json; catat juga di spek §1.3 & §9`);
    }
    await context?.close().catch(() => {});
    log(status === 'OK' ? 'INFO' : 'WARN', `${brand.slug}: ${status}${message ? ` — ${message}` : ''}`);
    await server.finishRun(runId, status, message).catch((e) => log('ERROR', `Gagal melapor run ${brand.slug}: ${e.message}`));
  }
}

async function run(cfg, opts) {
  const brands = opts.brand ? cfg.brands.filter((b) => b.slug === opts.brand) : cfg.brands;
  if (brands.length === 0) throw new Error(`Brand "${opts.brand}" tidak ada di config`);
  const results = {};
  for (const brand of brands) results[brand.slug] = await runBrand(cfg, brand, opts);
  log('INFO', 'Selesai', results);
  return Object.values(results).every((s) => s === 'OK') ? 0 : 1;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.command === 'login') {
    const slug = opts.positional[0];
    if (!slug) throw new Error('Pakai: node collect.mjs login <slug>');
    await login(loadConfig(opts.config, { requireServer: false }), slug);
    return 0;
  }
  if (opts.command === 'run') {
    return run(loadConfig(opts.config, { requireServer: !opts.dryRun }), opts);
  }
  console.log('Pakai: node collect.mjs login <slug> | run [--brand <slug>] [--dry-run] [--backfill] [--config <path>]');
  return 2;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e) => {
    log('ERROR', e.message);
    process.exitCode = 1;
  });
