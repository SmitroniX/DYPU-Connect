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
