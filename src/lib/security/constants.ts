/**
 * Security Configuration constants.
 */

/* ── Cookie security defaults ─────────────────────── */

export const COOKIE_SECURITY = {
    /** SameSite attribute — prevents CSRF attacks */
    sameSite: 'strict' as const,
    /** Secure flag — cookie only sent over HTTPS */
    secure: true,
    /** HttpOnly — not accessible via JS (server-set cookies only) */
    httpOnly: false, // Client-side cookies can't use HttpOnly
    /** Path — restrict to root */
    path: '/',
} as const;

/* ── Content Security Policy sources ─────────────── */

export const CSP_SOURCES = {
    firebase: [
        'https://*.firebaseio.com',
        'https://*.googleapis.com',
        'https://*.google.com',
        'https://firestore.googleapis.com',
        'https://identitytoolkit.googleapis.com',
        'https://securetoken.googleapis.com',
        'wss://*.firebaseio.com',
    ],
    google: [
        'https://apis.google.com',
        'https://accounts.google.com',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
    ],
    media: [
        'https://*.giphy.com',
        'https://api.dicebear.com',
        'https://drive.google.com',
        'https://*.googleusercontent.com',
        'https://ui-avatars.com',
    ],
    analytics: [
        'https://www.google-analytics.com',
    ],
} as const;

/* ── Rate limiting thresholds (client-side) ───────── */

export const RATE_LIMITS = {
    /** Max messages per minute in public/anonymous chat */
    chatMessagesPerMinute: 15,
    /** Max confessions per hour */
    confessionsPerHour: 5,
    /** Max login attempts per 15 minutes */
    loginAttemptsPerWindow: 5,
    /** Window size in ms (15 minutes) */
    loginWindowMs: 15 * 60 * 1000,
} as const;
