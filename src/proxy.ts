import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  // --- START: DEBUG LOGGING ---
  console.log('--- Auth Middleware Debug ---');
  console.log('Expected User:', expectedUser ? 'CONFIGURED' : 'UNDEFINED');
  console.log('Expected Password:', expectedPassword ? 'CONFIGURED' : 'UNDEFINED');
  // --- END: DEBUG LOGGING ---

  if (!expectedUser || !expectedPassword) {
    console.error('CRITICAL: BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must be configured.');
    return authRequiredResponse();
  }

  if (basicAuth) {
    try {
      const parts = basicAuth.split(' ');
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'basic') {
        // Malformed Authorization header
        return authRequiredResponse();
      }

      const authValue = parts[1];
      if (!authValue) {
        // Empty base64 value
        return authRequiredResponse();
      }

      const decoded = atob(authValue);
      const separator = decoded.indexOf(':');
      const user = separator === -1 ? decoded : decoded.slice(0, separator);
      const pwd = separator === -1 ? '' : decoded.slice(separator + 1);

      if (user === expectedUser && pwd === expectedPassword) {
        console.log('Auth success');
        return NextResponse.next();
      } else {
        console.log('Auth failed: user/pass mismatch');
      }
    } catch (error) {
      // Handle atob errors (invalid base64) or other parsing errors
      console.error('Authentication error:', error);
      return authRequiredResponse();
    }
  }

  return authRequiredResponse();
}

function authRequiredResponse() {
  return new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
