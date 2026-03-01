// ---------------------------------------------------------------------------
// Security Configuration — CrowdStrike Falcon-inspired policies
//
// Centralised security constants and helper functions for the application.
// Mirrors enterprise endpoint-protection patterns used by Falcon and
// Apache mod_security.
// ---------------------------------------------------------------------------

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

/* ── Input sanitisation ───────────────────────────── */

const DANGEROUS_PATTERNS = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,       // onclick=, onerror=, etc.
    /data:\s*text\/html/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
];

/**
 * Sanitise user input by stripping dangerous patterns.
 * Does NOT escape HTML — use React's built-in JSX escaping for rendering.
 * This catches injection attempts at write-time (e.g., before Firestore).
 */
export function sanitiseInput(text: string): string {
    let clean = text;
    for (const pattern of DANGEROUS_PATTERNS) {
        clean = clean.replace(pattern, '');
    }
    return clean.trim();
}

/**
 * Check if input contains suspicious patterns.
 * Returns true if the input looks potentially malicious.
 */
export function hasDangerousContent(text: string): boolean {
    return DANGEROUS_PATTERNS.some((p) => p.test(text));
}

/* ── Session fingerprint helper ───────────────────── */

/**
 * Generate a lightweight browser fingerprint for session binding.
 * NOT a tracking mechanism — used only to detect session hijacking.
 */
export function generateSessionFingerprint(): string {
    if (typeof window === 'undefined') return '';

    const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth.toString(),
        `${screen.width}x${screen.height}`,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    ];

    // Simple hash (FNV-1a 32-bit)
    let hash = 0x811c9dc5;
    const str = components.join('|');
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(16);
}

