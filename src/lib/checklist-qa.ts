/**
 * Section "✅ Checklist QA" di body kartu Notion (dipakai client & server).
 * Item wajib berasal dari `Doctype.qaChecklist`; section menyimpan status centang:
 *   ## ✅ Checklist QA
 *   - [x] Preview
 *   - [ ] Master Slides
 * Spec: design-handoff/IMPLEMENTATION-slide-master-builder.md §5.
 */

export const CHECKLIST_SECTION_HEADING = '## ✅ Checklist QA';

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface ChecklistState {
  items: ChecklistItem[];
  done: number;
  total: number;
  /** Section ada di body (task lama bisa belum punya). */
  hasSection: boolean;
}

const SECTION_RE = /^##[^\n]*checklist\s+qa[^\n]*\n?([\s\S]*?)(?=^##\s|(?![\s\S]))/im;
const ITEM_RE = /^\s*[-*]\s*\[([ xX])\]\s*(.+?)\s*$/;

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Status checklist. Bila `required` diisi (dari Doctype), item mengikuti daftar itu:
 * item yang belum ada di section dihitung belum tercentang, item di luar daftar diabaikan.
 */
export function parseChecklistSection(markdown: string | null | undefined, required: readonly string[] = []): ChecklistState {
  const section = markdown?.match(SECTION_RE);
  const found: ChecklistItem[] = [];
  if (section) {
    for (const line of section[1].split('\n')) {
      const match = line.match(ITEM_RE);
      if (match) found.push({ label: match[2], checked: match[1].toLowerCase() === 'x' });
    }
  }
  const items = required.length
    ? required.map((label) => ({ label, checked: found.find((f) => sameLabel(f.label, label))?.checked ?? false }))
    : found;
  return { items, done: items.filter((i) => i.checked).length, total: items.length, hasSection: !!section };
}

/** Markdown section Checklist QA lengkap dengan heading. */
export function buildChecklistSection(items: readonly ChecklistItem[]): string {
  return `${CHECKLIST_SECTION_HEADING}\n${items.map((i) => `- [${i.checked ? 'x' : ' '}] ${i.label}`).join('\n')}`;
}

/** Body tanpa section Checklist QA (untuk tampilan & editor Design Brief). */
export function stripChecklistSection(markdown: string | null | undefined): string {
  return (markdown || '').replace(SECTION_RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Section Checklist QA (dengan heading) dari body; '' bila tidak ada. */
export function extractChecklistSection(markdown: string | null | undefined): string {
  return markdown?.match(SECTION_RE)?.[0].trim() ?? '';
}

/** Ganti section Checklist QA di body dengan `sectionMarkdown` (diletakkan di akhir; kosong = hapus section). */
export function mergeChecklistSection(body: string | null | undefined, sectionMarkdown: string): string {
  const cleaned = stripChecklistSection(body);
  const next = sectionMarkdown.trim();
  if (!next) return cleaned;
  return cleaned ? `${cleaned}\n\n${next}` : next;
}

/** Tambahkan section kosong dari Doctype bila body belum punya; body lain tidak berubah. */
export function ensureChecklistSection(body: string | null | undefined, required: readonly string[]): string | null {
  if (!required.length || SECTION_RE.test(body || '')) return body ?? null;
  return mergeChecklistSection(body, buildChecklistSection(required.map((label) => ({ label, checked: false }))));
}

/** Ubah centang satu item; section ditulis ulang mengikuti daftar Doctype. */
export function setChecklistItem(body: string | null | undefined, required: readonly string[], label: string, checked: boolean): string {
  const items = parseChecklistSection(body, required).items.map((i) => (sameLabel(i.label, label) ? { ...i, checked } : i));
  return mergeChecklistSection(body, buildChecklistSection(items));
}

/** Indikator kartu: abu 0/n, amber sebagian, hijau lengkap. */
export function checklistTone(done: number, total: number): 'neutral' | 'partial' | 'complete' {
  if (total > 0 && done >= total) return 'complete';
  return done > 0 ? 'partial' : 'neutral';
}

type StatusLike = { notionKey?: string | null; displayName?: string | null } | null | undefined;

const statusNames = (s: StatusLike) => [s?.notionKey, s?.displayName].filter(Boolean).map((n) => n!.trim().toLowerCase());

/** Status QA (aturan yang sama dengan pencocokan status saat sync Notion). */
export function isQaStatusName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === 'qa' || n.includes('q&a') || n.includes('in qa') || n.includes('quality assurance');
}

export function isQaStatus(status: StatusLike): boolean {
  return statusNames(status).some(isQaStatusName);
}

export function isInReviewStatus(status: StatusLike): boolean {
  return statusNames(status).some((n) => n.includes('review'));
}

/** Status setelah In Review (Approved, termasuk Profile Only). */
export function isApprovedStatus(status: StatusLike): boolean {
  return statusNames(status).some((n) => n.includes('aprov') || n.includes('approv'));
}

/** Status sebelum designer bekerja: section boleh dibuat ulang saat Doctype diganti. */
export function isPreWorkStatus(status: StatusLike): boolean {
  return !status || statusNames(status).some((n) => n === 'draft' || n === 'not started');
}

/** Pesan penolakan QA → In Review, atau null bila boleh. */
export function checklistGateError(
  args: { isDropbox: boolean; current: StatusLike; target: StatusLike; bodyText: string | null | undefined; required: readonly string[] },
): string | null {
  if (!args.isDropbox || !args.required.length) return null;
  if (!isQaStatus(args.current) || !isInReviewStatus(args.target)) return null;
  const c = parseChecklistSection(args.bodyText, args.required);
  return c.done < c.total ? `Checklist QA belum lengkap (${c.done}/${c.total}). Lengkapi dulu sebelum pindah ke In Review.` : null;
}
