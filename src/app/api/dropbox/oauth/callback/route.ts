import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { connectWithAuthCode, dropboxRedirectUri } from '@/lib/dropbox';
import { authorizeApi } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const denied = await authorizeApi('integration.manage');
  if (denied) return denied;
  const origin = request.nextUrl.origin;
  // basePath dipakai konsisten dengan next.config.ts (route handler tidak selalu mengisi nextUrl.basePath)
  const doneUrl = new URL('/can-freelance/production/new', origin);

  const cookieStore = await cookies();
  const expectedState = cookieStore.get('dropbox_oauth_state')?.value;
  cookieStore.delete('dropbox_oauth_state');

  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error_description') || request.nextUrl.searchParams.get('error');
  const state = request.nextUrl.searchParams.get('state');

  if (error || !code) {
    doneUrl.searchParams.set('dropbox', 'error');
    doneUrl.searchParams.set('message', error || 'missing_code');
    return NextResponse.redirect(doneUrl);
  }
  if (!expectedState || state !== expectedState) {
    doneUrl.searchParams.set('dropbox', 'error');
    doneUrl.searchParams.set('message', 'invalid_state');
    return NextResponse.redirect(doneUrl);
  }

  try {
    await connectWithAuthCode(code, dropboxRedirectUri(origin));
    doneUrl.searchParams.set('dropbox', 'connected');
  } catch (err: any) {
    doneUrl.searchParams.set('dropbox', 'error');
    doneUrl.searchParams.set('message', err.message || 'connect_failed');
  }
  return NextResponse.redirect(doneUrl);
}
