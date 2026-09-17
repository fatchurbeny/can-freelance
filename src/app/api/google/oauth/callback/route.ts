import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import {
  encryptEmailToken,
  friendlyGoogleAuthError,
  getGoogleOAuthConfig,
} from '@/lib/google-oauth';

async function markAuthError(code: string, message = friendlyGoogleAuthError(code)) {
  const existing = await prisma.emailConfig.findFirst();
  if (!existing) return;
  await prisma.emailConfig.update({
    where: { id: existing.id },
    data: {
      authStatus: code === 'invalid_grant' ? 'RECONNECT_REQUIRED' : 'AUTH_FAILED',
      lastAuthErrorCode: code,
      lastAuthError: message,
    },
  });
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const doneUrl = new URL('/notion-config', origin);
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const returnedState = request.nextUrl.searchParams.get('state');
  const cookieStore = await cookies();
  const expectedState = cookieStore.get('google_oauth_state')?.value;
  const hintedEmail = cookieStore.get('google_oauth_email')?.value || '';

  cookieStore.delete('google_oauth_state');
  cookieStore.delete('google_oauth_email');

  if (error) {
    await markAuthError(error);
    doneUrl.searchParams.set('google_auth', 'error');
    doneUrl.searchParams.set('error', error);
    return NextResponse.redirect(doneUrl);
  }

  if (!code || !expectedState || returnedState !== expectedState) {
    await markAuthError('invalid_state');
    doneUrl.searchParams.set('google_auth', 'error');
    doneUrl.searchParams.set('error', 'invalid_state');
    return NextResponse.redirect(doneUrl);
  }

  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(origin);
  if (!clientId || !clientSecret) {
    await markAuthError('missing_config');
    doneUrl.searchParams.set('google_auth', 'error');
    doneUrl.searchParams.set('error', 'missing_config');
    return NextResponse.redirect(doneUrl);
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      const code = tokenData.error || 'auth_failed';
      await markAuthError(code, tokenData.error_description || friendlyGoogleAuthError(code));
      doneUrl.searchParams.set('google_auth', 'error');
      doneUrl.searchParams.set('error', code);
      return NextResponse.redirect(doneUrl);
    }

    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = profileResponse.ok ? await profileResponse.json() : null;
    const email = profile?.emailAddress || hintedEmail;
    const existing = await prisma.emailConfig.findFirst();
    const encrypted = tokenData.refresh_token ? encryptEmailToken(tokenData.refresh_token) : null;

    const data = {
      provider: 'GMAIL_OAUTH',
      email: email || hintedEmail || 'email@google.com',
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      autoSync: true,
      authStatus: 'ACTIVE',
      lastAuthErrorCode: null,
      lastAuthError: null,
      ...(encrypted ? { encryptedOAuthToken: encrypted.encryptedToken, iv: encrypted.iv } : {}),
    };

    if (existing) {
      await prisma.emailConfig.update({ where: { id: existing.id }, data });
    } else {
      await prisma.emailConfig.create({ data });
    }

    revalidatePath('/notion-config');
    revalidatePath('/production');
    doneUrl.searchParams.set('google_auth', 'success');
    return NextResponse.redirect(doneUrl);
  } catch (err: any) {
    await markAuthError('auth_failed', err.message || friendlyGoogleAuthError('auth_failed'));
    doneUrl.searchParams.set('google_auth', 'error');
    doneUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(doneUrl);
  }
}
