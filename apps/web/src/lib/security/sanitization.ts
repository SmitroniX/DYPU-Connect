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
    return DANGEROUS_PATTERNS.some((p) => {
        p.lastIndex = 0; // Reset lastIndex for reusable global regex
        return p.test(text);
    });
}
