import { APP_BASE_PATH } from '@/lib/base-path';
import { toCanvaThumbnailUrl } from '@/lib/canva-url';

/**
 * URL gambar cover yang bisa dimuat browser. Upload lokal disimpan sebagai `/api/uploads/<file>`;
 * tanpa cover → thumbnail Canva dari public view link.
 */
export function coverSrc(url: string | null | undefined, previewUrl?: string | null): string | null {
  if (!url) return toCanvaThumbnailUrl(previewUrl);
  if (url.startsWith('/api/')) return `${APP_BASE_PATH}${url}`;
  const local = url.match(/\/api\/uploads\/([^/?#]+)$/);
  return local ? `${APP_BASE_PATH}/api/uploads/${local[1]}` : url;
}

/** Warna latar cover placeholder per kategori (urutan tab). */
const COVER_TINTS = ['bg-[#ffe8dd] dark:bg-[#3a2418]', 'bg-[#e6e6ff] dark:bg-[#22224a]', 'bg-[#ddf3ec] dark:bg-[#15352c]', 'bg-[#ececef] dark:bg-[#272a34]'];
export function coverTint(index: number): string {
  return COVER_TINTS[((index % COVER_TINTS.length) + COVER_TINTS.length) % COVER_TINTS.length];
}

export function formatRelative(ms: number | null): string {
  if (!ms) return 'belum pernah';
  const diff = Math.max(0, Date.now() - ms);
  const min = Math.round(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
