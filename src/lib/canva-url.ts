/**
 * Helper link Canva untuk Asset Library (dipakai client & server).
 * Link edit (`…/edit`) butuh login akun tim; public view link (`…/view`) bisa di-embed tanpa login.
 * Token di link edit dan link view berbeda, jadi link view tidak bisa diturunkan dari link edit.
 */

export type CanvaLinkMode = 'edit' | 'view' | 'other';

export interface ParsedCanvaUrl {
  designId: string;
  token: string | null;
  mode: CanvaLinkMode;
}

const CANVA_DESIGN_RE = /canva\.com\/design\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_-]+))?(?:\/([a-z]+))?/i;

/** Ambil ID desain, token, dan mode link dari URL Canva; null bila bukan link desain Canva. */
export function parseCanvaUrl(url: string | null | undefined): ParsedCanvaUrl | null {
  if (!url) return null;
  const match = url.trim().match(CANVA_DESIGN_RE);
  if (!match) return null;
  const [, designId, token, tail] = match;
  // Bentuk pendek /design/<id>/edit: segmen kedua adalah mode, bukan token
  const second = token?.toLowerCase();
  if (second === 'edit' || second === 'view') return { designId, token: null, mode: second };
  const mode = tail?.toLowerCase();
  return { designId, token: token ?? null, mode: mode === 'edit' || mode === 'view' ? mode : 'other' };
}

/** True bila URL adalah public view link Canva (`/design/<id>/<token>/view`). */
export function isPublicViewUrl(url: string | null | undefined): boolean {
  const parsed = parseCanvaUrl(url);
  return !!parsed && parsed.mode === 'view' && !!parsed.token;
}

/** URL iframe embed untuk public view link; null bila bukan view link. */
export function toCanvaEmbedUrl(url: string | null | undefined): string | null {
  const parsed = parseCanvaUrl(url);
  if (!parsed || parsed.mode !== 'view' || !parsed.token) return null;
  return `https://www.canva.com/design/${parsed.designId}/${parsed.token}/view?embed`;
}

/**
 * Thumbnail halaman pertama dari public view link (dipakai sebagai cover default).
 * Dimuat langsung oleh browser; permintaan dari server ditolak proteksi bot Canva.
 */
export function toCanvaThumbnailUrl(url: string | null | undefined): string | null {
  const parsed = parseCanvaUrl(url);
  if (!parsed || parsed.mode !== 'view' || !parsed.token) return null;
  return `https://www.canva.com/design/${parsed.designId}/${parsed.token}/screen?type=thumbnail`;
}

/** Link pendek Canva (`canva.link/<kode>`), default tombol Copy di menu Public view link. */
export function isCanvaShortLink(url: string | null | undefined): boolean {
  return !!url && /^(https?:\/\/)?(www\.)?canva\.link\/[A-Za-z0-9_-]+\/?(\?.*)?$/i.test(url.trim());
}

/** Public view link tanpa parameter pelacakan (utm_*), mis. hasil redirect canva.link. */
export function normalizeCanvaViewUrl(url: string): string {
  const parsed = parseCanvaUrl(url);
  if (!parsed || parsed.mode !== 'view' || !parsed.token) return url.trim();
  return `https://www.canva.com/design/${parsed.designId}/${parsed.token}/view`;
}

/** Pesan validasi untuk kolom Public View; null bila valid. */
export function publicViewUrlError(url: string | null | undefined): string | null {
  if (!url?.trim()) return 'Public view link wajib diisi.';
  if (isCanvaShortLink(url)) return 'Link canva.link belum bisa dibuka. Pastikan link public view masih aktif.';
  const parsed = parseCanvaUrl(url);
  if (!parsed) return 'Bukan link desain Canva.';
  if (parsed.mode === 'edit') return 'Ini link /edit dan butuh login. Di Canva buka Share → Public view link, lalu tempel link yang berakhiran /view.';
  if (parsed.mode !== 'view' || !parsed.token) return 'Gunakan public view link (berakhiran /view).';
  return null;
}
