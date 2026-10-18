export type BriefKind = 'image' | 'palette' | 'links' | 'keywords' | 'custom' | 'notes';

export const BRIEF_ORDER: Record<BriefKind, number> = {
  image: 1,
  palette: 2,
  links: 3,
  keywords: 4,
  custom: 5,
  notes: 6,
};

export const NOTES_HEADING = 'Catatan untuk Designer';

/** Remove emoji / pictographs so headings like "🖼️ Reference Image" read cleanly. */
export function cleanHeading(heading: string): string {
  return heading
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyHeading(heading: string): BriefKind {
  const h = cleanHeading(heading).toLowerCase();
  if (h.includes('image') || h.includes('gambar')) return 'image';
  if (h.includes('palette') || h.includes('warna')) return 'palette';
  if (h.includes('wireframe') || h.includes('template') || h.includes('refrence') || h.includes('reference')) return 'links';
  if (h.includes('keyword')) return 'keywords';
  if (h.includes('catatan') || h.includes('note')) return 'notes';
  return 'custom';
}

/** Stable sort by canonical brief order (keeps relative order inside the same kind). */
export function sortByBriefOrder<T>(items: T[], getHeading: (item: T) => string): T[] {
  return items
    .map((item, index) => ({ item, index, rank: BRIEF_ORDER[classifyHeading(getHeading(item))] }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((x) => x.item);
}

/**
 * Re-orders a brief markdown body by `## ` sections into the canonical order.
 * Text before the first heading stays on top. Idempotent; safe on server and client.
 */
export function orderBriefMarkdown(markdown: string | null | undefined): string {
  if (!markdown || !markdown.trim()) return markdown ?? '';
  const lines = markdown.split('\n');
  const preamble: string[] = [];
  const sections: { heading: string; lines: string[] }[] = [];
  for (const line of lines) {
    if (/^##\s/.test(line)) sections.push({ heading: line.replace(/^##\s*/, ''), lines: [line] });
    else if (sections.length) sections[sections.length - 1].lines.push(line);
    else preamble.push(line);
  }
  if (sections.length < 2) return markdown;
  const ordered = sortByBriefOrder(sections, (s) => s.heading);
  const blocks = [preamble.join('\n').trim(), ...ordered.map((s) => s.lines.join('\n').trim())].filter(Boolean);
  return blocks.join('\n\n');
}
