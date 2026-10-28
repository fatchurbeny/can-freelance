'use server';

import { denyWrite } from '@/lib/access';
import { importInsightsJson, type ImportSummary } from '@/lib/canva-insights/import';
import { UnknownBrandError } from '@/lib/canva-insights/ingest';
import { MAX_INGEST_BYTES } from '@/lib/canva-insights/api-auth';

/**
 * Unggah/tempel JSON respons Canva Insights secara manual (fixture atau satu respons).
 * Diproses oleh handler ingest yang sama dengan collector, `source = "manual"`.
 */
export async function importCanvaInsightsAction(
  jsonText: string,
): Promise<{ success: true; summary: ImportSummary } | { success: false; error: string }> {
  const denied = await denyWrite('integration.manage');
  if (denied) return denied;
  // Fixture berisi beberapa respons; batas per respons tetap dicek di sisi collector.
  if (Buffer.byteLength(jsonText) > MAX_INGEST_BYTES * 10) {
    return { success: false, error: 'File terlalu besar (maks 20 MB).' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return { success: false, error: 'Isi bukan JSON yang valid.' };
  }
  try {
    return { success: true, summary: await importInsightsJson(raw) };
  } catch (e) {
    if (e instanceof UnknownBrandError) {
      return { success: false, error: `${e.message}. Jalankan scripts/seed-canva-brands.ts terlebih dahulu.` };
    }
    console.error('[importCanvaInsightsAction]', e);
    return { success: false, error: (e as Error).message || 'Gagal mengimpor data Canva Insights.' };
  }
}
