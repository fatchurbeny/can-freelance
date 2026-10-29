/**
 * ID halaman Notion sementara (dipakai client & server).
 * - `app_created_…`: task dibuat di app tetapi halaman Notion gagal/belum dibuat → bisa dibuat ulang.
 * - `sync_mock_page_…`: data contoh tanpa Notion.
 */

export const APP_CREATED_PREFIX = 'app_created_';

/** Task tertaut ke halaman Notion sungguhan (aman memanggil API Notion dengan ID ini). */
export function isNotionLinked(notionPageId: string | null | undefined): boolean {
  return !!notionPageId && !notionPageId.startsWith(APP_CREATED_PREFIX) && !notionPageId.startsWith('sync_mock_page_');
}

/** Task dibuat di app tanpa halaman Notion → halaman bisa dibuat lewat "Buat di Notion". */
export function isMissingNotionPage(notionPageId: string | null | undefined): boolean {
  return !!notionPageId && notionPageId.startsWith(APP_CREATED_PREFIX);
}
