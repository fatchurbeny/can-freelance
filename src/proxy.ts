import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionCookie } from '@/lib/session-cookie';

/**
 * AUTH_MODE=session: login ID+PIN (docs/knowledge/user-role-spec.md). Proxy hanya memeriksa
 * tanda tangan cookie; keabsahan sesi di DB diperiksa getCurrentUser() di server.
 * Selain itu tetap Basic Auth lama.
 */
async function sessionGate(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname.startsWith('/login/')) return NextResponse.next();

  const token = await verifySessionCookie(req.cookies.get(SESSION_COOKIE)?.value);
  if (token) return NextResponse.next();

  const isRsc =
    req.headers.get('rsc') === '1' ||
    req.headers.has('next-router-state-tree') ||
    req.headers.has('next-action') ||
    req.headers.has('x-nextjs-data');
  if (isRsc) return new NextResponse('Auth required', { status: 401 });

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  if (process.env.AUTH_MODE === 'session') return sessionGate(req);

  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  // If Basic Auth is not configured in Vercel env vars, bypass middleware
  if (!expectedUser || !expectedPassword) {
    return NextResponse.next();
  }

  // Detect RSC, Server Action, and Next.js Data prefetch requests
  const isRsc =
    req.headers.get('rsc') === '1' ||
    req.headers.has('next-router-state-tree') ||
    req.headers.has('next-action') ||
    req.headers.has('x-nextjs-data');

  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    try {
      const parts = basicAuth.split(' ');
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'basic') {
        return authRequiredResponse(isRsc);
      }

      const authValue = parts[1];
      if (!authValue) {
        return authRequiredResponse(isRsc);
      }

      const decoded = atob(authValue);
      const separator = decoded.indexOf(':');
      const user = separator === -1 ? decoded : decoded.slice(0, separator);
      const pwd = separator === -1 ? '' : decoded.slice(separator + 1);

      if (user === expectedUser && pwd === expectedPassword) {
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return authRequiredResponse(isRsc);
    }
  }

  return authRequiredResponse(isRsc);
}

function authRequiredResponse(isRsc = false) {
  const headers: Record<string, string> = {};
  if (!isRsc) {
    headers['WWW-Authenticate'] = 'Basic realm="Secure Area"';
  }
  return new NextResponse('Auth required', {
    status: 401,
    headers,
  });
}

export const config = {
  matcher: ['/', '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icon-192.png|icon-512.png).*)'],
};

