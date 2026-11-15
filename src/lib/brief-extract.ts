/**
 * Brief task → JSON untuk improstd (kontrak I-22, GET /api/brief/<taskId>).
 * Sumber: markdown `tasks.body_text` (section `## ` diklasifikasi brief-parser) + metadata task.
 * Brand hanya diisi bila pemanggil boleh melihat brand (`account.view`).
 */
import prisma from '@/lib/prisma';
import { parseElementLines, type ElementCategoryKey, type ElementPick } from '@/lib/element-categories';
import {
  classifyHeading,
  cleanHeading,
  parseBriefColors,
  PALETTE_ROLES,
  splitBriefSections,
  toServableImage,
} from '@/components/task-detail/brief-parser';

export interface BriefPayload {
  taskId: string;
  title: string;
  doctype: { name: string; studio: string | null; dimensions: string | null; aspectRatio: string | null; pages: number | null } | null;
  pages: number | null;
  languages: string[];
  license: string | null;
  prompt: string;
  notes: string;
  keywords: string[];
  palette: { role: string; hex: string }[];
  referenceImages: { url: string; external: boolean }[];
  links: { title: string; url: string; kind: 'wireframe' | 'reference' }[];
  brand: { name: string; canvaBrandId: string | null } | null;
  /** Set elemen katalog improstd dari section 🧩 Elemen (kontrak I-23); id, bukan nama, jadi dikirim juga untuk user tanpa account.view. */
  elements: { brand: string; picks: Partial<Record<ElementCategoryKey, string[]>> } | null;
  shareUrl: string | null;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Teks section tanpa baris kosong berlebih. */
const text = (lines: string[]) => lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

/** Judul tautan dari URL (Canva template slug, atau host). */
function linkTitle(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean);
    if (u.hostname.includes('canva') && seg[0] === 'templates' && seg[1]) {
      return seg[1].replace(/^[A-Za-z0-9_]+-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Pilihan 🧩 Elemen → `{ brand, picks }`; maks. 4 set per kategori (sudah dibatasi parser). */
export function toElements(picks: ElementPick[]): BriefPayload['elements'] {
  if (!picks.length) return null;
  const grouped: Partial<Record<ElementCategoryKey, string[]>> = {};
  for (const p of picks) (grouped[p.category] ??= []).push(p.ref);
  return { brand: picks[0].ref.split('/')[0], picks: grouped };
}

/**
 * Bangun payload brief. `appOrigin` (mis. http://127.0.0.1:3002) dipakai agar URL gambar unggahan
 * absolut; `publicBase` (mis. https://portal.fatchurbeny.com) untuk shareUrl.
 */
export async function buildBriefPayload(
  taskId: string,
  opts: { canViewAccount: boolean; appOrigin: string; publicBase: string },
): Promise<BriefPayload | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      name: true,
      bodyText: true,
      pages: true,
      languages: true,
      license: true,
      doctype: { select: { displayName: true, studio: true, dimensions: true, aspectRatio: true, pages: true } },
      taskAccounts: { select: { account: { select: { displayName: true, canvaBrandId: true } } } },
      shareLinks: { where: { revokedAt: null }, select: { token: true }, take: 1 },
    },
  });
  if (!task) return null;

  let prompt = '';
  const notes: string[] = [];
  const custom: string[] = [];
  const keywords: string[] = [];
  const palette: { role: string; hex: string }[] = [];
  const images: { url: string; external: boolean }[] = [];
  const links: BriefPayload['links'] = [];
  const elementPicks: ElementPick[] = [];

  for (const sec of splitBriefSections(task.bodyText || '')) {
    const kind = classifyHeading(sec.heading);
    const body = text(sec.lines);
    if (!body) continue;
    switch (kind) {
      case 'prompt':
        prompt = prompt ? `${prompt}\n\n${body}` : body;
        break;
      case 'notes':
        notes.push(body);
        break;
      case 'custom':
        custom.push(sec.heading ? `${cleanHeading(sec.heading)}:\n${body}` : body);
        break;
      case 'keywords':
        keywords.push(...body.replace(/^[-*]\s*/gm, '').split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean));
        break;
      case 'palette':
        parseBriefColors(sec.lines).forEach((c, i) => palette.push({ role: c.role || PALETTE_ROLES[i] || `Color ${i + 1}`, hex: c.hex }));
        break;
      case 'image': {
        const found = [
          ...Array.from(body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g), (m) => m[1]),
          ...Array.from(body.matchAll(/https?:\/\/[^\s)]+\.(?:png|jpe?g|webp|gif)\b/gi), (m) => m[0]),
        ];
        for (const raw of found) {
          const servable = toServableImage(raw);
          const local = servable.includes('/api/uploads/');
          const url = local ? `${opts.appOrigin}/api/uploads/${servable.split('/api/uploads/')[1]}` : servable;
          if (!images.some((x) => x.url === url)) images.push({ url, external: !local });
        }
        break;
      }
      case 'links': {
        const isWireframe = /wireframe/i.test(sec.heading);
        for (const m of body.matchAll(/https?:\/\/[^\s)\]]+/gi)) {
          if (!links.some((l) => l.url === m[0])) links.push({ title: linkTitle(m[0]), url: m[0], kind: isWireframe ? 'wireframe' : 'reference' });
        }
        break;
      }
      case 'elements':
        elementPicks.push(...parseElementLines(body));
        break;
      case 'assets':
        // Section "📦 Assets" di brief lama (fitur Asset Library dihapus 2026-11-14): baris `- [Judul](url) — hlm 3, 7` → link referensi.
        for (const m of body.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(?:\s*[—–-]\s*(?:hlm\.?|halaman)\s*(.+))?/gi)) {
          if (!links.some((l) => l.url === m[2])) links.push({ title: m[3] ? `${m[1].trim()} (hlm ${m[3].trim()})` : m[1].trim(), url: m[2], kind: 'reference' });
        }
        break;
      default:
        break; // checklist: bukan isi brief
    }
  }

  // Tanpa section Prompt: susun dari section bebas + keywords + judul (kontrak: prompt tidak pernah kosong bila ada isi).
  if (!prompt) {
    prompt = [task.name, ...custom, keywords.length ? `Keywords: ${keywords.join(', ')}` : '']
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join('\n\n');
  } else if (custom.length) {
    notes.unshift(...custom);
  }

  const account = task.taskAccounts[0]?.account ?? null;
  const token = task.shareLinks[0]?.token;
  return {
    taskId: task.id,
    title: task.name || '',
    doctype: task.doctype
      ? {
          name: task.doctype.displayName,
          studio: task.doctype.studio,
          dimensions: task.doctype.dimensions,
          aspectRatio: task.doctype.aspectRatio,
          pages: num(task.doctype.pages),
        }
      : null,
    pages: num(task.pages),
    languages: task.languages ?? [],
    license: task.license ?? null,
    prompt,
    notes: notes.join('\n\n'),
    keywords: Array.from(new Set(keywords)),
    palette,
    referenceImages: images,
    links,
    brand: opts.canViewAccount && account ? { name: account.displayName, canvaBrandId: account.canvaBrandId ?? null } : null,
    elements: toElements(elementPicks),
    shareUrl: token ? `${opts.publicBase}/share/t/${token}` : null,
  };
}
