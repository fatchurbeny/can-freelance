import prisma from '@/lib/prisma';
import { Prisma } from '../../../generated/prisma';
import { matchTemplates } from './match';
import { PARSER_VERSION, ParseError, parseBatch, type CanvaEndpoint, type ParsedBatch } from './parse';

/**
 * Simpan respons mentah → parse → upsert (docs/knowledge/canva-insights-spec.md §3.1, §5.1).
 * Batch selalu disimpan dulu agar bisa diparse ulang; parse gagal → REJECTED tanpa baris tertulis.
 */

export class UnknownBrandError extends Error {
  constructor(brandId: string) {
    super(`Brand ${brandId} belum terdaftar di Account.canvaBrandId`);
    this.name = 'UnknownBrandError';
  }
}

export interface IngestInput {
  brandId: string;
  endpoint: CanvaEndpoint;
  query: Prisma.InputJsonValue;
  payload: Prisma.InputJsonValue;
  source?: 'collector' | 'manual';
  runId?: string | null;
}

export interface IngestResult {
  batchId: string;
  status: 'PARSED' | 'REJECTED';
  rowCount: number;
  error?: string;
  /** Baris yang dilewati parser (batch tetap PARSED); alasannya juga di kolom `error` batch. */
  skippedRows?: number;
}

type Tx = Prisma.TransactionClient;

async function accountIdFor(brandId: string): Promise<string> {
  const account = await prisma.account.findUnique({ where: { canvaBrandId: brandId }, select: { id: true } });
  if (!account) throw new UnknownBrandError(brandId);
  return account.id;
}

/** Satu pernyataan untuk seluruh batch; satu baris per template, kolom aktivitas hanya ditimpa bila ada nilainya. */
async function ensureTemplates(
  tx: Tx,
  brandId: string,
  accountId: string,
  templates: { id: string; publishedAt: Date | null; lastActivityAt: Date | null }[],
) {
  if (templates.length === 0) return;
  const ids = templates.map((t) => t.id);
  // Prisma menulis timestamptz sebagai waktu tanpa zona yang ditafsirkan di zona sesi DB (Asia/Jakarta),
  // lalu membacanya kembali dengan pergeseran yang sama. Agar sama dengan baris yang ditulis Prisma,
  // nilai dikirim tanpa "Z" dan di-cast ::timestamp, bukan ::timestamptz (lihat gotcha di session-handover.md).
  const naive = (d: Date | null) => d?.toISOString().slice(0, -1) ?? null;
  const published = templates.map((t) => naive(t.publishedAt));
  const activity = templates.map((t) => naive(t.lastActivityAt));
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO canva_templates (id, canva_brand_id, account_id, published_at, last_activity_at)
    SELECT t.id, ${brandId}, ${accountId}::uuid, t.published_at, t.last_activity_at
    FROM unnest(${ids}::text[], ${published}::timestamp[], ${activity}::timestamp[]) AS t(id, published_at, last_activity_at)
    ON CONFLICT (id) DO UPDATE SET
      published_at = COALESCE(EXCLUDED.published_at, canva_templates.published_at),
      last_activity_at = COALESCE(EXCLUDED.last_activity_at, canva_templates.last_activity_at),
      updated_at = now()
    WHERE canva_templates.published_at IS DISTINCT FROM COALESCE(EXCLUDED.published_at, canva_templates.published_at)
       OR canva_templates.last_activity_at IS DISTINCT FROM COALESCE(EXCLUDED.last_activity_at, canva_templates.last_activity_at)`);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hari yang belum selesai saat batch diambil. Canva sempat mengirim angka parsial hari ini lalu
 * menyembunyikannya sampai harinya selesai; menyimpannya membuat total lebih besar dari dashboard Canva.
 */
const isComplete = (date: Date, receivedAt: Date) => date.getTime() + DAY_MS <= receivedAt.getTime();

/** Tulis hasil parse; mengembalikan jumlah baris yang di-upsert. */
async function applyParsed(
  tx: Tx,
  parsed: ParsedBatch,
  brandId: string,
  accountId: string,
  batchId: string,
  receivedAt: Date,
): Promise<number> {
  switch (parsed.endpoint) {
    case 'content.by_brand':
      await ensureTemplates(tx, brandId, accountId, parsed.templates);
      return parsed.templates.length;

    case 'content.by_content':
      await ensureTemplates(tx, brandId, accountId, parsed.templates);
      const daily = parsed.daily.filter((d) => isComplete(d.date, receivedAt));
      // Satu INSERT … ON CONFLICT untuk seluruh batch (±40 baris), bukan satu upsert per baris.
      if (daily.length > 0) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO canva_template_daily (template_id, date, audience, applies, usages, batch_id)
          SELECT d.template_id, d.date, d.audience, d.applies, d.usages, ${batchId}::uuid
          FROM unnest(
            ${daily.map((d) => d.templateId)}::text[],
            ${daily.map((d) => d.date.toISOString().slice(0, 10))}::date[],
            ${daily.map((d) => d.audience)}::text[],
            ${daily.map((d) => d.applies)}::int[],
            ${daily.map((d) => d.usages)}::int[]
          ) AS d(template_id, date, audience, applies, usages)
          ON CONFLICT (template_id, date, audience) DO UPDATE SET
            applies = EXCLUDED.applies, usages = EXCLUDED.usages, batch_id = EXCLUDED.batch_id, updated_at = now()`);
      }
      return daily.length;

    case 'brand.breakdowns': {
      const brandDaily = parsed.brandDaily.filter((d) => isComplete(d.date, receivedAt));
      for (const d of brandDaily) {
        const values = { applies: d.applies, usages: d.usages, batchId };
        await tx.canvaBrandDaily.upsert({
          where: { canvaBrandId_date_audience: { canvaBrandId: brandId, date: d.date, audience: d.audience } },
          create: { canvaBrandId: brandId, date: d.date, audience: d.audience, ...values },
          update: values,
        });
      }
      return brandDaily.length;
    }

    case 'tier_scores':
      for (const t of parsed.tiers) {
        const values = { tier: t.tier, score: t.score, raw: t.raw as Prisma.InputJsonValue, batchId };
        await tx.canvaTierScore.upsert({
          where: { canvaBrandId_date: { canvaBrandId: brandId, date: t.date } },
          create: { canvaBrandId: brandId, date: t.date, ...values },
          update: values,
        });
      }
      return parsed.tiers.length;

    case 'templates':
      for (const m of parsed.metadata) {
        const values = {
          sourceDesignId: m.sourceDesignId,
          title: m.title,
          keywords: m.keywords,
          license: m.license,
          pageCount: m.pageCount,
          thumbnailUrl: m.thumbnailUrl,
        };
        await tx.canvaTemplate.upsert({
          where: { id: m.id },
          create: { id: m.id, canvaBrandId: brandId, accountId, ...values },
          update: values,
        });
      }
      return parsed.metadata.length;
  }
}

function touchedTemplateIds(parsed: ParsedBatch): string[] {
  if (parsed.endpoint === 'templates') return parsed.metadata.map((m) => m.id);
  if (parsed.endpoint === 'content.by_brand' || parsed.endpoint === 'content.by_content') {
    return parsed.templates.map((t) => t.id);
  }
  return [];
}

/** Parse + tulis satu batch yang sudah tersimpan; dipakai ingest dan reparse. */
export async function processBatch(batchId: string): Promise<IngestResult & { templateIds: string[] }> {
  const batch = await prisma.canvaIngestBatch.findUniqueOrThrow({ where: { id: batchId } });
  const accountId = await accountIdFor(batch.canvaBrandId);

  let parsed: ParsedBatch;
  try {
    parsed = parseBatch(batch.endpoint as CanvaEndpoint, batch.payload, batch.canvaBrandId);
  } catch (e) {
    const error = e instanceof ParseError ? e.message : `Gagal parse: ${(e as Error).message}`;
    await prisma.canvaIngestBatch.update({
      where: { id: batchId },
      data: { status: 'REJECTED', error, rowCount: 0, parserVersion: PARSER_VERSION },
    });
    return { batchId, status: 'REJECTED', rowCount: 0, error, templateIds: [] };
  }

  const { skipped } = parsed;
  const note = skipped.count > 0 ? `${skipped.count} baris dilewati: ${skipped.reasons.join('; ')}` : null;
  const rowCount = await prisma.$transaction(
    async (tx) => {
      const n = await applyParsed(tx, parsed, batch.canvaBrandId, accountId, batchId, batch.receivedAt);
      await tx.canvaIngestBatch.update({
        where: { id: batchId },
        data: { status: 'PARSED', error: note, rowCount: n, parserVersion: PARSER_VERSION },
      });
      return n;
    },
    { timeout: 30_000 },
  );
  return {
    batchId,
    status: 'PARSED',
    rowCount,
    ...(note ? { error: note, skippedRows: skipped.count } : {}),
    templateIds: touchedTemplateIds(parsed),
  };
}

export async function ingestBatch(input: IngestInput): Promise<IngestResult> {
  await accountIdFor(input.brandId);
  const batch = await prisma.canvaIngestBatch.create({
    data: {
      canvaBrandId: input.brandId,
      endpoint: input.endpoint,
      query: input.query,
      payload: input.payload,
      source: input.source ?? 'collector',
      runId: input.runId ?? null,
    },
    select: { id: true },
  });
  const { templateIds, ...result } = await processBatch(batch.id);
  if (input.runId) {
    await prisma.canvaCollectorRun.updateMany({ where: { id: input.runId }, data: { batchCount: { increment: 1 } } });
  }
  // Judul dan ID desain sumber hanya datang dari endpoint templates; batch lain tidak mungkin cocok.
  if (input.endpoint === 'templates' && templateIds.length > 0) await matchTemplates(templateIds);
  return result;
}
