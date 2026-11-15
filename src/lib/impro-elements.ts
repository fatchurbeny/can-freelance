/**
 * Katalog elemen improstd (Element Board), kontrak I-23. Server-ke-server di VPS yang sama:
 * `GET {IMPRO_INTERNAL_URL}/api/elements/library` dan `/api/elements/thumb/<mediaId>` dengan
 * `Authorization: Bearer <ELEMENTS_API_KEY>` (kunci terpisah dari BRIEF_API_KEY). Browser tidak pernah
 * memegang kunci: thumbnail diproksikan lewat /api/elements/thumb/<mediaId>.
 */
import type { ElementCategoryKey } from '@/lib/element-categories';

export interface ImproElementSet {
  ref: string;
  brand: string;
  id: string;
  name: string;
  style?: string | null;
  category: ElementCategoryKey;
  count: number;
  thumbs: string[];
  updatedAt?: string | null;
}

export interface ImproElementLibrary {
  categories: Record<string, string>;
  brands: { id: string; handle?: string | null; name?: string | null }[];
  sets: ImproElementSet[];
}

/** Basis URL internal improstd (bukan IMPRO_URL publik untuk redirect browser). */
export const improInternalUrl = () => (process.env.IMPRO_INTERNAL_URL || 'http://127.0.0.1:8790').replace(/\/+$/, '');

export function elementsKey(): string | null {
  const k = process.env.ELEMENTS_API_KEY;
  return k && k.length >= 32 ? k : null;
}

export const MEDIA_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

let cache: { at: number; data: ImproElementLibrary } | null = null;
const TTL_MS = 60_000;

/** Katalog lengkap (cache 60 dtk per proses). Melempar Error berpesan bila tidak tersedia. */
export async function fetchElementLibrary(): Promise<ImproElementLibrary> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const key = elementsKey();
  if (!key) throw new Error('ELEMENTS_API_KEY belum diisi di server.');
  let res: Response;
  try {
    res = await fetch(`${improInternalUrl()}/api/elements/library`, {
      headers: { authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error('Katalog elemen improstd tidak bisa dihubungi.');
  }
  if (res.status === 401) throw new Error('Kunci ELEMENTS_API_KEY ditolak improstd.');
  if (!res.ok) throw new Error(`Katalog elemen improstd error (${res.status}).`);
  const data = (await res.json()) as ImproElementLibrary;
  if (!data || !Array.isArray(data.sets)) throw new Error('Bentuk katalog elemen tidak dikenal.');
  cache = { at: Date.now(), data };
  return data;
}

/** Ambil satu thumbnail dari improstd (untuk route proksi). Null bila tidak ada. */
export async function fetchElementThumb(mediaId: string): Promise<{ body: ArrayBuffer; type: string } | null> {
  const key = elementsKey();
  if (!key || !MEDIA_ID_RE.test(mediaId)) return null;
  const res = await fetch(`${improInternalUrl()}/api/elements/thumb/${encodeURIComponent(mediaId)}`, {
    headers: { authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const type = res.headers.get('content-type') || 'image/png';
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(type.split(';')[0].trim())) return null;
  return { body: await res.arrayBuffer(), type };
}
