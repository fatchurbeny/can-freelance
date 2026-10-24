'use client';

import { useState, type ReactNode } from 'react';
import { ExternalLink, Check, Copy, FileText, Plus, Shuffle, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { classifyHeading, cleanHeading, sortByBriefOrder, NOTES_HEADING, type BriefKind } from './brief-parser';
import BriefAssetsList from '../assets/BriefAssetsList';
import { parseAssetSection, type BriefAssetRef } from '@/lib/asset-brief';

interface Props {
  bodyText: string;
  /** Opens Edit mode with a "Catatan untuk Designer" section ready */
  onAddNotes?: () => void;
  /** Acak role warna palet; tombol hanya tampil bila diisi (role yang boleh edit brief). */
  onShufflePalette?: () => void;
}

interface Swatch { role?: string; hex: string }
interface BriefLink { url: string; tag: 'WIREFRAME' | 'REFERENCE' }

interface PreviewCard {
  kind: BriefKind;
  title: string;
  content: string;
  imageUrl?: string | null;
  colors?: Swatch[];
  links?: BriefLink[];
  tags?: string[];
  assets?: BriefAssetRef[];
}

function splitSections(markdown: string) {
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

function parseColors(lines: string[]): Swatch[] {
  const colors: Swatch[] = [];
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

/** Static /uploads/ is behind Nginx Basic Auth (401) — stream through the app route instead. */
function toServableImage(url: string): string {
  const m = url.match(/\/uploads\/([^/?#]+)$/);
  if (m && !url.includes('/api/uploads/')) return `/can-freelance/api/uploads/${m[1]}`;
  return url;
}

function buildCards(markdown: string): PreviewCard[] {
  const raw = sortByBriefOrder(splitSections(markdown || ''), (s) => s.heading);
  const cards: PreviewCard[] = [];
  for (const sec of raw) {
    const kind = classifyHeading(sec.heading);
    const content = sec.lines.join('\n').trim();
    const title = cleanHeading(sec.heading);

    if (kind === 'links') {
      const isWireframe = /wireframe/i.test(sec.heading);
      const links: BriefLink[] = [];
      for (const m of content.matchAll(/https?:\/\/[^\s)]+/gi)) {
        links.push({ url: m[0], tag: isWireframe ? 'WIREFRAME' : 'REFERENCE' });
      }
      // Merge every wireframe/reference section into one card
      const existing = cards.find((c) => c.kind === 'links');
      if (existing) { existing.links!.push(...links); continue; }
      cards.push({ kind, title: 'Template Wireframe & Reference', content, links });
      continue;
    }
    if (kind === 'assets') {
      cards.push({ kind, title: title || 'Assets', content, assets: parseAssetSection(`## Assets\n${content}`) });
      continue;
    }
    if (kind === 'image') {
      const img = content.match(/!\[[^\]]*\]\(([^)\s]+)\)/) || content.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif)/i);
      cards.push({ kind, title: title || 'Reference Image', content, imageUrl: img ? toServableImage(img[1] ?? img[0]) : null });
      continue;
    }
    if (kind === 'palette') {
      cards.push({ kind, title: title || 'Color Palette', content, colors: parseColors(sec.lines) });
      continue;
    }
    if (kind === 'keywords') {
      const tags = content.replace(/^[-*]\s*/gm, '').split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
      cards.push({ kind, title: title || 'Keywords', content, tags });
      continue;
    }
    cards.push({ kind, title: title || (kind === 'notes' ? NOTES_HEADING : 'Catatan'), content });
  }
  return cards;
}

function linkSource(url: string) {
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
  if (host.includes('canva')) return { mark: 'C', bg: '#00C4CC', name: 'Canva' };
  if (host.includes('pin.it') || host.includes('pinterest')) return { mark: 'P', bg: '#E60023', name: 'Pinterest' };
  if (host.includes('figma')) return { mark: 'F', bg: '#1E1E1E', name: 'Figma' };
  return { mark: '', bg: '#6B7280', name: host };
}

function linkTitle(url: string) {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean);
    if (u.hostname.includes('canva') && seg[0] === 'templates' && seg[1]) {
      return seg[1].replace(/^[A-Za-z0-9_]+-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (u.hostname.includes('canva') && seg[0] === 'design') return 'Canva Design';
    return u.hostname.replace(/^www\./, '');
  } catch { return url; }
}

function Card({ index, title, meta, action, children }: { index: number; title: string; meta?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] rounded-none">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#f0f0f0] dark:border-[#272a34]">
        <span className="font-mono text-[11px] font-semibold text-[#ff5e1f]">{String(index).padStart(2, '0')}</span>
        <h4 className="flex-1 text-[13px] font-bold text-gray-900 dark:text-white">{title}</h4>
        {meta && <span className="text-[11px] text-gray-500 dark:text-gray-400">{meta}</span>}
        {action}
      </div>
      {children}
    </section>
  );
}

export default function DesignBriefPreview({ bodyText, onAddNotes, onShufflePalette }: Props) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const cards = buildCards(bodyText);

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    toast.success(`${hex} disalin`);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  const copyKeywords = (tags: string[]) => {
    navigator.clipboard.writeText(tags.join(', '));
    setCopiedKeywords(true);
    toast.success(`${tags.length} keyword disalin`);
    setTimeout(() => setCopiedKeywords(false), 1500);
  };

  const hasNotes = cards.some((c) => c.kind === 'notes');

  if (cards.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-gray-500 dark:text-gray-400">
        <FileText className="w-7 h-7 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p className="font-bold text-gray-700 dark:text-gray-300">Belum ada Design Brief</p>
        <p className="mt-1">Klik <strong>Edit</strong> untuk menambahkan referensi, palet warna, dan keywords.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cards.map((card, i) => {
        const n = i + 1;
        if (card.kind === 'image') {
          return (
            <Card key={i} index={n} title={card.title}>
              <div className="p-4">
                {card.imageUrl ? (
                  <a href={card.imageUrl} target="_blank" rel="noopener noreferrer" className="block border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.imageUrl} alt="Reference image" loading="lazy" className="w-full max-h-[360px] object-contain" />
                  </a>
                ) : (
                  <p className="text-xs text-gray-500">Gambar belum ditambahkan.</p>
                )}
              </div>
            </Card>
          );
        }
        if (card.kind === 'palette') {
          const colors = card.colors ?? [];
          return (
            <Card
              key={i}
              index={n}
              title={card.title}
              meta={colors.length ? `${colors.length} warna` : undefined}
              action={onShufflePalette && colors.length > 1 ? (
                <button
                  type="button"
                  onClick={onShufflePalette}
                  title="Acak susunan Primary, Accent, dst."
                  className="flex items-center gap-1 h-6 px-2 border border-[#f0f0f0] dark:border-[#272a34] text-[10px] font-semibold text-gray-600 dark:text-gray-300 hover:text-[#ff5e1f] hover:border-[#ff5e1f] transition-colors cursor-pointer"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Acak</span>
                </button>
              ) : undefined}
            >
              {colors.length ? (
                <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(colors.length, 5)}, minmax(0, 1fr))` }}>
                  {colors.map((c, ci) => (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => copyHex(c.hex)}
                      title={`Salin ${c.hex}`}
                      className="text-left border-r border-b border-[#f0f0f0] dark:border-[#272a34] last:border-r-0 cursor-pointer group"
                    >
                      <div className="h-16 flex items-center justify-center" style={{ backgroundColor: c.hex }}>
                        {copiedHex === c.hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                      </div>
                      <div className="px-2.5 py-2">
                        <p className="text-[11px] font-semibold text-gray-900 dark:text-white truncate">{c.role || '—'}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-gray-500 dark:text-gray-400 group-hover:text-[#ff5e1f]">{c.hex}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-xs text-gray-500">Kode warna belum ada.</p>
              )}
            </Card>
          );
        }
        if (card.kind === 'assets') {
          const refs = card.assets ?? [];
          return (
            <Card key={i} index={n} title={card.title} meta={refs.length ? `${refs.length} aset` : undefined}>
              <BriefAssetsList refs={refs} />
            </Card>
          );
        }
        if (card.kind === 'links') {
          const links = card.links ?? [];
          return (
            <Card key={i} index={n} title={card.title} meta={links.length ? `${links.length} link` : undefined}>
              {links.length ? (
                <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                  {links.map((l, li) => {
                    const src = linkSource(l.url);
                    return (
                      <a key={li} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#16181d] transition-colors group">
                        <span className="flex size-9 shrink-0 items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: src.bg }}>
                          {src.mark || <LinkIcon className="w-3.5 h-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">{linkTitle(l.url)}</span>
                            <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${l.tag === 'WIREFRAME' ? 'bg-[#ede9fe] text-[#5b21b6] dark:bg-[#7c3aed]/20 dark:text-[#c4b5fd]' : 'bg-[#fff3ee] text-[#9a3412] dark:bg-[#ff5e1f]/15 dark:text-[#ffb49a]'}`}>{l.tag}</span>
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-gray-500 dark:text-gray-400">{l.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-gray-400 group-hover:text-[#ff5e1f]" />
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="p-4 text-xs text-gray-500">Link belum ditambahkan.</p>
              )}
            </Card>
          );
        }
        if (card.kind === 'keywords') {
          const tags = card.tags ?? [];
          return (
            <Card
              key={i}
              index={n}
              title={card.title}
              meta={tags.length ? `${tags.length} tag` : undefined}
              action={tags.length ? (
                <button
                  type="button"
                  onClick={() => copyKeywords(tags)}
                  className="flex items-center gap-1.5 h-7 px-2.5 border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:text-[#ff5e1f] transition-colors cursor-pointer"
                >
                  {copiedKeywords ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKeywords ? 'Tersalin' : 'Copy'}</span>
                </button>
              ) : undefined}
            >
              <div className="flex flex-wrap gap-1.5 p-4">
                {tags.length ? tags.map((t, ti) => (
                  <button key={ti} type="button" title={`Salin "${t}"`} onClick={() => { navigator.clipboard.writeText(t); toast.success(`"${t}" disalin`); }} className="px-2.5 py-1 text-xs font-medium bg-[#fff3ee] text-[#9a3412] hover:bg-[#ffe4d6] dark:bg-[#ff5e1f]/15 dark:text-[#ffb49a] transition-colors cursor-pointer">{t}</button>
                )) : <span className="text-xs text-gray-500">Keyword belum ditambahkan.</span>}
              </div>
            </Card>
          );
        }
        return (
          <Card key={i} index={n} title={card.title}>
            {card.content ? (
              <p className="p-4 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{card.content}</p>
            ) : (
              <p className="p-4 text-xs text-gray-500">Belum ada catatan.</p>
            )}
          </Card>
        );
      })}

      {!hasNotes && (
        <Card index={cards.length + 1} title={NOTES_HEADING}>
          <div className="flex items-center justify-between gap-3 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Arahan tambahan untuk designer: mood, elemen wajib, hal yang harus dihindari.</p>
            {onAddNotes && (
              <button
                type="button"
                onClick={onAddNotes}
                className="flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#ff5e1f] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
