/** Harus sama dengan `basePath` di next.config.ts (kosong: app di root domain, kini portal.meetimpro.site). Dipakai untuk navigasi penuh (window.location) di client. */
export const APP_BASE_PATH = '';

/** Prefix lama sebelum app dipindah ke root (2026-11-14). Callback OAuth Google & Dropbox tetap terdaftar di bawah prefix ini dan dialihkan 308 ke root. */
export const LEGACY_BASE_PATH = '/can-freelance';
