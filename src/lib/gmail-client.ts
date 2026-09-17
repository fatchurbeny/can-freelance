import { parseCanvaEmailText, ParsedCanvaEmail } from './canva-email-parser';

function decodeBase64Url(value?: string) {
  if (!value) return '';
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function collectBody(payload: any, preferredMime = 'text/plain'): string {
  if (!payload) return '';
  if (payload.mimeType === preferredMime && payload.body?.data) return decodeBase64Url(payload.body.data);
  if (Array.isArray(payload.parts)) {
    const preferred = payload.parts.map((part: any) => collectBody(part, preferredMime)).filter(Boolean).join('\n');
    if (preferred) return preferred;
    return payload.parts.map((part: any) => collectBody(part, 'text/html')).filter(Boolean).join('\n');
  }
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  return '';
}

function headerValue(headers: any[] | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

export async function fetchCanvaEmailsFromGmailApi(
  accessToken: string,
  accounts: Array<{ id: string; displayName: string }>
): Promise<ParsedCanvaEmail[]> {
  const searchUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  searchUrl.searchParams.set('q', 'from:(no-reply@canva.com OR notifications@canva.com) subject:("issues with your template")');
  searchUrl.searchParams.set('maxResults', '20');

  const listResponse = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const listData = await listResponse.json();
  if (!listResponse.ok) {
    const error = new Error(listData.error?.message || 'Failed to fetch Gmail messages.');
    (error as any).code = listData.error?.status || 'gmail_fetch_failed';
    throw error;
  }

  const messages = Array.isArray(listData.messages) ? listData.messages : [];
  const emails: ParsedCanvaEmail[] = [];

  for (const message of messages) {
    const detailUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`);
    detailUrl.searchParams.set('format', 'full');
    const detailResponse = await fetch(detailUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const detail = await detailResponse.json();
    if (!detailResponse.ok) continue;

    const headers = detail.payload?.headers || [];
    const rawBody = collectBody(detail.payload) || detail.snippet || '';
    emails.push(parseCanvaEmailText({
      messageId: headerValue(headers, 'Message-ID') || detail.id,
      subject: headerValue(headers, 'Subject') || 'We’ve found some issues with your template',
      sender: headerValue(headers, 'From') || 'Canva <no-reply@canva.com>',
      recipient: headerValue(headers, 'To'),
      receivedAt: headerValue(headers, 'Date') ? new Date(headerValue(headers, 'Date')) : new Date(Number(detail.internalDate || Date.now())),
      rawBody,
      accounts,
    }));
  }

  return emails;
}
