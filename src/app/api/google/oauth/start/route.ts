import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleOAuthUrl, getGoogleOAuthConfig } from '@/lib/google-oauth';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const returnUrl = new URL('/notion-config', origin);
  const email = request.nextUrl.searchParams.get('email')?.trim() || '';
  const { clientId, redirectUri } = getGoogleOAuthConfig(origin);

  if (!clientId) {
    returnUrl.searchParams.set('google_auth', 'error');
    returnUrl.searchParams.set('error', 'missing_config');
    return NextResponse.redirect(returnUrl);
  }

  const state = crypto.randomBytes(24).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/',
  });
  if (email) {
    cookieStore.set('google_oauth_email', email, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60,
      path: '/',
    });
  }

  return NextResponse.redirect(buildGoogleOAuthUrl({
    clientId,
    redirectUri,
    state,
    loginHint: email,
  }));
}
