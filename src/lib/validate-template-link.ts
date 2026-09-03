export type TemplateLinkValidationReason =
  | 'empty'
  | 'invalid_url'
  | 'not_https'
  | 'disallowed_domain'
  | 'suspicious_redirect';

export interface TemplateLinkValidationResult {
  ok: boolean;
  normalizedUrl?: string;
  hostname?: string;
  reason?: TemplateLinkValidationReason;
  message?: string;
}

const ALLOWED_HOSTNAMES = new Set([
  'canva.com',
  'www.canva.com',
  'canva.link',
  'www.canva.link',
]);

export function normalizeTemplateLink(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, reason: 'empty' as const, message: 'Link cannot be empty.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'invalid_url' as const, message: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'not_https' as const, message: 'Only HTTPS links are allowed.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTNAMES.has(hostname)) {
    return {
      ok: false,
      reason: 'disallowed_domain' as const,
      hostname,
      message: 'Only Canva links are allowed.',
    };
  }

  return {
    ok: true,
    normalizedUrl: parsed.toString(),
    hostname,
  };
}

export function validateTemplateLink(input: string): TemplateLinkValidationResult {
  const result = normalizeTemplateLink(input);
  if (!result.ok) return result;
  return result;
}

export function isAllowedTemplateLinkHostname(hostname: string) {
  return ALLOWED_HOSTNAMES.has(hostname.toLowerCase());
}
