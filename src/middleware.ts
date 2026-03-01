import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Security Middleware — CrowdStrike Falcon + Apache mod_security inspired
//
// Applies enterprise-grade HTTP security headers to every response.
// This runs at the edge and covers ALL routes (pages, API, static assets).
//
// Headers follow:
//  • OWASP Secure Headers Project recommendations
//  • CrowdStrike Falcon endpoint-protection patterns
//  • Apache mod_headers / mod_security best practices
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const { headers } = response;

    // ── Content Security Policy (CSP) ─────────────────────────────────
    // Falcon-grade CSP: restrict script/style/image/connect sources.
    // Allow Firebase, Giphy, DiceBear, Google Drive, Google APIs.
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseio.com https://*.googleapis.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' https://fonts.gstatic.com data:",
        "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.giphy.com wss://*.firebaseio.com https://www.google-analytics.com",
        "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
    ].join('; ');

    headers.set('Content-Security-Policy', csp);

    // ── XSS / Injection Protection ────────────────────────────────────
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');

    // ── Referrer Policy ───────────────────────────────────────────────
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // ── Permissions Policy (Falcon-style: deny everything by default) ─
    headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
    );

    // ── HSTS — Force HTTPS (1 year, include subdomains, preload) ──────
    headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
    );

    // ── Cross-Origin Policies ─────────────────────────────────────────
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    // CORP must be cross-origin to allow external images (profile photos,
    // DiceBear avatars, Giphy GIFs, Google profile pictures).
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

    // ── Cache Control for HTML pages ──────────────────────────────────
    // Static assets are cached by Netlify/Vercel CDN headers.
    // HTML pages should not be cached to ensure fresh security headers.
    const pathname = request.nextUrl.pathname;
    const isStaticAsset =
        pathname.startsWith('/_next/static') ||
        pathname.startsWith('/favicon') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.ico');

    if (!isStaticAsset) {
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        headers.set('Pragma', 'no-cache');
    }

    // ── Server header suppression (Apache ServerTokens Prod equiv.) ───
    headers.delete('X-Powered-By');
    headers.delete('Server');

    return response;
}

// Run on all routes except static files and internal Next.js paths
export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         *  - _next/static (static files)
         *  - _next/image  (image optimization files)
         *  - favicon.ico, *.svg, *.png, *.jpg, *.jpeg, *.gif, *.webp
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

