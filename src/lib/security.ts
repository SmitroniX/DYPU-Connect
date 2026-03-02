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
    /<script\b[^>]*>?/gi,
    /<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,       // onclick=, onerror=, etc.
    /data:\s*text\/html/gi,
    /<iframe\b[^>]*>?/gi,
    /<object\b[^>]*>?/gi,
    /<embed\b[^>]*>?/gi,
    /<svg\b[^>]*>?/gi,
    /<math\b[^>]*>?/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
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

/* ── Profanity filter (partial censor) ────────────── */

/**
 * List of abusive / profane words to partially censor.
 * Words are stored lowercase. Matching is case-insensitive and
 * whole-word-boundary aware so "class" won't match "ass".
 */
const PROFANITY_LIST: string[] = [
    // English
    'fuck', 'fucking', 'fucker', 'fucked', 'fucks',
    'shit', 'shitty', 'bullshit', 'shitting',
    'ass', 'asshole', 'arsehole', 'arse',
    'bitch', 'bitches', 'bitchy',
    'damn', 'damned', 'dammit',
    'dick', 'dickhead',
    'cunt', 'cunts',
    'bastard', 'bastards',
    'whore', 'slut', 'sluts',
    'crap', 'crappy',
    'piss', 'pissed', 'pissing',
    'cock', 'cocks',
    'wanker', 'wankers',
    'twat', 'twats',
    'motherfucker', 'motherfucking', 'mofo',
    'nigger', 'nigga',
    'retard', 'retarded',
    'stfu', 'gtfo', 'lmfao',
    // Hindi / Hinglish
    'madarchod', 'madarc**d', 'mc', 'behenchod', 'bc',
    'chutiya', 'chutiye', 'chut',
    'bhosdike', 'bhosdi', 'bhosdiwale',
    'gaand', 'gandu', 'gand',
    'lauda', 'lund', 'lavde', 'lavda',
    'randi', 'raand',
    'harami', 'haramkhor',
    'saala', 'saale', 'sala', 'sale',
    'kamina', 'kamine', 'kamini',
    'tatti', 'tatte',
    'jhatu', 'jhaatu',
    'ullu', 'gadha',
    'bakchod', 'bakchodi',
    'chodu', 'chodna',
    // Marathi
    'zavadya', 'zavnya',
    'aai zhavadya',
    'bhikarchot',
    'bokachoda',
    'ghalat',
    // Common text-speak evasions
    'f*ck', 'sh*t', 'b*tch', 'a**hole', 'd*ck', 'f**k', 'a$$',
];

/**
 * Build a regex that matches any profane word at word boundaries.
 * Sorted longest-first so "motherfucker" matches before "fucker".
 */
const PROFANITY_REGEX = new RegExp(
    '\\b(' +
    [...PROFANITY_LIST]
        .sort((a, b) => b.length - a.length)
        .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|') +
    ')\\b',
    'gi',
);

/**
 * Partially censor a profane word — replaces just ONE character
 * with a single star so the word stays very readable.
 *
 *   "fuck"    → "Fu*k"
 *   "shit"    → "Sh*t"
 *   "bastard" → "Basta*d"
 *   "asshole" → "Assho*e"
 *   "ass"     → "A*s"
 *   "mc"      → "M*"
 *
 * First letter is capitalised to make the censor look intentional.
 */
function censorWord(word: string): string {
    const len = word.length;
    if (len <= 1) return '*';
    if (len === 2) return word[0].toUpperCase() + '*';
    if (len <= 4) {
        // Short words (3-4 chars): star the second-to-last char → Fu*k, Sh*t, A*s
        const starPos = len - 2;
        return word[0].toUpperCase() + word.slice(1, starPos) + '*' + word.slice(starPos + 1);
    }
    // Longer words (5+): star the second-to-last char → Basta*d, Assho*e
    const starPos = len - 2;
    return word[0].toUpperCase() + word.slice(1, starPos) + '*' + word.slice(starPos + 1);
}

/**
 * Filter profanity in text — partially censors abusive words
 * so they're still readable but visually moderated.
 *
 * "What the fuck is this bullshit" → "What the Fu*k is this Bullsh*t"
 */
export function filterProfanity(text: string): string {
    return text.replace(PROFANITY_REGEX, (match) => censorWord(match));
}

/**
 * Check if text contains profanity.
 */
export function containsProfanity(text: string): boolean {
    return PROFANITY_REGEX.test(text);
}

