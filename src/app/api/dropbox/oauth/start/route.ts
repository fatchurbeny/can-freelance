import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { buildAuthorizeUrl, dropboxRedirectUri, getDropboxConfig } from '@/lib/dropbox';
import { authorizeApi } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const denied = await authorizeApi('integration.manage');
  if (denied) return denied;
  if (!getDropboxConfig().appKey) {
    return NextResponse.json({ error: 'DROPBOX_APP_KEY belum diisi di .env' }, { status: 500 });
  }
  const state = crypto.randomBytes(16).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('dropbox_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return NextResponse.redirect(buildAuthorizeUrl(state, dropboxRedirectUri(request.nextUrl.origin)));
}
