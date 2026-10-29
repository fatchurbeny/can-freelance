import { orderBriefMarkdown } from '@/components/task-detail/brief-parser';

/**
 * Markdown body task → blok Notion (dipakai push body dari server action dan pemindai Dropbox).
 * Sync membaca balik blok ini lewat parseNotionBlocksToMarkdown (sync-notion.ts).
 */

/** Rich text Notion dari satu baris markdown: `[teks](url)` dan URL tunggal jadi link. */
function toRichText(content: string): any[] {
  const bare = content.trim().match(/^(https?:\/\/[^\s]+)$/i);
  if (bare) return [{ type: 'text', text: { content, link: { url: bare[1] } } }];
  const parts: any[] = [];
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(content)) !== null) {
    if (match.index > last) parts.push({ type: 'text', text: { content: content.slice(last, match.index) } });
    parts.push({ type: 'text', text: { content: match[1], link: { url: match[2] } } });
    last = match.index + match[0].length;
  }
  if (last < content.length) parts.push({ type: 'text', text: { content: content.slice(last) } });
  return parts.length > 0 ? parts : [{ type: 'text', text: { content } }];
}

export function markdownToNotionBlocks(bodyText: string): any[] {
  if (!bodyText || !bodyText.trim()) return [];
  // Notion always receives the canonical Design Brief section order
  const lines = orderBriefMarkdown(bodyText).split('\n');
  const blocks: any[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.fatchurbeny.com/can-freelance';

  let inColorPalette = false;
  let paletteLines: string[] = [];

  const flushColorPalette = () => {
    if (paletteLines.length === 0) return;

    // Extract unique hex codes
    const hexSet = new Set<string>();
    const hexRegex = /#([A-Fa-f0-9]{6})\b/g;
    for (const pl of paletteLines) {
      let match;
      while ((match = hexRegex.exec(pl)) !== null) {
        hexSet.add(`#${match[1].toUpperCase()}`);
      }
    }
    const hexList = Array.from(hexSet);

    if (hexList.length > 0) {
      const publicUrl = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
        ? 'https://portal.fatchurbeny.com/can-freelance'
        : baseUrl.replace(/\/$/, '');
      const cleanHexCsv = hexList.map((h) => h.replace('#', '')).join(',');

      // 1. Native Notion Image Block: Sharp-generated palette strip (100% reliable)
      try {
        const stripImageUrl = `${publicUrl}/api/palette/strip?colors=${cleanHexCsv}`;
        blocks.push({
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: {
              url: stripImageUrl,
            },
          },
        });
      } catch (e) {
        console.warn('Failed to construct image strip block:', e);
      }

      // 2. Clean Callout block for quick HEX copy-paste
      blocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '🎨' },
          color: 'gray_background',
          rich_text: [
            {
              type: 'text',
              text: { content: 'Extracted Color Palette\n' },
              annotations: { bold: true },
            },
            {
              type: 'text',
              text: { content: `All HEX: ${hexList.join(', ')}` },
            },
          ],
        },
      });
    }

    // 3. Detailed bullet items (Primary, Accent, etc.)
    for (const pl of paletteLines) {
      const trimmed = pl.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith('- swatches:')) continue;
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.replace(/^[-*]\s+/, '');
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content } }],
          },
        });
      }
    }

    paletteLines = [];
    inColorPalette = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('## ')) {
      if (inColorPalette) {
        flushColorPalette();
      }

      const headingContent = line.replace(/^##\s+/, '').trim();
      const isColorPaletteSection =
        headingContent.toLowerCase().includes('color palette') ||
        headingContent.includes('🎨');

      if (isColorPaletteSection) {
        inColorPalette = true;
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: headingContent } }],
          },
        });
      } else {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: headingContent } }],
          },
        });
      }
    } else if (inColorPalette) {
      paletteLines.push(line);
    } else if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: line.replace(/^###\s+/, '') } }],
        },
      });
    } else if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: line.replace(/^#\s+/, '') } }],
        },
      });
    } else if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
      // Checklist (mis. section Checklist QA) → blok to-do, dibaca balik oleh sync sebagai `- [x] …`
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: toRichText(line.replace(/^[-*]\s+\[[ xX]\]\s+/, '')),
          checked: /^[-*]\s+\[[xX]\]/.test(line),
        },
      });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.replace(/^[-*]\s+/, '');
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: toRichText(content) },
      });
    } else {
      // Check for Markdown image syntax: ![alt](url)
      const imgMatch = line.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/i);
      if (imgMatch) {
        blocks.push({
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: {
              url: imgMatch[2],
            },
          },
        });
      } else {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: toRichText(rawLine) },
        });
      }
    }
  }

  if (inColorPalette) {
    flushColorPalette();
  }

  return blocks;
}
