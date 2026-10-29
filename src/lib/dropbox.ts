/**
 * Dropbox client (multi-production Fase 6).
 * - OAuth in-app: refresh token disimpan terenkripsi di DropboxConnection.
 * - Akses dibatasi App Folder: semua path relatif terhadap Apps/<app-folder>/.
 */

import prisma from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

const API_HOST = 'https://api.dropboxapi.com/2';
const OAUTH_TOKEN_URL = 'https://api.dropbox.com/oauth2/token';
const AUTHORIZE_URL = 'https://www.dropbox.com/oauth2/authorize';
/** Redirect URI mengikuti origin tempat alur dimulai (localhost / 127.0.0.1), agar sessionStorage & cookie tetap satu origin. */
export function dropboxRedirectUri(origin: string): string {
  return `${origin}/can-freelance/api/dropbox/oauth/callback`;
}

export function getDropboxConfig() {
  return {
    appKey: process.env.DROPBOX_APP_KEY || '',
    appSecret: process.env.DROPBOX_APP_SECRET || '',
  };
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const { appKey } = getDropboxConfig();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', appKey);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('token_access_type', 'offline');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

async function postToken(params: Record<string, string>): Promise<any> {
  const { appKey, appSecret } = getDropboxConfig();
  const body = new URLSearchParams({ ...params, client_id: appKey, client_secret: appSecret });
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Dropbox token error: ${json.error_description || json.error || res.status}`);
  return json;
}

/** Tukar authorization code dengan refresh token, lalu simpan terenkripsi (satu baris). */
export async function connectWithAuthCode(code: string, redirectUri: string): Promise<{ accountId: string; accountEmail: string | null }> {
  const json = await postToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  if (!json.refresh_token) throw new Error('Dropbox tidak mengembalikan refresh token.');

  const { iv, encryptedData } = encrypt(json.refresh_token);
  const accountId: string = json.account_id || '';
  cachedAccess = null;

  let email: string | null = null;
  try {
    const account: any = await dbxRpcWithToken(json.access_token, 'users/get_current_account', null);
    email = account.email ?? null;
  } catch (_) {
    email = null;
  }

  await prisma.dropboxConnection.deleteMany({});
  await prisma.dropboxConnection.create({
    data: { accountId, accountEmail: email, encryptedRefreshToken: encryptedData, iv },
  });
  return { accountId, accountEmail: email };
}

export async function getDropboxStatus() {
  const conn = await prisma.dropboxConnection.findFirst();
  if (!conn) return { connected: false as const };
  return {
    connected: true as const,
    accountEmail: conn.accountEmail,
    connectedAt: conn.connectedAt.toISOString(),
  };
}

export async function disconnectDropbox() {
  cachedAccess = null;
  await prisma.dropboxConnection.deleteMany({});
}

// Access token di-cache sampai mendekati expiry (refresh token tetap di DB).
let cachedAccess: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccess && cachedAccess.expiresAt > Date.now() + 60_000) return cachedAccess.token;
  const conn = await prisma.dropboxConnection.findFirst();
  if (!conn) throw new Error('Dropbox belum terhubung. Hubungkan dari langkah Output wizard.');
  const refreshToken = decrypt(conn.encryptedRefreshToken, conn.iv);
  const json = await postToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
  cachedAccess = { token: json.access_token, expiresAt: Date.now() + Number(json.expires_in || 14400) * 1000 };
  return cachedAccess.token;
}

async function dbxRpcWithToken(token: string, endpoint: string, body: unknown): Promise<any> {
  const res = await fetch(`${API_HOST}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === null ? 'null' : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (_) {
    // Dropbox kadang mengembalikan teks biasa (mis. "Error in call to API function")
    json = { error_summary: text.slice(0, 300) };
  }
  if (!res.ok) {
    const err: any = new Error(json.error_summary || `Dropbox ${endpoint} failed (${res.status})`);
    err.summary = json.error_summary || '';
    err.status = res.status;
    throw err;
  }
  return json;
}

async function dbxRpc(endpoint: string, body: unknown): Promise<any> {
  return dbxRpcWithToken(await getAccessToken(), endpoint, body);
}

/** Nama folder/file aman untuk Dropbox (hapus karakter terlarang). */
export function safePathSegment(text: string): string {
  return text.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled';
}

/** Path task di dalam App Folder: {root}/{Task Month}/{Task}. */
export function taskFolderPath(root: string, taskMonth: string | null, taskName: string): string {
  const parts = [root, taskMonth || 'Tanpa Bulan', taskName].map((p) => safePathSegment(p).replace(/^\/+|\/+$/g, ''));
  return '/' + parts.filter(Boolean).join('/');
}

/** Buat folder (idempotent: konflik dianggap sudah ada). */
export async function ensureFolder(path: string): Promise<void> {
  try {
    await dbxRpc('files/create_folder_v2', { path, autorename: false });
  } catch (err: any) {
    if (!String(err.summary || err.message).includes('path/conflict')) throw err;
  }
}

/** File Request untuk folder tujuan. Mengembalikan URL publik upload. */
export async function createFileRequest(title: string, destinationPath: string): Promise<string> {
  await ensureFolder(destinationPath);
  const res = await dbxRpc('file_requests/create', {
    title: title.slice(0, 128),
    destination: destinationPath,
    open: true,
  });
  return res.url as string;
}

/** Apakah folder berisi minimal satu file (dipakai saat sync). */
export async function folderHasFiles(path: string): Promise<boolean> {
  try {
    const res = await dbxRpc('files/list_folder', { path, limit: 100 });
    return (res.entries || []).some((e: any) => e['.tag'] === 'file');
  } catch (err: any) {
    if (String(err.summary || '').includes('not_found')) return false;
    throw err;
  }
}

/** File di folder (tidak rekursif); null bila folder belum ada. */
export async function listFolderFiles(path: string): Promise<{ name: string; size: number; modified: string }[] | null> {
  try {
    const files: { name: string; size: number; modified: string }[] = [];
    let res = await dbxRpc('files/list_folder', { path, limit: 2000 });
    for (;;) {
      for (const e of res.entries || []) {
        if (e['.tag'] === 'file') files.push({ name: e.name, size: Number(e.size ?? 0), modified: e.server_modified ?? '' });
      }
      if (!res.has_more) break;
      res = await dbxRpc('files/list_folder/continue', { cursor: res.cursor });
    }
    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err: any) {
    if (String(err.summary || '').includes('not_found')) return null;
    throw err;
  }
}

/** Link publik folder (dibuat sekali; bila sudah ada, dipakai ulang). */
export async function getOrCreateFolderLink(path: string): Promise<string> {
  try {
    const res = await dbxRpc('sharing/create_shared_link_with_settings', {
      path,
      settings: { requested_visibility: 'public' },
    });
    return res.url as string;
  } catch (err: any) {
    if (!String(err.summary || '').includes('shared_link_already_exists')) throw err;
    const list = await dbxRpc('sharing/list_shared_links', { path, direct_only: true });
    const url = list.links?.[0]?.url;
    if (!url) throw err;
    return url as string;
  }
}
