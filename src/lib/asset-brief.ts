/**
 * Section "📦 Assets" di Design Brief (dipakai client & server).
 * Format baris: `- [Judul](https://www.canva.com/design/…/view) — hlm 3, 7`
 * Bagian "— hlm …" opsional; tanpa itu berarti semua halaman.
 */

export const ASSET_SECTION_HEADING = '## 📦 Assets';

export interface BriefAssetRef {
  title: string;
  url: string;
  pages: string | null;
}

const SECTION_RE = /^##[^\n]*\bassets?\b[^\n]*\n?([\s\S]*?)(?=^##\s|(?![\s\S]))/im;
const LINE_RE = /^\s*[-*]\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*(?:[—–-]\s*(?:hlm\.?|halaman)\s*(.+))?$/i;

/** Aset yang dirujuk di section Assets; [] bila section tidak ada. */
export function parseAssetSection(markdown: string | null | undefined): BriefAssetRef[] {
  if (!markdown) return [];
  const section = markdown.match(SECTION_RE);
  if (!section) return [];
  const refs: BriefAssetRef[] = [];
  for (const line of section[1].split('\n')) {
    const match = line.match(LINE_RE);
    if (!match) continue;
    refs.push({ title: match[1].trim(), url: match[2].trim(), pages: match[3]?.trim() || null });
  }
  return refs;
}

/** Markdown section Assets lengkap dengan heading. */
export function buildAssetSection(items: BriefAssetRef[]): string {
  const lines = items.map((item) => {
    const title = item.title.replace(/[[\]]/g, '');
    const pages = item.pages?.trim();
    return `- [${title}](${item.url})${pages ? ` — hlm ${pages}` : ''}`;
  });
  return `${ASSET_SECTION_HEADING}\n${lines.join('\n')}`;
}

/** Ganti section Assets di brief dengan `sectionMarkdown` (section kosong = hapus section). */
export function mergeAssetsMarkdown(body: string, sectionMarkdown: string): string {
  const cleaned = (body || '').replace(SECTION_RE, '').replace(/\n{3,}/g, '\n\n').trim();
  const next = sectionMarkdown.trim();
  if (!next || next === ASSET_SECTION_HEADING) return cleaned;
  return cleaned ? `${cleaned}\n\n${next}` : next;
}
