import { isCanvaShortLink, normalizeCanvaViewUrl, parseCanvaUrl } from '@/lib/canva-url';

/**
 * Ubah link pendek `canva.link/<kode>` menjadi link desain lengkap (`canva.com/design/<id>/<token>/view`)
 * dengan membaca header redirect-nya (tanpa membuka halaman Canva). Link lain dikembalikan apa adanya.
 * Hanya server: browser tidak bisa membaca Location lintas domain.
 */
export async function resolveCanvaShortLink(url: string): Promise<string> {
  let current = url.trim();
  if (!isCanvaShortLink(current)) return current;
  if (!/^https?:\/\//i.test(current)) current = `https://${current}`;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CAN-Freelance/1.0)' },
      signal: AbortSignal.timeout(8_000),
    });
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) break;
    current = new URL(location, current).toString();
    if (parseCanvaUrl(current)) return normalizeCanvaViewUrl(current);
  }
  throw new Error('Link canva.link tidak mengarah ke desain Canva.');
}
