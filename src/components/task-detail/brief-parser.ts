export type BriefKind = 'image' | 'palette' | 'links' | 'assets' | 'keywords' | 'prompt' | 'custom' | 'notes' | 'checklist';

export const BRIEF_ORDER: Record<BriefKind, number> = {
  image: 1,
  palette: 2,
  links: 3,
  assets: 4,
  keywords: 5,
  prompt: 6,
  custom: 7,
  notes: 8,
  // Checklist QA (lib/checklist-qa.ts) selalu di akhir body
  checklist: 9,
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
  if (/\bchecklist\s+qa\b/.test(h)) return 'checklist';
  if (h.includes('image') || h.includes('gambar')) return 'image';
  if (h.includes('palette') || h.includes('warna')) return 'palette';
  if (/\bassets?\b/.test(h)) return 'assets';
  if (h.includes('wireframe') || h.includes('template') || h.includes('refrence') || h.includes('reference')) return 'links';
  if (h.includes('keyword')) return 'keywords';
  if (/\bprompt\b/.test(h)) return 'prompt';
  if (h.includes('catatan') || h.includes('note')) return 'notes';
  return 'custom';
}

/** Pecah markdown brief per heading `## ` (teks sebelum heading pertama = section tanpa judul). */
export function splitBriefSections(markdown: string): { heading: string; lines: string[] }[] {
  const out: { heading: string; lines: string[] }[] = [];
  let heading = '';
  let lines: string[] = [];
  for (const line of markdown.split('\n')) {
    const m = line.match(/^##\s*(.*)/);
    if (m) {
      if (heading || lines.some((l) => l.trim())) out.push({ heading, lines });
      heading = m[1].trim();
      lines = [];
    } else lines.push(line);
  }
  if (heading || lines.some((l) => l.trim())) out.push({ heading, lines });
  return out;
}

export interface BriefSwatch { role?: string; hex: string }

/** Warna di section palet: baris `Primary: #AABBCC` memberi role, hex lain ditambahkan tanpa role. */
export function parseBriefColors(lines: string[]): BriefSwatch[] {
  const colors: BriefSwatch[] = [];
  const add = (hex: string, role?: string) => {
    const h = hex.toUpperCase();
    const existing = colors.find((c) => c.hex === h);
    if (existing) { if (role && !existing.role) existing.role = role; }
    else colors.push({ hex: h, role });
  };
  for (const line of lines) {
    const t = line.trim();
    const role = t.match(/^[-*]?\s*([A-Za-z ]+):\s*`?(#[A-Fa-f0-9]{6})`?\s*$/);
    if (role && !/swatch/i.test(role[1])) { add(role[2], role[1].trim()); continue; }
    for (const m of t.matchAll(/#[A-Fa-f0-9]{6}\b/g)) add(m[0]);
  }
  return colors;
}

/** Static /uploads/ ada di belakang Basic Auth Nginx (401); arahkan ke route app /api/uploads/. */
export function toServableImage(url: string): string {
  const m = url.match(/\/uploads\/([^/?#]+)$/);
  if (m && !url.includes('/api/uploads/')) return `/can-freelance/api/uploads/${m[1]}`;
  return url;
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

export const PALETTE_ROLES = ['Primary', 'Accent', 'Secondary', 'Neutral', 'Background'];

/**
 * Acak role warna (Primary, Accent, …) di section Color Palette.
 * Menulis ulang baris `Swatches` + baris role secara konsisten; baris lain di section tetap.
 * Mengembalikan null bila tidak ada palet atau warnanya kurang dari 2.
 */
export function shufflePaletteMarkdown(markdown: string | null | undefined): string | null {
  if (!markdown) return null;
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => /^##\s/.test(l) && classifyHeading(l.replace(/^##\s*/, '')) === 'palette');
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end < 0) end = lines.length;

  const body = lines.slice(start + 1, end);
  const hexes: string[] = [];
  const kept: string[] = [];
  for (const line of body) {
    const found = line.match(/#[A-Fa-f0-9]{6}\b/g);
    if (!found) { kept.push(line); continue; }
    for (const h of found) if (!hexes.includes(h.toUpperCase())) hexes.push(h.toUpperCase());
  }
  if (hexes.length < 2) return null;

  let next = hexes;
  while (next.every((h, i) => h === hexes[i])) {
    next = [...hexes];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
  }

  const colorLines = [
    `- Swatches: ${next.join(', ')}`,
    ...next.map((h, i) => `- ${PALETTE_ROLES[i] || `Color ${i + 1}`}: \`${h}\``),
  ];
  const otherLines = kept.filter((l) => l.trim());
  const trailingBlank = body.length && !body[body.length - 1].trim() ? [''] : [];
  return [...lines.slice(0, start + 1), ...colorLines, ...otherLines, ...trailingBlank, ...lines.slice(end)].join('\n');
}

const IMAGE_MD_RE = /!\[[^\]]*\]\(([^)\s]+)\)/g;
const IMAGE_HEADING_LINE = '## 🖼️ Reference Image';

/** Semua URL gambar (`![](url)`) di section Reference Image, berurutan & tanpa duplikat. */
export function referenceImageUrls(markdown: string): string[] {
  const urls: string[] = [];
  for (const sec of splitBriefSections(markdown || '')) {
    if (classifyHeading(sec.heading) !== 'image') continue;
    for (const m of sec.lines.join('\n').matchAll(IMAGE_MD_RE)) {
      if (!urls.includes(m[1])) urls.push(m[1]);
    }
  }
  return urls;
}

/** Rentang baris [start, end) section Reference Image pertama, atau null. */
function findImageSection(lines: string[]): [number, number] | null {
  const start = lines.findIndex((l) => {
    const m = l.match(/^##\s*(.*)/);
    return !!m && classifyHeading(m[1]) === 'image';
  });
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^##\s*/.test(l));
  if (end < 0) end = lines.length;
  return [start, end];
}

/** Tambahkan gambar ke section Reference Image (dibuat bila belum ada); URL yang sudah ada dilewati. */
export function addReferenceImages(markdown: string, urls: string[]): string {
  const existing = referenceImageUrls(markdown);
  const fresh = urls.filter((u, i) => u && !existing.includes(u) && urls.indexOf(u) === i);
  if (fresh.length === 0) return markdown || '';
  const imgLines = fresh.map((u) => `![](${u})`);
  const lines = (markdown || '').split('\n');
  const range = findImageSection(lines);
  if (!range) {
    const rest = (markdown || '').trim();
    return [IMAGE_HEADING_LINE, ...imgLines].join('\n') + (rest ? `\n\n${rest}` : '\n');
  }
  const [start, end] = range;
  let insertAt = end;
  while (insertAt > start + 1 && !lines[insertAt - 1].trim()) insertAt--;
  const next = [...lines.slice(0, insertAt), ...imgLines, ...lines.slice(insertAt)];
  return next.join('\n');
}

/** Hapus satu gambar dari section Reference Image (baris `![](url)` yang cocok). */
export function removeReferenceImage(markdown: string, url: string): string {
  const lines = (markdown || '').split('\n');
  const range = findImageSection(lines);
  if (!range) return markdown || '';
  const [start, end] = range;
  const body = lines.slice(start + 1, end).flatMap((l) => {
    const next = l.replace(/!\[[^\]]*\]\(([^)\s]+)\)/g, (all, u) => (u === url ? '' : all));
    // Baris yang kosong karena gambarnya dihapus ikut dibuang; baris kosong asli dipertahankan
    return next !== l && !next.trim() ? [] : [next];
  });
  return [...lines.slice(0, start + 1), ...body, ...lines.slice(end)].join('\n');
}
