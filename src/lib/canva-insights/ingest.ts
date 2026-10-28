import prisma from '@/lib/prisma';
import type { Prisma } from '../../../generated/prisma';
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
}

type Tx = Prisma.TransactionClient;

async function accountIdFor(brandId: string): Promise<string> {
  const account = await prisma.account.findUnique({ where: { canvaBrandId: brandId }, select: { id: true } });
  if (!account) throw new UnknownBrandError(brandId);
  return account.id;
}

async function ensureTemplates(
  tx: Tx,
  brandId: string,
  accountId: string,
  templates: { id: string; publishedAt: Date | null; lastActivityAt: Date | null }[],
) {
  for (const t of templates) {
    const activity = {
      ...(t.publishedAt ? { publishedAt: t.publishedAt } : {}),
      ...(t.lastActivityAt ? { lastActivityAt: t.lastActivityAt } : {}),
    };
    await tx.canvaTemplate.upsert({
      where: { id: t.id },
      create: { id: t.id, canvaBrandId: brandId, accountId, ...activity },
      update: activity,
    });
  }
}

/** Tulis hasil parse; mengembalikan jumlah baris yang di-upsert. */
async function applyParsed(tx: Tx, parsed: ParsedBatch, brandId: string, accountId: string, batchId: string): Promise<number> {
  switch (parsed.endpoint) {
    case 'content.by_brand':
      await ensureTemplates(tx, brandId, accountId, parsed.templates);
      return parsed.templates.length;

    case 'content.by_content':
      await ensureTemplates(tx, brandId, accountId, parsed.templates);
      for (const d of parsed.daily) {
        const values = { applies: d.applies, usages: d.usages, batchId };
        await tx.canvaTemplateDaily.upsert({
          where: { templateId_date_audience: { templateId: d.templateId, date: d.date, audience: d.audience } },
          create: { templateId: d.templateId, date: d.date, audience: d.audience, ...values },
          update: values,
        });
      }
      return parsed.daily.length;

    case 'brand.breakdowns':
      for (const d of parsed.brandDaily) {
        const values = { applies: d.applies, usages: d.usages, batchId };
        await tx.canvaBrandDaily.upsert({
          where: { canvaBrandId_date_audience: { canvaBrandId: brandId, date: d.date, audience: d.audience } },
          create: { canvaBrandId: brandId, date: d.date, audience: d.audience, ...values },
          update: values,
        });
      }
      return parsed.brandDaily.length;

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

  const rowCount = await prisma.$transaction(
    async (tx) => {
      const n = await applyParsed(tx, parsed, batch.canvaBrandId, accountId, batchId);
      await tx.canvaIngestBatch.update({
        where: { id: batchId },
        data: { status: 'PARSED', error: null, rowCount: n, parserVersion: PARSER_VERSION },
      });
      return n;
    },
    { timeout: 30_000 },
  );
  return { batchId, status: 'PARSED', rowCount, templateIds: touchedTemplateIds(parsed) };
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
  if (templateIds.length > 0) await matchTemplates(templateIds);
  return result;
}
