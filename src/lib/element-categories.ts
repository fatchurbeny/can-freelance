/**
 * Kategori elemen katalog improstd (Element Board), kontrak I-23. Dipakai client & server:
 * label tampil di picker dan di section `## 🧩 Elemen` brief; kunci dikirim di JSON brief I-22.
 */
export const ELEMENT_CATEGORIES = {
  icon: 'Ikon',
  illustration: 'Ilustrasi',
  '3d': '3D',
  shape: 'Shape & Label',
  infographic: 'Infografis',
  texture: 'Tekstur & Pola',
  photo: 'Foto',
  frame: 'Bingkai',
  sticker: 'Stiker',
  other: 'Lainnya',
} as const;

export type ElementCategoryKey = keyof typeof ELEMENT_CATEGORIES;

/** Maksimal set per kategori yang boleh dipilih di brief (kontrak I-23). */
export const MAX_SETS_PER_CATEGORY = 4;

export const ELEMENTS_HEADING = '## 🧩 Elemen';

export const categoryKeyOf = (label: string): ElementCategoryKey | null => {
  const l = label.trim().toLowerCase();
  const hit = (Object.entries(ELEMENT_CATEGORIES) as [ElementCategoryKey, string][]).find(
    ([key, name]) => name.toLowerCase() === l || key === l,
  );
  return hit ? hit[0] : null;
};

export interface ElementPick {
  category: ElementCategoryKey;
  name: string;
  /** "<brandId>/<setId>" */
  ref: string;
}

const LINE_RE = /^\s*[-*]\s*([^:]+):\s*(.*?)\s*\(EB:([A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+)\)\s*$/;

/** Baris `- <Kategori>: <nama set> (EB:<brandId>/<setId>)` dari isi section Elemen. */
export function parseElementLines(body: string): ElementPick[] {
  const out: ElementPick[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(LINE_RE);
    if (!m) continue;
    const category = categoryKeyOf(m[1]);
    if (!category || out.some((p) => p.ref === m[3] && p.category === category)) continue;
    if (out.filter((p) => p.category === category).length >= MAX_SETS_PER_CATEGORY) continue;
    out.push({ category, name: m[2].trim(), ref: m[3] });
  }
  return out;
}

/** Section markdown lengkap (heading + baris); string kosong bila tidak ada pilihan. */
export function buildElementsSection(picks: ElementPick[]): string {
  if (!picks.length) return '';
  const order = Object.keys(ELEMENT_CATEGORIES) as ElementCategoryKey[];
  const lines = [...picks]
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
    .map((p) => `- ${ELEMENT_CATEGORIES[p.category]}: ${p.name.replace(/[()\n]/g, ' ').replace(/\s+/g, ' ').trim()} (EB:${p.ref})`);
  return `${ELEMENTS_HEADING}\n${lines.join('\n')}`;
}

/** Ganti (atau hapus bila `section` kosong) section 🧩 Elemen di markdown brief. */
export function mergeElementsMarkdown(body: string, section: string): string {
  const lines = (body || '').split('\n');
  const start = lines.findIndex((l) => /^##\s/.test(l) && /elemen|🧩/i.test(l));
  let rest = lines;
  if (start >= 0) {
    let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
    if (end < 0) end = lines.length;
    rest = [...lines.slice(0, start), ...lines.slice(end)];
  }
  const cleaned = rest.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!section) return cleaned;
  return cleaned ? `${cleaned}\n\n${section}` : section;
}

/** Pilihan yang sudah ada di section 🧩 Elemen brief (untuk pra-centang picker). */
export function picksFromBody(body: string): ElementPick[] {
  const lines = (body || '').split('\n');
  const start = lines.findIndex((l) => /^##\s/.test(l) && /elemen|🧩/i.test(l));
  if (start < 0) return [];
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end < 0) end = lines.length;
  return parseElementLines(lines.slice(start + 1, end).join('\n'));
}
