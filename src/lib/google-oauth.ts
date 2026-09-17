import crypto from 'crypto';

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export function getGoogleOAuthRedirectUri(origin: string) {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || `${origin}/api/google/oauth/callback`;
}

export function getGoogleOAuthConfig(origin: string) {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirectUri: getGoogleOAuthRedirectUri(origin),
  };
}

export function buildGoogleOAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  loginHint?: string;
}) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GMAIL_READONLY_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', params.state);
  if (params.loginHint) url.searchParams.set('login_hint', params.loginHint);
  return url;
}

function encryptionKey() {
  const secret = process.env.EMAIL_TOKEN_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
  return crypto.createHash('sha256').update(secret || 'can-freelance-local-dev-token-secret').digest();
}

export function encryptEmailToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encryptedToken: encrypted.toString('base64'),
    iv: `${iv.toString('base64')}:${tag.toString('base64')}`,
  };
}

export function decryptEmailToken(encryptedToken?: string | null, ivWithTag?: string | null) {
  if (!encryptedToken || !ivWithTag) return null;
  const [ivRaw, tagRaw] = ivWithTag.split(':');
  if (!ivRaw || !tagRaw) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivRaw, 'base64'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedToken, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function friendlyGoogleAuthError(code?: string | null) {
  switch (code) {
    case 'access_denied':
      return 'Google authorization was cancelled.';
    case 'invalid_grant':
      return 'Google access was revoked or expired. Please reconnect.';
    case 'redirect_uri_mismatch':
      return 'OAuth redirect URI mismatch. Check Google Cloud settings.';
    case 'missing_config':
      return 'Google OAuth client is not configured.';
    case 'invalid_state':
      return 'Google authentication session expired. Please try again.';
    default:
      return 'Could not complete Google authentication. Please try again.';
  }
}

export async function refreshGoogleAccessToken(refreshToken: string, origin: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig(origin);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error_description || friendlyGoogleAuthError(data.error));
    (error as any).code = data.error || 'invalid_grant';
    throw error;
  }
  return data.access_token as string;
}
